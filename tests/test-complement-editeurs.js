// Informations complémentaires publiques des éditeurs, même pour un document payant (exigence du 2026-10-27) :
// données déposées avec le DOI (doi.org), catalogue de la BnF, theses.fr. Réponses réelles enregistrées dans fixtures/.
// Exigences : ne remplir que les cases vides, seulement pour la même œuvre, citer la source, ne jamais reprendre le résumé.
const {JSDOM} = require("jsdom");
const fs = require("fs"), path = require("path");
const base = require("./charger")();
const E = require("../js/moteur.js");
const fx = n => fs.readFileSync(path.join(__dirname, "fixtures", n), "utf8");
const CSL = JSON.parse(fx("doi-cairn-bourdieu.json")), BNF = fx("bnf-mbembe.xml"), THESES = JSON.parse(fx("thesesfr-ouoba.json"));
const errs = [];
const egal = (o, a, q) => { if (o !== a) errs.push(`${q} :\n    attendu ${JSON.stringify(a)}\n    obtenu  ${JSON.stringify(o)}`); };
const wait = ms => new Promise(r => setTimeout(r, ms));

// 1. lecteurs du moteur, sur les vraies réponses
const art = E.fromCSL(CSL);
egal(`${art.container}|${art.volume}|${art.issue}|${art.pages}`, "Actes de la recherche en sciences sociales|89|4|3-46", "doi.org : revue, volume (« n° 89 » nettoyé), numéro, pages");
const bnf = E.lireBnf(BNF);
egal(bnf.map(s => `${s.year} ${s.city} ${s.publisher}`).join(" / "), "2000 Paris Karthala / 2020 Paris la Découverte", "BnF : éditeur et ville de chaque édition");
const these = E.fromThesesFr(THESES.theses[0]);
egal(`${these.year}|${these.publisher}`, "2009|Université Bordeaux 3", "theses.fr : année et université de soutenance");
// rien de la notice qui ne soit de la bibliographie (collection, sujets, format, résumé)
egal(/Collection|Pratiques politiques|couv\. ill|Afrique subsaharienne --/.test(JSON.stringify(bnf)), false, "BnF : ni collection, ni sujets, ni description");
const mbembe = Object.assign(E.blank(), {type: "book", authors: [{family: "Mbembe", given: "Achille"}], year: "2000", title: "De la postcolonie"});
egal(E.memeOeuvre(mbembe, bnf[0], true), true, "même œuvre, même année d’édition");
egal(E.memeOeuvre(mbembe, bnf[1], true), false, "l’édition de 2020 n’est pas celle de 2000");
egal(E.memeOeuvre(Object.assign(E.blank(), {authors: [{family: "Mbembe", given: ""}], year: "2000", title: "Sortir de la grande nuit"}), bnf[0], true), false, "un autre livre du même auteur n’est pas la même œuvre");

