// La bibliographie générée ne contient QUE des références (exigence du 2026-10-27) : jamais un résumé, un abstract,
// des mots clés, une page de garde, une dédicace, des sigles, un intertitre, un en-tête ou un numéro de page,
// une mention d’imprimeur, une ligne d’annexe, de questionnaire ou de table des matières, ni un passage rédigé.
const {JSDOM} = require("jsdom");
const base = require("./charger")();
const E = require("../js/moteur.js");
const P = require("./corpus-pieges-bibliographie.js");
const errs = [];
const egal = (o, a, q) => { if (o !== a) errs.push(`${q} :\n    attendu ${JSON.stringify(a)}\n    obtenu  ${JSON.stringify(o)}`); };
const wait = ms => new Promise(r => setTimeout(r, ms));
// rien de tout cela ne peut apparaître dans une entrée de bibliographie
const INTERDIT = /r[ée]sum[ée]|abstract|mots[- ]cl[ée]s|keywords|d[ée]dicace|sigles|annexe|appendix|questionnaire|table des mati|sommaire|introduction la|conclusion ces|universit[ée] f[ée]lix|ann[ée]e universitaire|sous la direction|pr[ée]sent[ée] par|page \d+ sur|printed in|all rights reserved|m[ée]moire de master –|\.{4}|\bI\. Ouvrages|II\. Articles|ce m[ée]moire analyse|this dissertation/i;

const THESE_EN = `ACKNOWLEDGEMENTS
I thank my supervisor, who guided me since 2019.

CHAPTER ONE
Hyperbole is central in political speech (Claridge, 2011). As Fairclough (1989) shows, language and power are linked. Toulmin (2003) proposes a model of argument.
Page 14

REFERENCES
Books
CLARIDGE Claudia, 2011, Hyperbole in English. A Corpus-Based Study of Exaggeration, Cambridge, Cambridge University Press.
FAIRCLOUGH Norman, 1989, Language and Power, London, Longman.
Web sources
TOULMIN Stephen, 2003, The Uses of Argument, Cambridge, Cambridge University Press.

ABSTRACT
This dissertation studies hyperbole in political speeches delivered between 2010 and 2020 and shows that it is a strategy.
Keywords: hyperbole, argumentation, 2020.

APPENDIX
Appendix 1: Interview guide (2021)
1. SMITH John, 2020, do you read the press? Yes, No.`;

const WEBO = `Introduction
Les réseaux sociaux transforment la presse (Koné, 2020). Le numérique progresse (Traoré, 2022).

BIBLIOGRAPHIE
KONÉ Aminata, 2020, Discours médiatique en Côte d’Ivoire, Abidjan, EDUCI.
WEBOGRAPHIE
TRAORÉ Moussa, 2022, « Le numérique dans les universités africaines », Le Monde Afrique, https://www.lemonde.fr/afrique/article/2022/03/12/numerique.html, consulté le 12 mars 2023.

TABLE DES MATIÈRES
INTRODUCTION .......... 3
BIBLIOGRAPHIE .......... 40`;

const NUMEROTE = `Introduction
Le paludisme reste endémique [1]. Plusieurs essais le confirment [2, 3].

Références
1. Smith J, Jones K. Malaria in West Africa. Lancet. 2010;375(9714):45-50.
2. Kouassi A, Traoré B. Paludisme et école. Rev Med Afr. 2015;12(3):10-18.
3. Bah M. Prévention du paludisme. Dakar: PUD; 2012.

Annexes
Annexe 1 : Fiche d’enquête (2019)
1. Avez-vous dormi sous une moustiquaire en 2019 ? Oui, Non.`;

// une liste collée seule, avec des lignes parasites (titre, consigne, numéro de page)
const LISTE_COLLEE = `Ma bibliographie à mettre en forme
BOURDIEU Pierre, 1982, Ce que parler veut dire, Paris, Fayard.
MBEMBE Achille, 2000, De la postcolonie, Paris, Karthala.
12
KI-ZERBO Joseph, 1972, Histoire de l’Afrique noire, Paris, Hatier.
DIOP Cheikh Anta, 1954, Nations nègres et culture, Paris, Présence africaine.`;

