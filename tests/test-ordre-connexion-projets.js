// Exigence du 2026-11-01 : 1. ordre alphabétique de la bibliographie ; 2. SCIENTUS hors ligne et en ligne, au choix
// ou selon la connexion ; 3. chaque bibliographie dans son projet, enregistré, fermé et rangé quand on quitte la
// page, puis rouvert depuis l’étagère « Mes projets ».
const {JSDOM} = require("jsdom");
const base = require("./charger")();
const E = require("../js/moteur.js");
const errs = [];
const egal = (o, a, q) => { if (o !== a) errs.push(`${q} :\n    attendu ${JSON.stringify(a)}\n    obtenu  ${JSON.stringify(o)}`); };
const wait = ms => new Promise(r => setTimeout(r, ms));

// 1. ORDRE ALPHABÉTIQUE (règles de classement des bibliothèques)
const f = (fam, given, year, title, co) => Object.assign(E.blank(), {authors: fam ? [{family: fam, given}].concat(co || []) : [], year, title});
const L = [f("Nabi", "A.", "2001", "T1"), f("N’Guessan", "B.", "2015", "T2"), f("Alami", "C.", "2010", "T3"), f("Al-Azzawi", "Q.", "2018", "T4"), f("Ébrié", "D.", "2000", "T5"), f("Eboué", "E.", "1999", "T6"),
  f("Bourdieu", "P.", "1982", "Ce que parler"), f("Bourdieu", "P.", "1979", "La distinction"), f("Bourdieu", "P.", "1970", "La reproduction", [{family: "Passeron", given: "J.-C."}]),
  f("Diop", "C. A.", "1954", "Nations"), f("de Certeau", "M.", "1980", "Invention"), f("Diop", "A.", "1990", "Autre"), f("", "", "2000", "Anonyme"), f("Kouassi", "A.", "s.d.", "Récit"), f("Kouassi", "A.", "2005", "Récit 2")];
egal(E.sortSources(L).map(s => (s.authors.map(a => a.family).join("+") || `[${s.title}]`) + " " + s.year).join(" | "),
  "Alami 2010 | Al-Azzawi 2018 | [Anonyme] 2000 | Bourdieu 1979 | Bourdieu 1982 | Bourdieu+Passeron 1970 | de Certeau 1980 | Diop 1990 | Diop 1954 | Eboué 1999 | Ébrié 2000 | Kouassi 2005 | Kouassi s.d. | Nabi 2001 | N’Guessan 2015",
  "ordre : ponctuation ignorée, particule « de » ignorée, prénom avant l’année, œuvres seules avant les coécrites, sans date en dernier");

const ouvrir = async (stockage, reponses) => {
  const appels = [];
  const dom = new JSDOM(base, {runScripts: "dangerously", pretendToBeVisual: true, url: "https://bibliocard.pages.dev/", beforeParse(w){
    if(stockage) Object.entries(stockage).forEach(([k, v]) => w.localStorage.setItem(k, v));
    w.fetch = async url => { appels.push(String(url)); return {ok: true, status: 200, json: async () => (reponses ? reponses(String(url)) : {results: [], docs: [], message: {items: []}, response: {docs: []}}), text: async () => ""}; };
  }});
  const w = dom.window; w.scrollTo = () => {};
  w.HTMLDialogElement.prototype.showModal = function(){ this.open = true; }; w.HTMLDialogElement.prototype.close = function(){ this.open = false; };
  w.addEventListener("error", e => errs.push(e.message));
  await wait(400); w.document.querySelector('#uiLangSeg [data-l="fr"]').click(); await wait(20);
  return {w, d: w.document, appels};
};

