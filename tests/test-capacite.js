// Capacité : une thèse peut citer 300 à 500 sources (exigence du 2026-10-27). SCIENTUS doit toutes les servir,
// avec ou sans liste de références dans le document, sans saturer la mémoire ni figer l’écran, et reprendre
// la recherche en ligne interrompue par une coupure.
const {JSDOM} = require("jsdom");
const base = require("./charger")();
const errs = [];
const egal = (o, a, q) => { if (o !== a) errs.push(`${q} : attendu ${JSON.stringify(a)}, obtenu ${JSON.stringify(o)}`); };
const wait = ms => new Promise(r => setTimeout(r, ms));
const SYL = ["ba","ko","di","ma","sa","to","nu","le","ri","po","ga","fe","mi","zo","ka","ye","lu","do","ne","vi"];
const nom = i => { const s = SYL[i % 20] + SYL[Math.floor(i / 20) % 20] + SYL[Math.floor(i / 400) % 20] + "n"; return s[0].toUpperCase() + s.slice(1); };
const an = i => 1950 + (i % 70);
const N = 500;
let corps = "Introduction\n";
for(let i = 0; i < N; i++) corps += (i % 2 ? `Comme l’a montré A. ${nom(i)} (${an(i)}, p. ${i + 1}), la question reste ouverte dans ce champ. ` : `Cette thèse est discutée dans la littérature (${nom(i)}, ${an(i)}). `) + (i % 5 === 4 ? "\n" : "");
let liste = "\nRéférences bibliographiques\n";
for(let i = 0; i < N; i++) liste += `${nom(i).toUpperCase()} Aminata, ${an(i)}, Titre de l’ouvrage numéro ${i + 1} sur la société, Abidjan, EDUCI.\n`;
const vide = {results: [], docs: [], message: {items: []}, response: {docs: []}};
async function ouvrir(reponse){
  const dom = new JSDOM(base, {runScripts: "dangerously", pretendToBeVisual: true, url: "https://bibliocard.pages.dev/", beforeParse(w){
    w.fetch = async url => { await wait(2); return reponse(String(url)); };
  }});
  const w = dom.window; w.scrollTo = () => {};
  w.HTMLDialogElement.prototype.showModal = function(){ this.open = true; }; w.HTMLDialogElement.prototype.close = function(){ this.open = false; };
  w.addEventListener("error", e => errs.push(e.message));
  await wait(300); w.document.querySelector('#uiLangSeg [data-l="fr"]').click(); await wait(20);
  return w;
}
(async () => {
  // 1. 500 sources citées, toutes dans la liste du document
  let w = await ouvrir(() => ({ok: true, status: 200, json: async () => vide}));
  egal(w.eval("findCitations")(corps).length, N, "500 citations lues dans le texte");
  let t0 = Date.now();
  await w.handleFiles([new w.File([corps + liste], "these.txt", {type: "text/plain"})]);
  egal(w.eval("state.sources.length"), N, "500 sources retenues depuis la liste du document");
  egal(w.document.querySelectorAll("#bibList li, .entry").length >= N, true, "les 500 entrées affichées");
  if(Date.now() - t0 > 60000) errs.push(`liste de 500 : trop lent (${Math.round((Date.now() - t0) / 1000)} s)`);
  t0 = Date.now(); w.eval("renderAll()"); if(Date.now() - t0 > 3000) errs.push(`affichage de 500 sources : trop lent (${Date.now() - t0} ms)`);

  // 2. 500 sources citées, aucune liste : chacune a son entrée, cherchée en ligne
  w = await ouvrir(() => ({ok: true, status: 200, json: async () => vide}));
  t0 = Date.now();
  await w.handleFiles([new w.File([corps], "these.txt", {type: "text/plain"})]);
  egal(w.eval("state.sources.length"), N, "500 entrées créées depuis les seules citations");
  egal(w.eval("state.sources.filter(s => s._cite).length"), 0, "toutes les recherches terminées");
  if(Date.now() - t0 > 120000) errs.push(`500 recherches : trop lent (${Math.round((Date.now() - t0) / 1000)} s)`);
  const m = w.eval('state.thread.find(m => m.kind === "propositions")');
  egal(m && m.total, N, "le bilan compte les 500 œuvres");
  egal(w.document.querySelectorAll(".props .prop").length <= 60, true, "au plus 60 cartes dans le message");

  // 3. coupure : les entrées existent quand même et la recherche reprend ensuite
  let enLigne = false;
  w = await ouvrir(u => { if(!enLigne) throw new Error("hors ligne");
    const oa = /openalex\.org\/works\?filter=.*raw_author_name\.search:([^&]+)/.exec(decodeURIComponent(u));
    const res = oa ? [{display_name: `Œuvre de ${oa[1]}`, publication_year: 1990, authorships: [{author: {display_name: `Awa ${oa[1]}`}}], type: "book", cited_by_count: 40}] : [];
    return {ok: true, status: 200, json: async () => ({...vide, results: res})}; });
  const petit = "Introduction\nComme l’a montré A. Kobaman (1990), la presse est un champ. A. Dikoman (1991) le confirme (Masoman, 1992).";
  await w.handleFiles([new w.File([petit], "chap.txt", {type: "text/plain"})]);
  egal(w.eval("state.sources.length"), 3, "hors ligne : les 3 œuvres citées ont leur entrée");
  egal(w.eval("state.sources.filter(s => s._cite).length"), 3, "hors ligne : leur recherche est mise de côté");
  enLigne = true;
  await w.eval("construireBiblio(null, true)");
  egal(w.eval("state.sources.filter(s => s._cite).length"), 0, "connexion revenue : la recherche reprend et se termine");
  egal(w.eval("state.sources.map(s => s.title).sort().join(' | ')"), "Œuvre de Dikoman | Œuvre de Kobaman | Œuvre de Masoman", "les entrées provisoires sont remplacées par les œuvres trouvées");
  egal(w.eval("state.sources.length"), 3, "aucun doublon après la reprise");

  errs.forEach(e => console.log("ÉCHEC " + e));
  console.log(errs.length ? `erreurs : ${errs.length}` : "erreurs : aucune");
  process.exit(errs.length ? 1 : 0);
})();
