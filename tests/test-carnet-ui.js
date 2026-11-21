// Carnet de recherche, interface, sur la vraie application : du plan aux lectures, des lectures aux fiches,
// des fiches à la rédaction. Saisie intelligente, classement, recherche, thèmes, lecture terminée, mode promenade,
// préparation des parties, étapes de MA RÉDACTION calées sur le plan, dossier inséré dans la rédaction, exports,
// et chaque projet garde son propre carnet.
const {JSDOM} = require("jsdom");
const JSZip = require("jszip");
const base = require("./charger")();
const TEXTES = require("../textes/messages_fr.json");
const errs = [];
const egal = (o, a, q) => { if(JSON.stringify(o) !== JSON.stringify(a)) errs.push(`${q} :\n    attendu ${JSON.stringify(a)}\n    obtenu  ${JSON.stringify(o)}`); };
const vrai = (v, q) => egal(!!v, true, q);
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const telechargements = [];
  const dom = new JSDOM(base, {runScripts: "dangerously", pretendToBeVisual: true, url: "https://bibliocard.pages.dev/", beforeParse(w){
    w.TEXTES_MA_REDACTION = TEXTES;
    w.fetch = async () => ({ok: true, status: 200, json: async () => ({results: [], docs: [], message: {items: []}, response: {docs: []}})});
  }});
  const w = dom.window, d = w.document; w.scrollTo = () => {}; w.Element.prototype.scrollIntoView = () => {};
  w.HTMLDialogElement.prototype.showModal = function(){ this.open = true; }; w.HTMLDialogElement.prototype.close = function(){ this.open = false; };
  w.addEventListener("error", e => errs.push("erreur JS : " + e.message));
  await wait(400); d.querySelector('#uiLangSeg [data-l="fr"]').click(); await wait(20);
  w.JSZip = JSZip; w.download = (nom, contenu, type) => telechargements.push({nom, contenu, type});
  w.saveWord = (nom, html) => telechargements.push({nom: nom + ".doc", contenu: html});
  const box = d.querySelector("#carnet"), q = s => box.querySelector(s);
  const clic = s => { const b = q(s); if(!b) errs.push(`introuvable : ${s}`); else b.click(); };
  const onglet = k => clic(`[data-c-onglet="${k}"]`);

  // 0. navigation : le carnet est un module, entre le plan et la rédaction
  const nav = [...d.querySelectorAll("#appNav [data-nav]")].map(b => b.dataset.nav);
  vrai(nav.indexOf("carnet") === nav.indexOf("plan") + 1 && nav.indexOf("redac") === nav.indexOf("carnet") + 1, "navigation : Plan → Carnet → Rédaction");
  w.eval(`setView("carnet")`);
  vrai(/Ton plan est vide/.test(box.textContent), "sans plan : invitation à faire le plan");

  // 1. le plan et la bibliographie
  w.eval(`state.sources = [
    {id: "s1", type: "book", title: "Ce que parler veut dire", year: "1982", publisher: "Fayard", city: "Paris", authors: [{family: "Bourdieu", given: "Pierre"}]},
    {id: "s2", type: "article", title: "Presse et élections en Côte d’Ivoire", year: "2016", container: "Kasa Bya Kasa", pages: "45-62", authors: [{family: "Koné", given: "Awa"}]},
    {id: "s3", type: "book", title: "Analyser les discours médiatiques", year: "2007", authors: [{family: "Charaudeau", given: "Patrick"}]},
    {id: "s4", type: "article", title: "Les sondages en Afrique", year: "2019", authors: [{family: "Yao", given: "Kouassi"}]}];
    state.plan = {sujet: "La presse ivoirienne et les élections de 2020", modele: "article_theorique", items: [
      {n: 1, t: "Introduction", r: "Problématique, hypothèses"}, {n: 1, t: "1. Le discours partisan de la presse", r: "Polarisation des journaux"},
      {n: 2, t: "1.1. La presse privée et les partis", r: ""}, {n: 1, t: "2. Les sondages et la fabrique de l’opinion", r: "Mesure de l’opinion publique"},
      {n: 1, t: "Conclusion", r: ""}, {n: 1, t: "Références bibliographiques", r: "", sans: true}]};
    renderPlan();`);
  const ids = w.eval(`plan().items.map(it => it.id)`);
  vrai(ids.every(Boolean) && new Set(ids).size === 6, "chaque partie du plan reçoit un identifiant stable");

  // 2. Plan et lectures → « À lire pour cette partie »
  w.eval(`plan().items[3].lect = {etat: "ok", requetes: ["sondages"], L: [{...state.sources[3], id: undefined, _lien: "https://exemple.org/yao"}, {type: "article", title: "Opinion et médias", year: "2018", authors: [{family: "Diallo", given: "Fatou"}], _src: "HAL"}]}; setView("plan");`);
  const bAlire = d.querySelector('#planListe .ppart[data-i="3"] [data-pa="alire"]');
  vrai(bAlire, "Plan et lectures : bouton « À lire pour cette partie »"); bAlire.click(); await wait(20);
  egal(w.eval(`JSON.stringify(state.carnet.lectures.s4.parties)`), JSON.stringify([ids[3]]), "la source déjà dans la bibliographie va dans la liste de lecture de sa partie");
  d.querySelectorAll('#planListe .ppart[data-i="3"] [data-pa="alire"]')[0].click(); await wait(20);
  egal(w.eval(`state.sources.length`), 5, "une lecture nouvelle entre aussi dans la bibliographie");
  vrai(/Dans ta liste de lecture/.test(d.querySelector('#planListe .ppart[data-i="3"]').textContent), "le plan montre qu’elle est dans la liste de lecture");
  w.eval(`CarnetUI.ajouterALire("s2", "${ids[1]}"); CarnetUI.ajouterALire("s3", "${ids[1]}"); CarnetUI.ajouterALire("s1", "${ids[0]}"); setView("carnet");`);

  // 3. saisie intelligente : type, source, page et partie reconnus ; la fiche se range seule
  const noter = async t => { const ta = q("#cTexte"); ta.value = t; ta.dispatchEvent(new w.Event("input")); await wait(320); const det = q("#cDetect").textContent; q('[data-c-form="saisie"]').dispatchEvent(new w.Event("submit", {cancelable: true})); await wait(30); return det; };
  let det = await noter("« Les journaux privés soutiennent ouvertement un parti pendant la campagne » (Koné, 2016, p. 50)");
  vrai(/Citation/.test(det) && /Rangée dans/.test(det), "saisie : type reconnu et partie proposée pendant la frappe");
  let n = w.eval(`JSON.stringify(state.carnet.notes.at(-1))`); n = JSON.parse(n);
  egal([n.type, n.source, n.page, n.texte], ["citation", "s2", "50", "Les journaux privés soutiennent ouvertement un parti pendant la campagne"], "fiche créée : citation, source, page");
  vrai([ids[1], ids[2]].includes(n.parties[0]), "fiche rangée dans la partie sur la presse partisane");
  egal(w.eval(`state.carnet.lectures.s2.statut`), "en_cours", "une fiche sur une source à lire la met « en cours »");
  vrai(/Première fiche du jour/.test(d.querySelector("#toast").textContent), "première fiche du jour : félicitée");
  await noter("Le sondage ne mesure pas l’opinion, il la fabrique (Yao, 2019, p. 12)");
  await noter("Opinion publique : agrégat des opinions individuelles mesurées par les sondages #opinion");
  await noter("Le langage est un instrument de pouvoir symbolique (Bourdieu, 1982, p. 60)");
  await noter("En 2020, 54 % des électeurs se sont abstenus selon la CEI");
  const N = JSON.parse(w.eval(`JSON.stringify(state.carnet.notes)`));
  egal(N.map(x => x.type), ["citation", "paraphrase", "definition", "paraphrase", "donnee"], "types reconnus");
  egal(N[1].parties, [ids[3]], "la note sur les sondages va dans la partie 2");
  egal(N[3].parties, [ids[0]], "sans indice dans le texte : la partie pour laquelle on lit la source");
  egal([N[4].source, N[4].parties], [null, []], "une donnée sans source ni indice : à classer, sans source collée");
  // ce qu’on écrit survit à un nouvel affichage en arrière-plan (sauvegarde, synchronisation)
  { const ta = q("#cTexte"); ta.value = "Idée en cours de frappe"; ta.focus(); w.eval("renderAll()"); await wait(10);
    egal(q("#cTexte").value, "Idée en cours de frappe", "la saisie en cours n’est pas effacée par un nouvel affichage");
    q("#cTexte").value = ""; }
  // doublon : prévenu, pas créé
  await noter("« Les journaux privés soutiennent ouvertement un parti pendant la campagne » (Koné, 2016, p. 50)");
  egal(w.eval(`state.carnet.notes.length`), 5, "doublon : pas de seconde fiche sans confirmation");

  // 4. Aujourd’hui : fiches à classer, une touche pour ranger ; lecture du jour ; préparation
  onglet("jour");
  vrai(/Fiches à classer/.test(box.textContent) && /Préparation des parties/.test(box.textContent) && /À lire aujourd’hui/.test(box.textContent), "Aujourd’hui : lecture du jour, fiches à classer, préparation");
  clic('[data-c="ranger-autre"]'); const sel = q("[data-c-ranger]"); sel.value = ids[3]; sel.onchange(); await wait(10);
  egal(w.eval(`JSON.stringify(state.carnet.notes[4].parties)`), JSON.stringify([ids[3]]), "fiche rangée en une touche");
  vrai(/Toutes tes fiches sont rangées/.test(d.querySelector("#toast").textContent), "tout est rangé : félicité");

  // 5. Fiches : recherche intelligente, filtres, modification, fiches proches, suppression annulable
  onglet("fiches");
  const chercher = async t => { const r = q("#cRecherche"); r.value = t; r.dispatchEvent(new w.Event("input")); await wait(350); return [...box.querySelectorAll(".cfiche .ctexte")].map(e => e.textContent); };
  egal((await chercher("sondages")).length, 2, "recherche « sondages » (racine, accents)");
  egal((await chercher("auteur:Kone")).length, 1, "recherche par auteur");
  egal((await chercher("type:paraphrase")).length, 2, "recherche par type");
  vrai(/1 fiche\b/.test(box.textContent) || /2 fiches/.test(box.textContent), "compte des fiches accordé");
  await chercher("");
  const f0 = box.querySelector(".cfiche [data-c=\"modifier\"]"); f0.click();
  const fe = q('form[data-c-form="edition"]'); vrai(fe, "modification d’une fiche"); fe.querySelector("[name=commentaire]").value = "À confronter avec Charaudeau"; fe.querySelector("[name=themes]").value = "presse partisane, #campagne";
  fe.dispatchEvent(new w.Event("submit", {cancelable: true})); await wait(10);
  vrai(w.eval(`state.carnet.notes.some(n => n.commentaire === "À confronter avec Charaudeau" && n.themes.join() === "presse partisane,campagne")`), "commentaire et thèmes enregistrés");
  const nb = w.eval(`state.carnet.notes.length`); box.querySelector('.cfiche [data-c="supprimer"]').click();
  egal(w.eval(`state.carnet.notes.length`), nb - 1, "suppression"); d.querySelector("#toast button") && d.querySelector("#toast button").click(); await wait(10);
  egal(w.eval(`state.carnet.notes.length`), nb, "suppression annulée");

  // 6. Thèmes
  onglet("themes"); vrai(box.querySelectorAll(".ctheme").length >= 2 && /#opinion/.test(box.textContent), "thèmes : les miens et ceux repérés");
  box.querySelector('.ctheme').click(); vrai(w.eval(`CarnetUI.ui.onglet`) === "fiches" && box.querySelectorAll(".cfiche").length >= 1, "un thème ouvre ses fiches");

  // 7. Lectures : rythme, carte de lecture, page atteinte, « J’ai fini » → résumé en une phrase
  w.eval(`CarnetUI.ui.q = ""; CarnetUI.ui.filtres = {};`); onglet("lectures");
  vrai(/pages par jour de lecture/.test(box.textContent), "Lectures : rythme de lecture");
  const pg = q('[data-c-page="s3"]'); pg.value = "40"; pg.onchange(); await wait(10);
  egal(w.eval(`state.carnet.lectures.s3.statut + " " + state.carnet.lectures.s3.page`), "en_cours 40", "page atteinte : lecture en cours");
  egal(w.eval(`state.carnet.sessions.filter(s => s.lecture === "s3").reduce((t, s) => t + s.pages, 0)`), 40, "pages lues comptées pour le suivi");
  clic('[data-c="finie"][data-s="s3"]'); const fr = q('form[data-c-form="retenu"]'); fr.querySelector("[name=r]").value = "Charaudeau distingue information, persuasion et captation."; fr.dispatchEvent(new w.Event("submit", {cancelable: true})); await wait(10);
  egal(w.eval(`state.carnet.lectures.s3.statut`), "lue", "lecture terminée");
  vrai(w.eval(`state.carnet.notes.some(n => n.type === "resume" && n.source === "s3" && n.parties.includes("${ids[1]}"))`), "ce qu’on retient devient un résumé rangé dans la partie");

  // 8. mode promenade : notes au vol, à classer ensuite
  onglet("jour"); clic('[data-c="promenade"]');
  vrai(q(".cpromenade"), "mode promenade ouvert"); q("#cPromTexte").value = "Idée : comparer avec la presse ghanéenne #comparaison"; clic('[data-c="prom-noter"]');
  vrai(/1 note prise/.test(box.textContent), "promenade : note prise"); clic('[data-c="prom-fin"]');
  vrai(w.eval(`state.carnet.notes.at(-1).origine === "promenade" && state.carnet.notes.at(-1).themes[0] === "comparaison"`), "note de promenade enregistrée avec son thème");

  // 9. Vers la rédaction : ordre conseillé, état de chaque partie, fil, étapes de MA RÉDACTION calées sur le plan
  onglet("redaction");
  vrai(/Ordre de rédaction conseillé/.test(box.textContent) && /Introduction\s*$/.test(box.querySelector(".c-corps > p:nth-of-type(2)").textContent.trim()), "l’introduction se rédige en dernier");
  vrai(box.querySelectorAll(".cchaps > li").length === 5, "une ligne par partie (sans les références)");
  w.eval(`state.maRedac = {objectif: {titre: "Article", type_document: "article", pages_cibles: 30, mots_par_page: 250, date_debut: "2026-12-07", date_fin: "2027-02-26", jours_travail: 31, jours_exclus: [], statut: "actif"}, sous: [], journal: [], compteur: null, plans: [], sessions: [], interventions: [], refus: [], bilans: [], contexte: {}, soutien: false, session: null, reduction: {}}; CarnetUI.rendre();`);
  clic('[data-c="caler"]');
  egal(w.eval(`state.maRedac.sous.map(s => s.titre + ":" + s.pages_cibles).join(" | ")`), "Introduction:3 | 1. Le discours partisan de la presse:12 | 2. Les sondages et la fabrique de l’opinion:12 | Conclusion:2", "étapes de MA RÉDACTION = parties du plan");
  vrai(/rédaction du/.test(box.textContent), "chaque partie a ses dates de rédaction");
  clic(`[data-c="organiser"][data-p="${ids[3]}"]`); vrai(q(".cfil"), "fil de la partie");
  const avant = w.eval(`Carnet.dossier("${ids[3]}", state.carnet.notes).map(n => n.id).join()`);
  clic(`.cfil [data-c="fil-bas"]`);
  vrai(w.eval(`Carnet.dossier("${ids[3]}", state.carnet.notes).map(n => n.id).join()`) !== avant, "ordre du fil modifié");

  // 10. Rédiger cette partie : le dossier s’ouvre dans la Rédaction ; « Insérer » met la fiche et sa référence
  clic(`[data-c="rediger"][data-p="${ids[3]}"]`);
  egal(d.body.dataset.view, "redac", "« Rédiger cette partie » ouvre la Rédaction");
  const dos = d.querySelector("#carnetDossier"); vrai(!dos.hidden && dos.querySelector("details").open, "dossier de fiches ouvert");
  const ta = d.querySelector("#draft"); ta.value = "Introduction du paragraphe."; ta.setSelectionRange(ta.value.length, ta.value.length);
  const idPara = w.eval(`state.carnet.notes.find(n => n.type === "paraphrase" && n.source === "s4").id`);
  dos.querySelector(`[data-c-inserer="${idPara}"]`).click(); await wait(10);
  vrai(/^Introduction du paragraphe\. Le sondage ne mesure pas l’opinion, il la fabrique \(.*Yao.*2019.*12.*\)\. $/.test(ta.value), "fiche insérée avec sa référence, à l’endroit du curseur : " + ta.value);
  vrai(w.eval(`state.carnet.notes.find(n => n.id === "${idPara}").utilisee`), "fiche marquée « utilisée »");

  // 11. exports Word et Excel
  w.eval(`setView("carnet")`); onglet("fiches"); clic('[data-c="word"]');
  const doc = telechargements.find(t => t.nom.endsWith(".doc"));
  vrai(doc && /Fiches de lecture/.test(doc.contenu) && /2\. Les sondages/.test(doc.contenu) && /Références/.test(doc.contenu), "Word : fiches par partie et références");
  clic('[data-c="excel"]'); await wait(300);
  const xl = telechargements.find(t => t.nom.endsWith(".xlsx"));
  if(xl){ const z = await JSZip.loadAsync(Buffer.from(await xl.contenu.arrayBuffer())); const wb = await z.file("xl/workbook.xml").async("string");
    vrai(/name="Fiches"/.test(wb) && /name="Lectures"/.test(wb) && /name="Parties"/.test(wb), "Excel : fiches, lectures, parties"); } else errs.push("Excel : pas de classeur");

  // 12. une partie renommée garde ses fiches ; chaque projet a son carnet
  w.eval(`remplacerPlan(plan().items.map(it => ({...it})), "x")`);
  egal(w.eval(`plan().items.map(it => it.id).join()`), ids.join(), "plan repris : mêmes identifiants, fiches gardées");
  const nbFiches = w.eval(`state.carnet.notes.length`);
  w.eval(`(() => { const p = blankProject("Autre", "memoire"); state.projects[p.id] = p; syncCurrent(); loadProject(p.id); })()`);
  egal(w.eval(`state.carnet`), null, "nouveau projet : carnet vide");
  w.eval(`syncCurrent(); loadProject(Object.keys(state.projects).find(k => state.projects[k].name !== "Autre" && (state.projects[k].carnet || {}).notes))`);
  egal(w.eval(`state.carnet.notes.length`), nbFiches, "retour au projet : son carnet est intact");

  errs.forEach(e => console.log("ÉCHEC " + e));
  console.log(errs.length ? `erreurs : ${errs.length}` : "erreurs : aucune");
  process.exit(errs.length ? 1 : 0);
})();
