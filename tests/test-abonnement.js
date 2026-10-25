// Version payante : connexion Google, essai de 3 jours, formules 1 à 3, paiement PayDunya.
// Le serveur Supabase est simulé : on contrôle ce que renvoie mon_acces et ce que reçoit payer-abonnement.
const {JSDOM} = require("jsdom");
const base = require("./charger")();
const J = 86400000, iso = t => new Date(t).toISOString();
const errs = [];
const egal = (o, a, q) => { if (o !== a) errs.push(`${q} : attendu ${JSON.stringify(a)}, obtenu ${JSON.stringify(o)}`); };
const wait = ms => new Promise(r => setTimeout(r, ms));

async function ouvrir({connecte, acces, maintenantServeur}){
  const appels = [];
  const dom = new JSDOM(base, {runScripts: "dangerously", pretendToBeVisual: true, url: "https://bibliocard.pages.dev/", beforeParse(w){
    w.BIBLIOCARD_CONFIG = {supabaseUrl: "https://projet.supabase.co", supabaseKey: "sb_publishable_essai", payant: true};
    if (connecte) w.localStorage.setItem("bibliocard.session", JSON.stringify({access_token: "jeton-utilisateur", refresh_token: "r", expires_at: Date.now() + J, uid: "u1", email: "etudiant@univ.ci"}));
    w.fetch = async (url, opt = {}) => {
      appels.push({url: String(url), opt});
      const rep = corps => ({ok: true, status: 200, json: async () => corps});
      if (/\/rest\/v1\/rpc\/mon_acces$/.test(url)) return rep(acces ? {...acces, maintenant: iso(maintenantServeur || Date.now())} : null);
      if (/\/functions\/v1\/payer-abonnement$/.test(url)) return rep({ok: true, url: "https://app.paydunya.com/checkout/invoice/test-123"});
      throw new TypeError("hors ligne");
    };
  }});
  const w = dom.window;
  w.HTMLDialogElement.prototype.showModal = function(){ this.open = true; }; w.HTMLDialogElement.prototype.close = function(){ this.open = false; };
  w.addEventListener("error", e => errs.push(e.message));
  await wait(300);
  const en = w.document.querySelector("#acctLine").textContent.trim();
  w.document.querySelector('#uiLangSeg [data-l="fr"]').click(); await wait(30); // jsdom est réglé en anglais
  return {en, w, d: w.document, appels, compte: w.eval("compte"), exiger: w.exiger};
}
const dlgTexte = d => d.querySelector("#dlg").textContent.replace(/\s+/g, " ");

(async () => {
  // 1. Pas connecté : l’accueil propose l’essai, un document est refusé avec la connexion Google, l’exemple reste libre
  let s = await ouvrir({connecte: false});
  egal(s.d.querySelector("#acctLine").hidden, false, "invitation à l’essai visible");
  egal(s.en, "Start the 3-day free trial", "invitation traduite en anglais");
  egal(/Commencer l’essai gratuit de 3 jours/.test(s.d.querySelector("#acctLine").textContent), true, "bouton d’essai");
  await s.w.handleFiles([new s.w.File(["texte"], "memoire.docx")]);
  egal(s.d.querySelector("#dlg").open, true, "document refusé : fenêtre de compte ouverte");
  egal(/Connecte-toi pour commencer ton essai gratuit de 3 jours/.test(dlgTexte(s.d)), true, "message de connexion");
  egal(!!s.d.querySelector("#gLogin"), true, "bouton Google");
  egal(s.d.querySelectorAll(".plan").length, 3, "trois formules affichées");
  egal(/3 000 F par mois/.test(dlgTexte(s.d)) && /7 000 F par mois/.test(dlgTexte(s.d)), true, "prix affichés");
  let vers = ""; s.compte.connecter = () => { vers = "google"; }; s.d.querySelector("#gLogin").click();
  egal(vers, "google", "clic sur Continuer avec Google");
  s.d.querySelector("#dlg").open = false;
  s.d.querySelector("#demoBtn").click(); await wait(400);
  egal(s.w.eval("state").sources.length > 0, true, "le mémoire d’exemple reste libre, sans compte");

  // 2. Connecté, essai en cours : toutes les fonctions (formule 3)
  s = await ouvrir({connecte: true, acces: {formule: 3, essai: true, essai_fin: iso(Date.now() + 2 * J + 5 * 3600000), fin: null, formule_payee: 0}});
  egal(s.compte.formule(), 3, "essai = formule 3");
  egal(s.exiger("biblio") && s.exiger("dictee") && s.exiger("plagiat"), true, "essai : tout est ouvert");
  egal(/Essai gratuit : il te reste 2 jours et 5 h/.test(s.d.querySelector("#acctLine").textContent), true, "jours d’essai restants");
  egal(s.appels.some(a => /rpc\/mon_acces/.test(a.url) && /Bearer jeton-utilisateur/.test(a.opt.headers.Authorization)), true, "droits lus sur le serveur avec le jeton de l’utilisateur");

  // 3. Formule 1 payée : bibliographie oui, dictée non (avec la bonne explication)
  s = await ouvrir({connecte: true, acces: {formule: 1, essai: false, essai_fin: iso(Date.now() - 10 * J), fin: iso(Date.now() + 20 * J), formule_payee: 1}});
  egal(s.exiger("biblio"), true, "formule 1 : bibliographie");
  egal(s.exiger("dictee"), false, "formule 1 : pas de dictée");
  egal(/Cette fonction fait partie de la formule 2/.test(dlgTexte(s.d)), true, "explication de la formule requise");
  egal(/Formule 1 active jusqu’au/.test(dlgTexte(s.d)), true, "état de l’abonnement");
  egal(/ta formule/.test(s.d.querySelectorAll(".plan")[0].textContent), true, "formule actuelle repérée");

  // 4. Paiement : le navigateur envoie la formule, jamais un montant
  s.d.querySelector('[data-pay="2"]').click(); await wait(50);
  const p = s.appels.find(a => /payer-abonnement/.test(a.url));
  egal(p && p.opt.body, JSON.stringify({formule: 2}), "demande de paiement : formule seule");
  egal(p && /Bearer jeton-utilisateur/.test(p.opt.headers.Authorization), true, "demande de paiement authentifiée");

  // 5. Essai terminé : tout est refusé, avec la proposition des formules
  s = await ouvrir({connecte: true, acces: {formule: 0, essai: false, essai_fin: iso(Date.now() - J), fin: null, formule_payee: 0}});
  egal(s.exiger("biblio"), false, "essai fini : bibliographie refusée");
  egal(/Ton essai gratuit est terminé : choisis une formule pour continuer/.test(dlgTexte(s.d)), true, "message de fin d’essai");
  egal(s.d.querySelectorAll("[data-pay]").length, 3, "trois boutons de paiement");

  // 6. Horloge de l’appareil retardée de 5 jours : c’est l’heure du serveur qui compte
  s = await ouvrir({connecte: true, acces: {formule: 3, essai: true, essai_fin: iso(Date.now() + J), fin: null, formule_payee: 0}, maintenantServeur: Date.now() + 5 * J});
  egal(s.compte.formule(), 0, "horloge de l’appareil trafiquée : sans effet");

  console.log(errs.length ? "erreurs : " + errs.join(" | ") : "erreurs : aucune");
  process.exit(0);
})();