(async () => {
  // la bibliographie affichée et exportée suit cet ordre
  let {w, d} = await ouvrir();
  w.eval(`state.sources = ${JSON.stringify(L.slice(0, 6))}; renderAll();`);
  egal([...d.querySelectorAll("#biblio .entry .ref")].map(e => e.textContent.split(",")[0]).join(" | "), "ALAMI C. | AL-AZZAWI Q. | EBOUÉ E. | ÉBRIÉ D. | NABI A. | N’GUESSAN B.", "bibliographie affichée dans l’ordre alphabétique");

  // 2. HORS LIGNE, au choix de l’utilisateur : aucun appel à Internet, le travail continue, puis reprise en ligne
  let o = await ouvrir({"scientus.connexion": "off"}, url => /raw_author_name\.search:Mbembe/.test(decodeURIComponent(url)) ? {results: [{display_name: "De la postcolonie", publication_year: 2000, authorships: [{author: {display_name: "Achille Mbembe"}}], type: "book", cited_by_count: 900}]} : {results: [], docs: [], message: {items: []}, response: {docs: []}});
  ({w, d} = o);
  egal(d.querySelector("#cnxPill").hidden, false, "hors ligne : la pastille « Hors ligne » est visible");
  egal(d.querySelector('#cnxSeg [data-cx="off"]').getAttribute("aria-pressed"), "true", "hors ligne : le choix est coché dans le menu");
  const ta = d.querySelector("#smart"); ta.value = "Comme l’a montré A. Mbembe (2000), la postcolonie est un régime de violence."; ta.dispatchEvent(new w.Event("input"));
  await d.querySelector("#addBtn").onclick(); await wait(300);
  egal(o.appels.length, 0, "hors ligne : aucune requête vers Internet");
  egal(w.eval("state.sources.length"), 1, "hors ligne : l’œuvre citée a quand même son entrée");
  egal(w.eval("state.sources[0]._cite") ? "en attente" : "", "en attente", "hors ligne : sa recherche est mise de côté");
  // l’utilisateur repasse en automatique (connexion présente) : la recherche reprend toute seule
  d.querySelector('#cnxSeg [data-cx="auto"]').click(); await wait(600);
  egal(o.appels.length > 0, true, "retour en ligne : les recherches reprennent");
  egal(w.eval("state.sources[0].title"), "De la postcolonie", "retour en ligne : l’entrée provisoire est remplacée par l’œuvre trouvée");
  egal(d.querySelector("#cnxPill").hidden, true, "en ligne : plus de pastille");

  // 3. PROJETS : création nommée, enregistrement et fermeture en quittant la page, étagère au retour
  ({w, d} = await ouvrir());
  w.eval(`setView("projets")`);
  d.querySelector("#pliNom").value = "Thèse, chapitre 2"; d.querySelector("#pliType").value = "these";
  d.querySelector("#pliNew").dispatchEvent(new w.Event("submit", {cancelable: true})); await wait(50);
  egal(w.eval("state.projects[state.current].name"), "Thèse, chapitre 2", "projet créé avec son nom");
  egal(d.body.dataset.view, "biblio", "le projet créé s’ouvre aussitôt");
  w.eval(`state.sources = ${JSON.stringify(L.slice(6, 9))}; save();`);
  w.dispatchEvent(new w.Event("pagehide")); // l’utilisateur quitte la page, sans attendre l’enregistrement différé
  const brut = w.localStorage.getItem("bibliocard.v3"), donnees = JSON.parse(brut);
  const pr = Object.values(donnees.projects).find(p => p.name === "Thèse, chapitre 2");
  egal(pr && pr.sources.length, 3, "en quittant : le projet est enregistré avec ses références");
  egal(!!(pr && pr.fermeLe), true, "en quittant : le projet est fermé");
  egal("sources" in donnees, false, "la copie de travail n’est pas écrite deux fois (place gagnée pour les projets)");
  // retour sur la page : l’étagère, puis « Continuer »
  ({w, d} = await ouvrir({"bibliocard.v3": brut}));
  egal(d.body.dataset.view, "projets", "au retour : l’étagère « Mes projets » s’ouvre");
  const pli = [...d.querySelectorAll(".pli")].find(e => /Thèse, chapitre 2/.test(e.textContent));
  egal(!!pli && /3 références/.test(pli.textContent) && /Thèse de doctorat/.test(pli.textContent), true, "au retour : le pli montre le nom, le type et les références");
  pli.querySelector("[data-cont]").click(); await wait(50);
  egal(d.body.dataset.view, "biblio", "« Continuer » rouvre le projet");
  egal(w.eval("state.sources.map(s => s.year).sort().join()"), "1970,1979,1982", "le travail est retrouvé tel qu’il était");
  egal(d.querySelector("#projBtn").textContent.includes("Thèse, chapitre 2"), true, "le nom du projet ouvert est en haut");
  d.querySelector("#projBtn").click(); egal(d.body.dataset.view, "projets", "le nom du projet, en haut, ouvre l’étagère");

  errs.forEach(e => console.log("ÉCHEC " + e));
  console.log(errs.length ? `erreurs : ${errs.length}` : "erreurs : aucune");
  process.exit(errs.length ? 1 : 0);
})();