// 1. le moteur : la section bibliographie s’arrête au résumé, aux annexes, à la table des matières
const sec = E.findBibSection(P.texte);
egal(E.splitReferences(sec.section).length, 6, "mémoire piège : six références dans la section, rien d’autre");
egal(E.splitReferences(sec.section).some(r => INTERDIT.test(r)), false, "mémoire piège : la section ne contient ni intertitre, ni en-tête, ni résumé, ni annexe");
egal(E.splitReferences(E.findBibSection(THESE_EN).section).length, 3, "thèse en anglais : la section s’arrête à l’abstract");
egal(E.estFicheBibliographique(Object.assign(E.blank(), {authors: [{family: "Mbembe", given: "A."}], year: "2000", title: "est-il cité dans vos cours ? Oui, Non."})), false, "une question de questionnaire n’est pas un titre");
egal(E.estFicheBibliographique(Object.assign(E.blank(), {authors: [{family: "INTRODUCTION La presse", given: ""}], year: "2000", title: "a fait l’objet de nombreuses analyses"})), false, "un intertitre n’est pas un auteur");
egal(E.estFicheBibliographique(Object.assign(E.blank(), {authors: [{family: "Beaugrande", given: "R."}], year: "1994", title: "Introduction to Text Linguistics"})), true, "« Introduction to… » reste un vrai titre");

(async () => {
  const dom = new JSDOM(base, {runScripts: "dangerously", pretendToBeVisual: true, url: "https://bibliocard.pages.dev/", beforeParse(w){
    w.fetch = async () => ({ok: true, status: 200, json: async () => ({results: [], docs: [], message: {items: []}, response: {docs: []}})}); }});
  const w = dom.window, d = w.document; w.scrollTo = () => {};
  w.HTMLDialogElement.prototype.showModal = function(){ this.open = true; }; w.HTMLDialogElement.prototype.close = function(){ this.open = false; };
  w.addEventListener("error", e => errs.push(e.message));
  await wait(300); d.querySelector('#uiLangSeg [data-l="fr"]').click(); await wait(20);
  const entrees = () => [...d.querySelectorAll("#biblio .entry .ref")].map(e => e.textContent);
  const essai = async (texte, nom, attendus) => {
    w.eval("state.sources = []; state.thread = []; ui.files = [];");
    await w.handleFiles([new w.File([texte], nom, {type: "text/plain"})]); await wait(300);
    const L = entrees();
    egal(L.length, attendus.length, `${nom} : nombre d’entrées`);
    attendus.forEach(a => { if(!L.some(l => l.startsWith(a))) errs.push(`${nom} : entrée manquante « ${a}… »\n    obtenu ${JSON.stringify(L)}`); });
    L.filter(l => INTERDIT.test(l)).forEach(l => errs.push(`${nom} : entrée qui n’est pas une référence : ${l}`));
    return L;
  };
  await essai(P.texte, "memoire-piege.txt", ["BOURDIEU Pierre, 1982", "DIAKITÉ Sidiki, 1985", "FOWLER Roger", "MBEMBE Achille, 2000,", "UNESCO, 2015"]);
  // l’export Word : un titre, puis une référence par paragraphe, et rien d’autre
  let html = ""; w.saveWord = (b, h) => { html = h; };
  w.downloadWord();
  const corps = (html.match(/<body[^>]*>([\s\S]*)<\/body>/) || [])[1] || "";
  const blocs = [...corps.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map(m => m[1].replace(/<[^>]+>/g, ""));
  egal(blocs.length, 6, "Word : le titre et les cinq références");
  egal(blocs[0], "Références bibliographiques", "Word : le seul titre");
  egal(corps.replace(/<p[^>]*>[\s\S]*?<\/p>/g, "").trim(), "", "Word : aucun autre contenu");
  egal(blocs.slice(1).some(b => INTERDIT.test(b)), false, "Word : aucune ligne qui ne soit une référence");

  await essai(THESE_EN, "these-en.txt", ["CLARIDGE Claudia, 2011", "FAIRCLOUGH Norman, 1989", "TOULMIN Stephen, 2003"]);
  await essai(WEBO, "webographie.txt", ["KONÉ Aminata, 2020", "TRAORÉ Moussa, 2022"]);
  await essai(NUMEROTE, "article-numerote.txt", ["SMITH J. et JONES K., 2010", "KOUASSI A. et TRAORÉ B., 2015", "BAH M., 2012"]);
  await essai(LISTE_COLLEE, "liste.txt", ["BOURDIEU Pierre, 1982", "DIOP Cheikh Anta, 1954", "KI-ZERBO Joseph, 1972", "MBEMBE Achille, 2000"]);

  errs.forEach(e => console.log("ÉCHEC " + e));
  console.log(errs.length ? `erreurs : ${errs.length}` : "erreurs : aucune");
  process.exit(errs.length ? 1 : 0);
})();
