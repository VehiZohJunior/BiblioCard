// Interface du module MA RÉDACTION (section 5), sur le vrai écran Rédaction : formulaire avec gabarit et aperçu,
// accueil du jour, comptage dans la Rédaction, saisie manuelle, élan, onglets, plan, session et bilan, soutien.
// Le module ne doit JAMAIS écrire dans le texte de l’utilisateur.
const {JSDOM} = require("jsdom");
const base = require("./charger")();
const TEXTES = require("../textes/messages_fr.json");
const errs = [];
const egal = (o, a, q) => { if (JSON.stringify(o) !== JSON.stringify(a)) errs.push(`${q} :\n    attendu ${JSON.stringify(a)}\n    obtenu  ${JSON.stringify(o)}`); };
const vrai = (v, q) => egal(!!v, true, q);
const wait = ms => new Promise(r => setTimeout(r, ms));
const espaces = t => String(t).replace(/[  ]/g, " ");

(async () => {
  const dom = new JSDOM(base, {runScripts: "dangerously", pretendToBeVisual: true, url: "https://bibliocard.pages.dev/", beforeParse(w){
    w.TEXTES_MA_REDACTION = TEXTES;
    w.fetch = async () => ({ok: true, status: 200, json: async () => ({results: [], docs: [], message: {items: []}, response: {docs: []}})});
  }});
  const w = dom.window, d = w.document; w.scrollTo = () => {};
  w.HTMLDialogElement.prototype.showModal = function(){ this.open = true; }; w.HTMLDialogElement.prototype.close = function(){ this.open = false; };
  w.addEventListener("error", e => errs.push("erreur JS : " + e.message));
  await wait(400); d.querySelector('#uiLangSeg [data-l="fr"]').click(); await wait(20);
  w.eval(`setView("redac")`);
  const box = d.querySelector("#maRedac"), clic = sel => { const b = box.querySelector(sel); if(!b) errs.push(`introuvable : ${sel}`); else b.click(); };

  // 1. sans objectif : invitation
  vrai(/Définir mon objectif/.test(box.textContent), "sans objectif : invitation à en définir un");
  clic('[data-mr="definir"]');
  const f = box.querySelector('form[data-mr-form="objectif"]');
  vrai(f, "formulaire d’objectif affiché");
  // gabarit : la thèse charge sa structure et son volume
  const type = f.querySelector("[name=type_document]"); type.value = "these"; type.onchange();
  egal(f.querySelector("[name=pages_cibles]").value, "300", "gabarit thèse : 300 pages par défaut");
  egal([...f.querySelectorAll("[name=sous_titre]")].map(x => x.value)[0], "Introduction générale", "gabarit thèse : structure chargée");
  // cas limite : ni date de fin ni durée → refus, message clair
  f.querySelector("[name=duree_mois]").value = ""; f.querySelector("[name=date_fin]").value = ""; f.oninput();
  f.onsubmit(new w.Event("submit"));
  vrai(!w.eval("state.maRedac && state.maRedac.objectif"), "sans date de fin ni durée : pas d’enregistrement");
  vrai(/date de fin ou une durée/.test(box.querySelector(".mr-erreurs").textContent), "message : date de fin ou durée");
  // objectif de référence, tous les jours de la semaine (pour un test indépendant du jour où il tourne)
  f.querySelector("[name=pages_cibles]").value = "100"; f.querySelector("[name=mots_par_page]").value = "250"; f.querySelector("[name=duree_mois]").value = "6";
  for(let b = 0; b < 7; b++) f.querySelector(`[name=j${b}]`).checked = true;
  f.querySelectorAll("[name=sous_pages]").forEach((x, i) => x.value = i === 0 ? "40" : "");
  f.oninput();
  vrai(/^100 pages = 25 000 mots = \d+ mots par jour/.test(espaces(box.querySelector(".mr-apercu").textContent)), "aperçu immédiat : « 100 pages = 25 000 mots = … mots par jour »");
  vrai(/Les sous-objectifs totalisent 40 pages pour un objectif de 100 pages/.test(box.querySelector(".mr-erreurs").textContent), "sous-objectifs : écart affiché, non bloquant");
  f.onsubmit(new w.Event("submit"));
  egal(w.eval("state.maRedac.objectif.pages_cibles"), 100, "objectif enregistré dans le projet");

  // 2. accueil du jour
  vrai(box.querySelector(".mr-n") && +box.querySelector(".mr-n").textContent.replace(/\D/g, "") > 0, "accueil du jour : cible du jour affichée");
  vrai(/Première action/.test(box.textContent) && /Le compteur mesure ce que tu as écrit, pas sa qualité/.test(box.textContent), "première action et rappel : quantité, pas qualité");
  const cible3 = +box.querySelector(".mr-n").textContent.replace(/\D/g, "");

  // 3. comptage automatique dans la Rédaction
  const draft = d.querySelector("#draft");
  const texte = "Le langage est un instrument de pouvoir symbolique dans la presse ivoirienne contemporaine.";
  draft.value = texte; draft.dispatchEvent(new w.Event("input")); await wait(1400);
  egal(w.eval(`state.maRedac.journal.filter(x => x.source === "redaction").map(x => x.mots_ecrits)`), [13], "mots écrits dans la Rédaction comptés automatiquement");
  vrai(/13 écrits aujourd’hui|13 écrits aujourd'hui/.test(espaces(box.textContent)), "mots du jour affichés");

  // 4. saisie manuelle, marquée « manuel »
  const fm = box.querySelector('form[data-mr-form="mots"]'); fm.querySelector("[name=mots]").value = "987"; fm.onsubmit(new w.Event("submit"));
  egal(w.eval(`state.maRedac.journal.filter(x => x.source === "manuel").map(x => x.mots_ecrits)`), [987], "saisie manuelle marquée « manuel »");
  { const t = espaces(d.querySelector("#toast") ? d.querySelector("#toast").textContent : "");
    vrai(TEXTES.felicitations.mille.some(m => t.includes(m.replace("{valeur}", "1 000"))), "jalon de 1 000 mots signalé (l’une des formulations validées) : " + t); }

  // 5. élan : 5 augmente la cible du jour, 1 la réduit sans la supprimer
  clic('[data-mr-elan="5"]');
  const cible5 = +box.querySelector(".mr-n").textContent.replace(/\D/g, "");
  vrai(cible5 > cible3, `élan 5 : cible du jour plus haute (${cible3} → ${cible5})`);
  vrai(/Énergie haute/.test(box.textContent), "élan 5 : tâche exigeante conseillée");
  clic('[data-mr-elan="1"]');
  const cible1 = +box.querySelector(".mr-n").textContent.replace(/\D/g, "");
  vrai(cible1 > 0 && cible1 < cible3, "élan 1 : cible réduite, jamais supprimée");
  egal(w.eval("state.maRedac.journal.filter(x => x.source === 'elan').length"), 1, "un seul élan par jour (modifiable)");

  // 6. question d’inspiration : une question, jamais du texte
  vrai(TEXTES.prompts_inspiration.some(p => box.textContent.includes(p)), "une question d’inspiration est proposée");
  clic('[data-mr="question"]');

  // 7. onglets
  for(const o of ["ensemble", "calendrier", "plans", "blocage"]){ clic(`[data-mr-onglet="${o}"]`); vrai(box.querySelector(`[data-mr-onglet="${o}"][aria-selected="true"]`), `onglet ${o} affiché`); }
  clic('[data-mr-onglet="ensemble"]'); vrai(/pages écrites/.test(box.textContent) && /Fin prévue/.test(box.textContent), "vue d’ensemble : pages écrites, fin prévue");
  clic('[data-mr-onglet="calendrier"]'); vrai(box.querySelectorAll(".mr-cal .mr-c.partiel, .mr-cal .mr-c.atteint").length === 1, "calendrier : le jour d’écriture est coloré");
  clic('[data-mr-onglet="plans"]');
  egal(box.querySelectorAll(".mr-plan").length, 6, "bibliothèque : les 6 plans");
  vrai([...box.querySelectorAll(".mr-plan")].every(p => /Effort/.test(p.textContent)), "chaque plan affiche son effort");
  clic('[data-mr-plan="pomodoro"]');
  vrai(/Plan en cours/.test(box.textContent) && /Pomodoro/.test(box.textContent), "plan choisi : affiché dans l’accueil du jour");
  clic('[data-mr-onglet="blocage"]'); vrai(/Signaux de blocage/.test(box.textContent), "tableau de bord du blocage");

  // 8. session et bilan
  clic('[data-mr-onglet="jour"]'); clic('[data-mr="commencer"]'); vrai(box.querySelector("#mrSession"), "session commencée : minuteur affiché"); clic('[data-mr="terminer"]');
  const fb = box.querySelector('form[data-mr-form="bilan"]'); vrai(fb, "session terminée : bilan proposé");
  fb.querySelector("[name=note]").value = "Commencer par la méthode"; fb.onsubmit(new w.Event("submit"));
  egal(w.eval("state.maRedac.bilans.length"), 1, "bilan de session enregistré");
  egal(w.eval("state.maRedac.sessions.find(s => s.date === MaRedactionUI.aujourdhui()).demarree"), true, "la session prévue du jour est marquée démarrée");

  // 9. difficulté signalée : relances suspendues, soutien affiché, reprise possible
  clic('[data-mr="difficulte"]');
  vrai(/Les relances sont suspendues/.test(box.textContent) && !box.querySelector(".mr-n"), "difficulté : relances et cible suspendues, message de soutien");
  clic('[data-mr="reprendre"]'); vrai(box.querySelector(".mr-n"), "reprise des relances");

  // 10. le module n’écrit jamais dans le texte ; il est enregistré avec le projet
  egal(draft.value, texte, "le texte de la Rédaction n’a jamais été modifié par le module");
  w.eval("saveNow()");
  const p = JSON.parse(w.localStorage.getItem("bibliocard.v3")).projects[w.eval("state.current")];
  vrai(p.maRedac && p.maRedac.objectif && p.maRedac.journal.length >= 3, "objectif et journal enregistrés avec le projet");

  errs.forEach(e => console.log("ÉCHEC " + e));
  console.log(errs.length ? `erreurs : ${errs.length}` : "erreurs : aucune");
  process.exit(errs.length ? 1 : 0);
})();
