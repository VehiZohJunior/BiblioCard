// Session d’écriture agréable (2026-11-21) : lancement, félicitations avec carillon, minuteur, mode concentration,
// sons coupables, « Je bloque », questions par section, rendez-vous avec bip et notification (une fois par jour),
// agenda du téléphone, export Excel du journal. Le module n’écrit jamais dans le texte de l’utilisateur.
const {JSDOM} = require("jsdom");
const JSZip = require("jszip");
const base = require("./charger")();
const TEXTES = require("../textes/messages_fr.json");
const errs = [];
const egal = (o, a, q) => { if (JSON.stringify(o) !== JSON.stringify(a)) errs.push(`${q} :\n    attendu ${JSON.stringify(a)}\n    obtenu  ${JSON.stringify(o)}`); };
const vrai = (v, q) => egal(!!v, true, q);
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let notes = 0, notifications = [], telechargements = [];
  const dom = new JSDOM(base, {runScripts: "dangerously", pretendToBeVisual: true, url: "https://bibliocard.pages.dev/", beforeParse(w){
    w.TEXTES_MA_REDACTION = TEXTES;
    w.fetch = async () => ({ok: true, status: 200, json: async () => ({results: [], docs: [], message: {items: []}, response: {docs: []}})});
    // son simulé : on compte les notes jouées
    w.AudioContext = class { constructor(){ this.currentTime = 0; this.state = "running"; this.destination = {}; } resume(){}
      createOscillator(){ notes++; return {type: "", frequency: {value: 0}, connect(){}, start(){}, stop(){}}; }
      createGain(){ return {gain: {setValueAtTime(){}, exponentialRampToValueAtTime(){}}, connect(){}}; } };
    w.Notification = class { constructor(t, o){ notifications.push(t + " | " + o.body); } static requestPermission(){ return Promise.resolve("granted"); } };
    w.Notification.permission = "granted";
  }});
  const w = dom.window, d = w.document; w.scrollTo = () => {};
  w.HTMLDialogElement.prototype.showModal = function(){ this.open = true; }; w.HTMLDialogElement.prototype.close = function(){ this.open = false; };
  w.addEventListener("error", e => errs.push("erreur JS : " + e.message));
  await wait(400); d.querySelector('#uiLangSeg [data-l="fr"]').click(); await wait(20);
  w.JSZip = JSZip; w.download = (nom, contenu, type) => telechargements.push({nom, contenu, type});
  w.eval(`setView("redac")`);
  const box = d.querySelector("#maRedac"), clic = sel => { const b = box.querySelector(sel); if(!b) errs.push(`introuvable : ${sel}`); else b.click(); };
  const toast = () => d.querySelector("#toast") ? d.querySelector("#toast").textContent : "";
  // objectif : 30 pages en 2 mois, tous les jours (test indépendant du jour où il tourne)
  w.eval(`state.maRedac = {objectif: {titre: "Article", type_document: "article", pages_cibles: 30, mots_par_page: 250, date_debut: MaRedactionUI.aujourdhui(), date_fin: MaRedaction.versIso(MaRedaction.versJour(MaRedactionUI.aujourdhui()) + 60), jours_travail: 127, jours_exclus: [], statut: "actif"}, sous: [], journal: [], compteur: null, plans: [], sessions: [], interventions: [], refus: [], bilans: [], contexte: {}, soutien: false, session: null, reduction: {}}; renderMaRedac();`);

  // 1. lancer une session de 15 minutes, en mode concentration
  vrai(box.querySelector(".mr-lanceur"), "lanceur de session affiché");
  clic('[data-mr-duree="session_minimale"]');
  box.querySelector("#mrConcentre").checked = true; box.querySelector("#mrConcentre").onchange();
  box.querySelector("#mrObjSession").value = "60";
  const n0 = notes; clic('[data-mr="commencer"]');
  vrai(box.querySelector("#mrSession"), "session en cours : panneau affiché");
  vrai(d.body.classList.contains("mr-focus"), "mode concentration activé");
  vrai(notes > n0 && TEXTES.felicitations.debut_session.some(m => toast().includes(m)), "début de session : félicitation et carillon");
  egal(w.eval("state.maRedac.session.duree"), 15, "session de 15 minutes");
  vrai(/15:00|14:5\d/.test(box.querySelector("#mrTemps").textContent), "minuteur : temps restant");

  // 2. chaque petit pas félicité : premiers mots, puis 100 mots
  const draft = d.querySelector("#draft");
  draft.value = "Le langage est un instrument de pouvoir."; draft.dispatchEvent(new w.Event("input")); await wait(1100);
  vrai(TEXTES.felicitations.premiers_mots.some(m => toast().includes(m)), "premiers mots : félicités");
  egal(box.querySelector("#mrMotsSession").textContent, "7", "compteur de la session mis à jour");
  draft.value += " " + Array.from({length: 100}, (_, i) => "mot" + i).join(" "); draft.dispatchEvent(new w.Event("input")); await wait(1100);
  vrai(/100 mots/.test(toast().replace(/[  ]/g, " ")) || ["moitie", "cible_atteinte", "cible_depassee"].some(k => TEXTES.felicitations[k].some(m => toast().includes(m))), "cap des 100 mots (ou mi-parcours, cible) : félicité");
  vrai(+box.querySelector("#mrAnneau").getAttribute("stroke-dashoffset") < 10, "anneau de progression de la session rempli (objectif 60 mots dépassé)");

  // 3. temps écoulé : annoncé une seule fois
  w.eval("state.maRedac.session.debut -= 16 * 60000"); await wait(1200);
  vrai(toast().includes(TEXTES.session.fin_temps), "temps prévu écoulé : annoncé");

  // 4. sons coupés : plus aucun carillon
  clic('[data-mr="sons"]'); const n1 = notes;
  draft.value += " " + Array.from({length: 100}, (_, i) => "autre" + i).join(" "); draft.dispatchEvent(new w.Event("input")); await wait(1100);
  egal(notes, n1, "sons coupés : silence");
  clic('[data-mr="sons"]');

  // 5. terminer : félicitation de fin, sortie du mode concentration, bilan avec question de relecture
  clic('[data-mr="terminer"]');
  vrai(!d.body.classList.contains("mr-focus"), "fin de session : sortie du mode concentration");
  vrai(/Session terminée|Bravo pour cette session/.test(toast()), "fin de session : félicitation avec le bilan");
  vrai(box.querySelector('form[data-mr-form="bilan"]') && box.textContent.includes(TEXTES.session.relecture), "bilan avec une question de relecture");
  box.querySelector('form[data-mr-form="bilan"]').onsubmit(new w.Event("submit"));
  egal(w.eval("state.maRedac.bilans.length"), 1, "bilan enregistré");

  // 6. « Je bloque » : le sprint lance une session de 5 minutes ; une consigne s’affiche
  clic('[data-mr-outil="plus_petit_pas"]'); vrai(box.textContent.includes(TEXTES.deblocage.outils.plus_petit_pas.consigne), "outil de déblocage : consigne affichée");
  clic('[data-mr-outil="sprint"]'); egal(w.eval("state.maRedac.session.duree"), 5, "sprint : session de 5 minutes");
  clic('[data-mr="terminer"]'); box.querySelector('form[data-mr-form="bilan"]').onsubmit(new w.Event("submit"));

  // 7. questions par section
  const sel = box.querySelector("[data-mr-section]"); sel.value = "methode"; sel.onchange();
  vrai(TEXTES.questions_par_section.methode.some(q => box.textContent.includes(q)), "question choisie dans la section Méthode");

  // 8. rendez-vous d’écriture : bip et notification à l’heure si rien n’est commencé, une seule fois par jour
  w.eval(`state.maRedac.session = null; state.maRedac.bilans = []; state.maRedac.sessions = []; state.maRedac.journal = []; state.maRedac.rdv = {heure: "00:00", jours: 127, actif: true, duree: 25}; state.maRedac.rappels = [];`);
  const n2 = notes; w.MaRedactionUI.verifierRendezVous();
  vrai(notes - n2 === 3, "rendez-vous manqué : trois petits bips");
  vrai(notifications.some(n => n.includes(TEXTES.rendez_vous.rappel)) && toast().includes(TEXTES.rendez_vous.rappel), "rendez-vous : notification et message");
  const n3 = notes; w.MaRedactionUI.verifierRendezVous(); egal(notes, n3, "le rappel n’est pas répété dans la journée");
  w.eval(`state.maRedac.rappels = []; state.maRedac.soutien = true;`); const n4 = notes; w.MaRedactionUI.verifierRendezVous(); egal(notes, n4, "pause assumée : aucun rappel");
  w.eval(`state.maRedac.soutien = false;`);

  // 9. agenda du téléphone et export Excel
  w.eval(`MaRedactionUI.ui.onglet = "plans"; renderMaRedac();`);
  vrai(box.querySelector('form[data-mr-form="rdv"]'), "réglage du rendez-vous dans l’onglet Plans");
  clic('[data-mr="agenda"]');
  const ics = telechargements.find(t => t.nom.endsWith(".ics"));
  vrai(ics && /RRULE:FREQ=WEEKLY/.test(ics.contenu) && ics.type === "text/calendar", "agenda : fichier .ics récurrent téléchargé");
  w.eval(`state.maRedac.journal = [{date: MaRedactionUI.aujourdhui(), mots_ecrits: 120, source: "redaction"}]; MaRedactionUI.ui.onglet = "jour"; renderMaRedac();`);
  clic('[data-mr="export-excel"]'); await wait(300);
  const xl = telechargements.find(t => t.nom.endsWith(".xlsx"));
  vrai(xl, "Excel : classeur téléchargé");
  if(xl){ const z = await JSZip.loadAsync(Buffer.from(await xl.contenu.arrayBuffer())); const f1 = await z.file("xl/worksheets/sheet1.xml").async("string");
    const motsDraft = w.eval("MaRedaction.compterMots(document.querySelector('#draft').value)"); vrai(f1.includes(`<v>${motsDraft}</v>`) && (await z.file("xl/workbook.xml").async("string")).includes('name="Sessions"'), "Excel : le journal du jour est dans le classeur"); }

  // 10. jamais de texte écrit à la place de l’utilisateur
  vrai(!/instrument de pouvoir\..*instrument de pouvoir\./.test(draft.value) && draft.value.startsWith("Le langage est un instrument de pouvoir."), "le texte de l’utilisateur n’est jamais modifié par le module");

  errs.forEach(e => console.log("ÉCHEC " + e));
  console.log(errs.length ? `erreurs : ${errs.length}` : "erreurs : aucune");
  process.exit(errs.length ? 1 : 0);
})();