(async () => {
  const appels = [];
  const dom = new JSDOM(base, {runScripts: "dangerously", pretendToBeVisual: true, url: "https://bibliocard.pages.dev/", beforeParse(w){
    w.fetch = async (url, init) => {
      url = String(url); appels.push({url, accept: init && init.headers && init.headers.Accept});
      const rep = c => ({ok: true, status: 200, json: async () => c, text: async () => typeof c === "string" ? c : JSON.stringify(c)});
      if (/^https:\/\/doi\.org\/10\.3917/.test(url)) return rep(CSL);
      if (/catalogue\.bnf\.fr\/api\/SRU/.test(url)) return rep(BNF);
      if (/theses\.fr\/api/.test(url)) return rep(THESES);
      if (/api\.crossref\.org\/works\?query\.bibliographic=.*Toulmin/.test(decodeURIComponent(url))) return rep({message: {items: [{type: "journal-article", title: ["Using Toulmin's Framework for the Analysis of Everyday Argumentation: Some Methodological Considerations"], author: [{family: "Simosi", given: "Maria"}], issued: {"date-parts": [[2003]]}, "container-title": ["Argumentation"], volume: "17", issue: "2", page: "185-202", publisher: "Springer Science and Business Media LLC", DOI: "10.1023/A:1024059024337"}]}});
      return rep({results: [], docs: [], message: {items: []}, response: {docs: []}, data: []});
    };
  }});
  const w = dom.window, d = w.document; w.scrollTo = () => {};
  w.HTMLDialogElement.prototype.showModal = function(){ this.open = true; }; w.HTMLDialogElement.prototype.close = function(){ this.open = false; };
  w.addEventListener("error", e => errs.push(e.message));
  await wait(300); d.querySelector('#uiLangSeg [data-l="fr"]').click(); await wait(20);
  w.eval(`state.sources = [
    Object.assign(blank(), {id: "cairn", type: "article", authors: [{family: "Bourdieu", given: "Pierre"}], year: "1991", title: "Le champ littéraire", doi: "10.3917/arss.p1991.89n1.0003"}),
    Object.assign(blank(), {id: "livre2000", type: "book", authors: [{family: "Mbembe", given: "Achille"}], year: "2000", title: "De la postcolonie. Essai sur l’imagination politique dans l’Afrique contemporaine"}),
    Object.assign(blank(), {id: "livre2020", type: "book", authors: [{family: "Mbembe", given: "Achille"}], year: "2020", title: "De la postcolonie"}),
    Object.assign(blank(), {id: "these", type: "thesis", genre: "Thèse de doctorat", authors: [{family: "Ouoba", given: "Attina Jules"}], year: "2009", title: "Crises identitaires africaines à travers la presse quotidienne et l’observation des sociétés d’Afrique subsaharienne"}),
    Object.assign(blank(), {id: "autre", type: "book", authors: [{family: "Mbembe", given: "Achille"}], year: "2010", title: "Sortir de la grande nuit"}),
    Object.assign(parseRefHeuristic("SIMOSI Maria, 2003, « Using Toulmin’s Framework for the Analysis of Everyday Argumentation : Some Methodological Considerations », in Argumentation."), {id: "simosi"}),
    Object.assign(blank(), {id: "ecrit", type: "article", authors: [{family: "Bourdieu", given: "Pierre"}], year: "1991", title: "Le champ littéraire", doi: "10.3917/arss.p1991.89n1.0003", container: "Actes de la recherche", volume: "89", issue: "", pages: ""})
  ];`);
  await w.completerEnLigne(); await wait(50);
  const S = id => w.eval(`state.sources.find(s => s.id === "${id}")`);
  egal(`${S("cairn").container}|${S("cairn").volume}|${S("cairn").issue}|${S("cairn").pages}`, "Actes de la recherche en sciences sociales|89|4|3-46", "article payant (Cairn) : complété avec les données de l’éditeur");
  egal(appels.some(a => /^https:\/\/doi\.org\//.test(a.url) && a.accept === "application/vnd.citationstyles.csl+json"), true, "doi.org interrogé pour les données bibliographiques");
  egal((S("cairn")._sourcesLigne || []).join(), "données de l’éditeur (DOI)", "la source est citée");
  egal(`${S("livre2000").city}|${S("livre2000").publisher}`, "Paris|Karthala", "livre de 2000 : édition Karthala (BnF)");
  egal(`${S("livre2020").city}|${S("livre2020").publisher}`, "Paris|la Découverte", "livre de 2020 : édition La Découverte (BnF)");
  egal((S("livre2000")._sourcesLigne || []).includes("BnF"), true, "source BnF citée");
  egal(S("these").publisher, "Université Bordeaux 3", "thèse : université de soutenance (theses.fr)");
  egal(`${S("autre").city}|${S("autre").publisher}`, "|", "autre livre du même auteur : rien n’est repris");
  egal(`${S("ecrit").container}|${S("ecrit").issue}|${S("ecrit").pages}`, "Actes de la recherche|4|3-46", "ce que le chercheur a écrit n’est jamais remplacé");
  egal(`${S("simosi").type}|${S("simosi").container}|${S("simosi").volume}|${S("simosi").issue}|${S("simosi").publisher}`, "article|Argumentation|17|2|", "« in Argumentation » : article de revue, sans éditeur commercial");
  egal(d.querySelector("#biblio").textContent.includes("Complété en ligne (BnF)"), true, "la marque indique la source");
  const biblio = [...d.querySelectorAll("#biblio .entry .ref")].map(e => e.textContent).join("\n");
  egal(/Collection|Pratiques politiques|couv. ill|essai sur l’imagination politique dans l’Afrique contemporaine \(2e/.test(biblio), false, "rien d’autre que la bibliographie dans les entrées");
  egal(appels.every(a => /^https:\/\/(doi\.org|catalogue\.bnf\.fr|theses\.fr|api\.datacite\.org|api\.crossref\.org|api\.openalex\.org|openlibrary\.org|api\.archives-ouvertes\.fr)\//.test(a.url)), true, "seulement des services publics officiels, aucun relais tiers");
  errs.forEach(e => console.log("ÉCHEC " + e));
  console.log(errs.length ? `erreurs : ${errs.length}` : "erreurs : aucune");
  process.exit(errs.length ? 1 : 0);
})();
