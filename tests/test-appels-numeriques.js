// Appels numérotés [1], [3-5], (2) : chaque numéro appelé renvoie à l’entrée de la liste numérotée du document
// (Vancouver, IEEE). Seules les entrées appelées sont retenues, rédigées selon la norme choisie.
const {JSDOM} = require("jsdom");
const base = require("./charger")();
const E = require("../js/moteur.js");
const errs = [];
const egal = (o, a, q) => { if (o !== a) errs.push(`${q} : attendu ${JSON.stringify(a)}, obtenu ${JSON.stringify(o)}`); };
const wait = ms => new Promise(r => setTimeout(r, ms));
const st = s => E.stripHtml(E.STYLES.cames.bib(s)).replace(/[  ]/g, " ");

// 1. lecture des entrées numérotées
egal(st(E.parseEntreeNumerotee("Smith J, Jones K. Malaria in West Africa. Lancet. 2010;375(9714):45-50.")), "SMITH J. et JONES K., 2010, « Malaria in West Africa », Lancet, 375, 9714, p. 45-50.", "Vancouver, article");
egal(st(E.parseEntreeNumerotee("Bah M. Prévention du paludisme. Dakar: PUD; 2012.")), "BAH M., 2012, Prévention du paludisme, Dakar, PUD.", "Vancouver, livre");
egal(E.parseEntreeNumerotee("Doe R, Lee S, Kim T, Park J, et al. Vaccines. N Engl J Med. 2018 Mar;378:100-9.").pages, "100-109", "pages abrégées 100-9");
egal(E.parseEntreeNumerotee("Doe R, Lee S, Kim T, Park J, et al. Vaccines. N Engl J Med. 2018 Mar;378:100-9.").etAl, true, "et al. : tous les auteurs à écrire");
egal(st(E.parseEntreeNumerotee("J. Smith and K. Jones, \"Deep learning for malaria,\" IEEE Trans. Med. Imaging, vol. 12, no. 3, pp. 45-50, 2010.")), "SMITH J. et JONES K., 2010, « Deep learning for malaria », IEEE Trans. Med. Imaging, 12, 3, p. 45-50.", "IEEE, article");
egal(st(E.parseEntreeNumerotee("A. Diallo, Signal Processing. Abidjan: Presses Universitaires, 2016.")), "DIALLO A., 2016, Signal Processing, Abidjan, Presses Universitaires.", "IEEE, livre");

// 2. appels du texte
const corps = "Le paludisme reste endémique [1]. Plusieurs essais [3-5] et une revue (2) le confirment ; voir aussi [8].\n(1) premier point de méthode.\nUne date [1961] ne compte pas.";
const liste = "1. Smith J, Jones K. Malaria in West Africa. Lancet. 2010;375(9714):45-50.\n2. Kouassi A, Traoré B. Paludisme et\nécole. Rev Med Afr. 2015;12(3):10-18.\n3. WHO. World malaria report 2019. Geneva: WHO; 2019.\n4. Doe R. Vaccines. N Engl J Med. 2018;378:100-9.\n5. Bah M. Prévention du paludisme. Dakar: PUD; 2012.\n6. Koné X. Un titre jamais appelé. Rev Ivoir. 2001;1:1-2.";
const r = E.sourcesNumerotees(corps, liste);
egal(r.citees.map(e => e.n).join(","), "1,2,3,4,5", "numéros appelés : [1], (2), [3-5]");
egal(r.nonCitees.map(e => e.n).join(","), "6", "entrée jamais appelée");
egal(r.sansEntree.join(","), "8", "appel sans entrée dans la liste");
egal(r.citees[1].texte.includes("Paludisme et école"), true, "entrée sur deux lignes recollée");
// une bibliographie numérotée d’un texte « Auteur (année) » n’est pas une liste d’appels
egal(E.sourcesNumerotees("Comme l’a montré P. Bourdieu (1982), voir le point (2).", "1. BOURDIEU P., 1982, Ce que parler veut dire, Paris, Fayard.\n2. MBEMBE A., 2000, De la postcolonie, Paris, Karthala."), null, "texte auteur-date à liste numérotée");

// 3. parcours complet dans l’application
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
  const TEXTE = `Introduction\n${corps}\nRéférences\n${liste}`;
  await w.handleFiles([new w.File([TEXTE], "article.txt", {type: "text/plain"})]); await wait(300);
  const S = w.eval("state.sources");
  egal(S.map(s => s.authors[0].family).sort().join(","), "Bah,Doe,Kouassi,Smith,WHO", "les cinq entrées appelées, et seulement elles");
  const imp = w.eval('state.thread.find(m => m.kind === "import")');
  egal(imp && imp.gen && `${imp.gen.numerique}|${imp.gen.retenues}|${imp.gen.nonCitees}`, "true|5|1", "bilan de la génération");
  const fil = d.querySelector("#thread").textContent;
  egal(/appels numérotés/.test(fil), true, "le message parle d’appels numérotés");
  egal(/\[8\] est appelé dans le texte mais absent/.test(fil), true, "le numéro sans entrée est signalé");
  egal(appels.some(u => /raw_author_name|query\.author|search\.json\?author=[^&]*&limit=25/.test(decodeURIComponent(u))), false, "pas de recherche « Auteur (année) » parasite");
  await w.runAct({t: "noncitees", v: "article.txt"}); await wait(20);
  egal(w.eval("state.sources").some(s => s.authors[0].family === "Koné"), true, "« Ajouter quand même » reprend l’entrée non appelée");
  if(process.argv[2] === "detail") console.log(appels.map(decodeURIComponent).join("\n"));
  errs.forEach(e => console.log("ÉCHEC " + e));
  console.log(errs.length ? `erreurs : ${errs.length}` : "erreurs : aucune");
  process.exit(errs.length ? 1 : 0);
})();
