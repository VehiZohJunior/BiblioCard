// Générer la bibliographie = partir des citations du texte, pas recopier la liste du document (exigence du 2026-10-26).
// Une référence de la liste jamais citée n’est pas reprise ; une œuvre citée absente de la liste est cherchée en ligne.
const {JSDOM} = require("jsdom");
const base = require("./charger")();
const errs = [];
const egal = (o, a, q) => { if (o !== a) errs.push(`${q} : attendu ${JSON.stringify(a)}, obtenu ${JSON.stringify(o)}`); };
const wait = ms => new Promise(r => setTimeout(r, ms));
const TEXTE = `Introduction
La presse ivoirienne a fait l’objet de nombreuses analyses. Comme l’a montré P. Bourdieu (1982, p. 64), le langage est un instrument de pouvoir symbolique dans le champ politique. A. Mbembe (2000) a décrit la postcolonie et ses formes de domination. Enfin, T. A. van Dijk (2008) insiste sur le contrôle du discours par les élites, qui exercent un pouvoir sur les médias et l’opinion publique.
Conclusion
Ces travaux éclairent notre corpus.
Références bibliographiques
BOURDIEU Pierre, 1982, Ce que parler veut dire. L’économie des échanges linguistiques, Paris, Fayard.
KONÉ Aminata, 2015, La presse écrite en Côte d’Ivoire, Abidjan, EDUCI.
MBEMBE Achille, 2000, De la postcolonie. Essai sur l’imagination politique dans l’Afrique contemporaine, Paris, Karthala.`;
(async () => {
  const appels = [];
  const dom = new JSDOM(base, {runScripts: "dangerously", pretendToBeVisual: true, url: "https://bibliocard.pages.dev/", beforeParse(w){
    w.fetch = async url => { appels.push(String(url)); return {ok: true, status: 200, json: async () => ({results: [], docs: [], message: {items: []}, response: {docs: []}})}; };
  }});
  const w = dom.window, d = w.document;
  w.HTMLDialogElement.prototype.showModal = function(){ this.open = true; }; w.HTMLDialogElement.prototype.close = function(){ this.open = false; };
  w.addEventListener("error", e => errs.push(e.message));
  await wait(300);
  d.querySelector('#uiLangSeg [data-l="fr"]').click(); await wait(20);
  await w.handleFiles([new w.File([TEXTE], "memoire.txt", {type: "text/plain"})]); await wait(300);
  const S = w.eval("state.sources");
  egal(S.map(s => s.authors[0].family).sort().join(","), "Bourdieu,Mbembe", "seules les sources citées sont reprises");
  egal(S.find(s => s.authors[0].family === "Mbembe").publisher, "Karthala", "champs extraits de la liste du document");
  const imp = w.eval('state.thread.find(m => m.kind === "import")');
  egal(imp && imp.gen && `${imp.gen.citations}|${imp.gen.retenues}|${imp.gen.nonCitees}|${imp.gen.aChercher}`, "3|2|1|1", "bilan : 3 citations, 2 retenues, 1 non citée, 1 à chercher");
  egal(/nulle part dans le texte/.test(d.querySelector("#thread").textContent), true, "la référence non citée est signalée");
  egal(appels.some(u => /openalex|openlibrary|crossref/.test(u) && /dijk/i.test(decodeURIComponent(u))), true, "l’œuvre citée absente de la liste est cherchée en ligne");
  egal(!!w.eval('state.thread.find(m => m.kind === "propositions")'), true, "propositions affichées pour l’œuvre manquante");
  // l’utilisateur peut quand même reprendre la référence non citée
  await w.runAct({t: "noncitees", v: "memoire.txt"}); await wait(20);
  egal(w.eval("state.sources").some(s => s.authors[0].family === "Koné"), true, "« Ajouter quand même » reprend la non citée");
  console.log(errs.length ? errs.join("\n") + `\nerreurs : ${errs.length}` : "erreurs : aucune");
})();
