// BiblioCard : reçoit la notification de PayDunya après un paiement (IPN) et active l’abonnement.
// À déployer SANS vérification de jeton Supabase (« Enforce JWT verification » désactivé) :
// c’est PayDunya qui appelle, pas un utilisateur. La sécurité vient de trois contrôles :
//   1. l’empreinte SHA-512 de notre clé principale, que seul PayDunya connaît avec nous ;
//   2. la confirmation de la facture redemandée directement à PayDunya (on ne croit pas l’envoi sur parole) ;
//   3. le montant réellement payé, comparé à celui fixé par le serveur à la création.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

async function sha512Hex(texte: string): Promise<string> {
  const e = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(texte));
  return Array.from(new Uint8Array(e)).map((o) => o.toString(16).padStart(2, '0')).join('');
}
// comparaison sans fuite de temps
function egal(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
// PayDunya poste « data[invoice][token]=… » : on reconstruit l’objet
function objet(fd: FormData): Record<string, any> {
  const racine: Record<string, any> = {};
  for (const [cle, valeur] of fd.entries()) {
    const chemin = cle.replace(/\]/g, '').split('[');
    let n = racine;
    for (let i = 0; i < chemin.length - 1; i++) { if (typeof n[chemin[i]] !== 'object' || n[chemin[i]] === null) n[chemin[i]] = {}; n = n[chemin[i]]; }
    n[chemin[chemin.length - 1]] = valeur;
  }
  return racine;
}

Deno.serve(async (req) => {
  // On répond toujours 200 : PayDunya ne renvoie pas indéfiniment, et une notification rejetée n’a aucun effet.
  const fin = (corps: unknown) => new Response(JSON.stringify(corps), { headers: { 'Content-Type': 'application/json' } });
  try {
    const master = Deno.env.get('PAYDUNYA_MASTER_KEY'), prive = Deno.env.get('PAYDUNYA_PRIVATE_KEY'), jeton = Deno.env.get('PAYDUNYA_TOKEN');
    if (!master || !prive || !jeton) throw new Error('Paiement non configuré');
    const test = Deno.env.get('PAYDUNYA_MODE') === 'test';

    const d = objet(await req.formData()).data;
    const token = d?.invoice?.token, hash = d?.hash;
    if (!token || !hash) throw new Error('Notification incomplète');
    if (!egal(await sha512Hex(master), String(hash))) throw new Error('Empreinte invalide : notification rejetée');

    const api = test ? 'https://app.paydunya.com/sandbox-api/v1' : 'https://app.paydunya.com/api/v1';
    const rep = await fetch(`${api}/checkout-invoice/confirm/${encodeURIComponent(token)}`, {
      headers: { 'Content-Type': 'application/json', 'PAYDUNYA-MASTER-KEY': master, 'PAYDUNYA-PRIVATE-KEY': prive, 'PAYDUNYA-TOKEN': jeton },
    });
    const c = await rep.json();
    if (c.response_code !== '00') throw new Error('Facture inconnue chez PayDunya');
    if (!test && c.mode && c.mode !== 'live') throw new Error('Paiement de test ignoré');

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    if (c.status === 'completed') {
      const { data, error } = await admin.rpc('appliquer_paiement', { p_token: token, p_montant: Math.round(Number(c.invoice?.total_amount)) });
      if (error) throw new Error(error.message);
      return fin({ ok: data === 'ok', resultat: data });
    }
    if (c.status === 'cancelled' || c.status === 'failed') {
      await admin.from('paiements').update({ statut: c.status === 'failed' ? 'echoue' : 'annule', updated_at: new Date().toISOString() })
        .eq('token', token).eq('statut', 'en_attente');
    }
    return fin({ ok: true, statut: c.status });
  } catch (e) {
    return fin({ ok: false, error: (e as Error).message });
  }
});
