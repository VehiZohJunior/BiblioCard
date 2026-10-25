// BiblioCard : crée la facture PayDunya d’un abonnement mensuel et renvoie le lien de paiement.
// Appelée par le navigateur de l’utilisateur connecté (jeton Supabase obligatoire).
// Secrets à définir dans Supabase (Edge Functions → Secrets) :
//   PAYDUNYA_MASTER_KEY, PAYDUNYA_PRIVATE_KEY, PAYDUNYA_TOKEN  — clés de l’application PayDunya « BiblioCard »
//   PAYDUNYA_MODE = live (par défaut) ou test (clés de test, bac à sable PayDunya)
//   SITE_URL      = adresse du site, par exemple https://bibliocard.pages.dev/
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
// Les prix sont fixés ici, côté serveur : le navigateur choisit une formule, jamais un montant.
const FORMULES: Record<number, { nom: string; prix: number }> = {
  1: { nom: 'Formule 1 — Bibliographie', prix: 3000 },
  2: { nom: 'Formule 2 — Bibliographie et dictée', prix: 5000 },
  3: { nom: 'Formule 3 — Toutes les fonctions', prix: 7000 },
};
const repondre = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const auth = req.headers.get('Authorization');
    if (!auth) throw new Error('Connecte-toi pour choisir une formule');
    const url = Deno.env.get('SUPABASE_URL')!;
    const appelant = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await appelant.auth.getUser();
    if (!user) throw new Error('Session expirée : reconnecte-toi');

    const { formule } = await req.json();
    const f = FORMULES[Number(formule)];
    if (!f) throw new Error('Formule inconnue');

    const master = Deno.env.get('PAYDUNYA_MASTER_KEY'), prive = Deno.env.get('PAYDUNYA_PRIVATE_KEY'), jeton = Deno.env.get('PAYDUNYA_TOKEN');
    if (!master || !prive || !jeton) throw new Error('Le paiement n’est pas encore ouvert');
    const test = Deno.env.get('PAYDUNYA_MODE') === 'test';
    // en service réel, des clés de test feraient croire à des paiements qui n’existent pas
    if (!test && prive.startsWith('test_')) throw new Error('Configuration de paiement incorrecte (clés de test)');
    const api = test ? 'https://app.paydunya.com/sandbox-api/v1' : 'https://app.paydunya.com/api/v1';
    const site = (Deno.env.get('SITE_URL') || 'https://vehizohjunior.github.io/BiblioCard/').replace(/\/?$/, '/');

    const rep = await fetch(`${api}/checkout-invoice/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'PAYDUNYA-MASTER-KEY': master, 'PAYDUNYA-PRIVATE-KEY': prive, 'PAYDUNYA-TOKEN': jeton },
      body: JSON.stringify({
        invoice: { total_amount: f.prix, description: `BiblioCard — ${f.nom} — 30 jours`, customer: { email: user.email || '' } },
        store: { name: 'BiblioCard' },
        custom_data: { user_id: user.id, formule: Number(formule) },
        actions: {
          callback_url: `${url}/functions/v1/paydunya-notification`,
          return_url: `${site}?paiement=retour`,
          cancel_url: `${site}?paiement=annule`,
        },
      }),
    });
    const r = await rep.json();
    if (r.response_code !== '00' || !r.token) throw new Error(r.response_text || 'PayDunya n’a pas créé la facture');

    // sans cette ligne, le paiement ne pourrait pas être rattaché au compte : pas de lien
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { error } = await admin.from('paiements').insert({ user_id: user.id, formule: Number(formule), montant: f.prix, token: r.token });
    if (error) throw new Error('Paiement non préparé, réessaie dans un instant');

    return repondre({ ok: true, url: r.response_text });
  } catch (e) {
    return repondre({ ok: false, error: (e as Error).message }, 400);
  }
});
