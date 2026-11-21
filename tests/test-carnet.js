// Carnet de recherche, moteur : saisie, classement par partie, thèmes, recherche, doublons, paraphrases trop proches,
// couverture du plan, calendrier de lecture calé sur la rédaction, dossier de rédaction, exports.
const C = require("../js/carnet.js");
const errs = [];
const egal = (o, a, q) => { if(JSON.stringify(o) !== JSON.stringify(a)) errs.push(`${q} :\n    attendu ${JSON.stringify(a)}\n    obtenu  ${JSON.stringify(o)}`); };
const vrai = (v, q) => egal(!!v, true, q);

// ---------- saisie ----------
let a = C.analyserSaisie("« Le langage est un instrument de pouvoir » (Bourdieu, 1982, p. 60)");
egal([a.type, a.texte, a.page, a.auteur, a.annee], ["citation", "Le langage est un instrument de pouvoir", "60", "Bourdieu", "1982"], "citation avec appel et page");
a = C.analyserSaisie("citation la presse fabrique l’opinion page 12");
egal([a.type, a.texte, a.page], ["citation", "la presse fabrique l’opinion", "12"], "commande dictée « citation … page 12 »");
egal(C.analyserSaisie("Le sondage ne mesure pas l’opinion, il la fabrique (Yao, 2019, p. 12)").type, "paraphrase", "idée d’un auteur avec sa référence : paraphrase");
egal(C.analyserSaisie("Pourquoi la presse privée est-elle plus partisane ?").type, "question", "question");
egal(C.analyserSaisie("Habitus : système de dispositions durables et transposables").type, "definition", "définition");
egal(C.analyserSaisie("En 2020, 54 % des électeurs se sont abstenus").type, "donnee", "donnée chiffrée");
a = C.analyserSaisie("Comparer avec la presse ghanéenne #comparaison #presse_privée");
egal([a.type, a.themes], ["idee", ["comparaison", "presse privée"]], "idée avec mots-clés");
const sources = [
  {id: "s1", type: "book", title: "Ce que parler veut dire", year: "1982", authors: [{family: "Bourdieu", given: "Pierre"}]},
  {id: "s2", type: "article", title: "Presse et élections en Côte d’Ivoire", year: "2016", pages: "45-62", authors: [{family: "Koné", given: "Awa"}]},
  {id: "s3", type: "book", title: "Analyser les discours médiatiques", year: "2007", authors: [{family: "Charaudeau", given: "Patrick"}]},
  {id: "s4", type: "article", title: "Les sondages en Afrique", year: "2019", authors: [{family: "Yao", given: "Kouassi"}]}];
egal(C.lierSource({auteur: "Kone", annee: "2016"}, sources), "s2", "lien à la source sans accents");
egal(C.lierSource({auteur: "Inconnu", annee: "2001"}, sources), null, "auteur absent : pas de lien");
egal(C.decouperExtraits("« Premier extrait » p. 4\n\nDeuxième idée importante\n\n").map(x => [x.type, x.page]), [["citation", "4"], ["idee", ""]], "plusieurs extraits collés");

// ---------- plan ----------
const items = [
  {id: "p1", n: 1, t: "Introduction", r: "Problématique, hypothèses"},
  {id: "p2", n: 1, t: "1. Le discours partisan de la presse", r: "Polarisation des journaux"},
  {id: "p3", n: 2, t: "1.1. La presse privée et les partis", r: ""},
  {id: "p4", n: 1, t: "2. Les sondages et la fabrique de l’opinion", r: "Mesure de l’opinion publique"},
  {id: "p5", n: 1, t: "Conclusion", r: ""},
  {id: "p6", n: 1, t: "Références bibliographiques", r: "", sans: true}];
egal(C.chapitres(items).map(c => [c.id, c.nature, c.ids.length]), [["p1", "introduction", 1], ["p2", "corps", 2], ["p4", "corps", 1], ["p5", "conclusion", 1]], "chapitres : sous-partie rattachée, références exclues");
egal(C.ordreRedaction(C.chapitres(items)).map(c => c.id), ["p2", "p4", "p5", "p1"], "ordre de rédaction : corps, conclusion, introduction en dernier");
egal(C.sousObjectifsDuPlan(items, 30).map(s => [s.titre, s.pages_cibles]), [["Introduction", 3], ["1. Le discours partisan de la presse", 12], ["2. Les sondages et la fabrique de l’opinion", 12], ["Conclusion", 2]], "étapes de rédaction calées sur le plan");

// ---------- notes ----------
const N = [
  {id: "n1", type: "citation", texte: "Les journaux privés soutiennent ouvertement un parti politique pendant la campagne", source: "s2", page: "50", parties: ["p2"]},
  {id: "n2", type: "paraphrase", texte: "La presse privée ivoirienne est alignée sur les partis et polarise le débat", source: "s2", parties: ["p3"]},
  {id: "n3", type: "citation", texte: "Le sondage ne mesure pas l’opinion, il la fabrique", source: "s4", page: "12", parties: ["p4"]},
  {id: "n4", type: "definition", texte: "Opinion publique : agrégat des opinions individuelles mesurées par les sondages", source: "s4", parties: ["p4"], themes: ["opinion"]},
  {id: "n5", type: "idee", texte: "Les sondages publiés par les journaux partisans favorisent leur candidat", parties: []},
  {id: "n6", type: "citation", texte: "Le langage est un instrument de pouvoir", source: "s1", page: "60", parties: ["p1"]},
  {id: "n7", type: "resume", texte: "Charaudeau distingue l’information, la persuasion et la captation dans le discours des médias", source: "s3", parties: ["p2"]}];

let sug = C.suggererParties({id: "x", texte: "Les journaux partisans et la polarisation de la presse privée"}, items, N);
egal(sug[0] && sug[0].id === "p2" || sug[0].id === "p3", true, "classement : une note sur la presse partisane va dans la partie 1");
sug = C.suggererParties({id: "y", texte: "Les instituts de sondage et la mesure de l’opinion publique"}, items, N);
egal(sug[0].id, "p4", "classement : une note sur les sondages va dans la partie 2");
vrai(sug[0].sur, "classement net : proposé avec confiance");
vrai(!C.suggererParties({id: "z", texte: "Références bibliographiques"}, items, N).some(s => s.id === "p6"), "jamais dans les références");

const th = C.themesAuto([...N, {id: "n8", type: "idee", texte: "Les sondages commandés par la presse"}, {id: "n9", type: "idee", texte: "Opinion et sondages en période électorale"}]);
vrai(th.some(t => /sondage/.test(t.libelle)), "thème automatique « sondages »");
vrai(th.every(t => t.notes.length >= 2), "un thème regroupe au moins deux fiches");
vrai(C.themesTous(N)[0].perso && C.themesTous(N)[0].libelle === "opinion", "les mots-clés du chercheur passent en premier");

// ---------- recherche ----------
egal(C.rechercher(N, sources, "sondages").map(n => n.id).sort(), ["n3", "n4", "n5"], "recherche par racine (sondage/sondages), sans accent");
egal(C.rechercher(N, sources, "presse type:citation").map(n => n.id), ["n1"], "filtre type : « presse » trouvé dans le titre de la source");
egal(C.rechercher(N, sources, "journaux type:citation").map(n => n.id), ["n1"], "filtre type + mot");
egal(C.rechercher(N, sources, "auteur:Kone").map(n => n.id).sort(), ["n1", "n2"], "recherche par auteur de la source");
egal(C.rechercher(N, sources, "\"instrument de pouvoir\"").map(n => n.id), ["n6"], "expression exacte");
egal(C.rechercher(N, sources, "sondages -journaux").map(n => n.id).sort(), ["n3", "n4"], "exclusion d’un mot");
egal(C.rechercher(N, sources, "", {partie: "aucune"}).map(n => n.id), ["n5"], "fiches à classer");
egal(C.rechercher(N, sources, "#opinion").map(n => n.id).includes("n4"), true, "recherche par thème");

// ---------- liens ----------
egal(C.voisines(N[2], N).map(v => v.note.id)[0], "n4", "fiche voisine : même sujet");
egal(C.doublon({id: "d", texte: "Le langage est un instrument de pouvoir.", source: "s1"}, N), "n6", "doublon détecté");
egal(C.doublon({id: "d", texte: "Le langage est un instrument de pouvoir.", source: "s2"}, N), null, "même phrase, autre source : pas un doublon");
vrai(C.paraphraseTropProche("Selon Yao, le sondage ne mesure pas l’opinion mais la construit", [N[2]]), "paraphrase trop proche : 5 mots repris");
egal(C.paraphraseTropProche("Pour Yao, les enquêtes d’opinion construisent ce qu’elles prétendent observer", [N[2]]), null, "vraie paraphrase : acceptée");

// ---------- couverture ----------
const cov = C.couverture(items, N, {s2: {statut: "lue", parties: ["p2"]}, s3: {statut: "a_lire", parties: ["p2"]}});
egal(cov.map(c => c.id), ["p1", "p2", "p3", "p4", "p5"], "couverture : références exclues");
const c2 = cov.find(c => c.id === "p2");
egal([c2.fiches, c2.sources, c2.aLire, c2.etat], [2, 2, ["s3"], "en_cours"], "couverture de la partie 1");
egal(cov.find(c => c.id === "p5").etat, "vide", "conclusion sans fiche");

// ---------- calendrier ----------
const lectures = {s1: {statut: "a_lire", parties: ["p1"], priorite: 2}, s2: {statut: "en_cours", parties: ["p2"], page: 8, priorite: 1}, s3: {statut: "a_lire", parties: ["p2", "p4"]}, s4: {statut: "a_lire", parties: ["p4"], pages_total: 30}};
const objectif = {date_debut: "2026-12-07", date_fin: "2027-02-26", jours_travail: 31};
const cal = C.calendrier({items, lectures, sources, objectif, aujourdhui: "2026-11-23"});
const chp = id => cal.chapitres.find(c => c.id === id);
egal(cal.ordreRedaction, ["p2", "p4", "p5", "p1"], "calendrier : ordre de rédaction");
egal(chp("p2").rediger.du, "2026-12-07", "le premier chapitre rédigé commence avec l’objectif");
egal(chp("p2").lireAvant, "2026-12-06", "lire la partie 1 avant d’en commencer la rédaction");
vrai(chp("p1").lireAvant > chp("p4").lireAvant, "l’introduction, rédigée en dernier, peut être lue plus tard");
egal(cal.file.map(x => x.id).slice(0, 2), ["s2", "s3"], "file : la partie rédigée d’abord ; lecture en cours en tête");
egal(cal.file.find(x => x.id === "s2").reste, 10, "pages restantes : 18 pages (45-62) moins 8 lues");
vrai(cal.pagesParJour > 0 && cal.pagesParJour <= 40, "rythme raisonnable");
vrai(cal.file.filter(x => x.chapitre === "p2").every(x => x.aTemps), "les lectures de la partie 1 sont finies à temps");
const jour = C.lectureDuJour(cal);
egal(jour[0].id, "s2", "lecture du jour : celle en cours");
vrai(jour.reduce((s, x) => s + x.pages, 0) <= cal.pagesParJour, "lecture du jour : pas plus que le rythme");
const sansObj = C.calendrier({items, lectures, sources, objectif: null, aujourdhui: "2026-11-23"});
egal(sansObj.chapitres[0].lireAvant, "2027-01-04", "sans objectif : 6 semaines pour lire");
const serre = C.calendrier({items, lectures: {s1: {statut: "a_lire", parties: ["p2"], pages_total: 900}}, sources, objectif: {date_debut: "2026-11-24", date_fin: "2026-12-30", jours_travail: 31}, aujourdhui: "2026-11-23"});
egal(serre.alerte, "trop", "trop de pages avant la rédaction : signalé");

// ---------- vers la rédaction ----------
const N2 = N.map(n => n.id === "n7" ? {...n, ordre: {p2: 0}} : n.id === "n1" ? {...n, ordre: {p2: 1}} : n);
egal(C.dossier("p2", N2).map(n => n.id), ["n7", "n1"], "dossier de la partie dans l’ordre choisi");
egal(C.insertion(N[0], "(Koné, 2016, p. 50)"), "« Les journaux privés soutiennent ouvertement un parti politique pendant la campagne » (Koné, 2016, p. 50)", "citation insérée avec guillemets et appel");
egal(C.insertion(N[1], "(Koné, 2016)"), "La presse privée ivoirienne est alignée sur les partis et polarise le débat (Koné, 2016).", "paraphrase insérée avec appel");
egal(C.insertion(N[4], ""), N[4].texte, "idée personnelle : telle quelle");
const v = C.verifications(N.filter(n => n.id !== "n7"),{s3: {statut: "lue"}, s1: {statut: "lue"}}, sources, "Comme le montre Charaudeau (2007), ... Yao (2019)");
egal([v.luesSansFiche, v.sansSource], [["s3"], []], "vérifications : lue sans fiche");
egal(C.verifications([], {}, sources, "Charaudeau (2007)").citeesSansFiche, ["s3"], "vérifications : citée sans fiche");

// ---------- exports et suivi ----------
const lib = {fiches: "Fiches", lectures: "Lectures", parties: "Parties", oui: "oui", entetes_fiches: ["Type", "Fiche", "Source", "Page", "Parties", "Thèmes", "Commentaire", "Utilisée", "Date"], entetes_lectures: ["Source", "Statut", "Page", "Pages", "Parties", "Question", "Fiches"], entetes_parties: ["Partie", "Fiches", "Sources", "À lire", "État", "Utilisées"], types: {citation: "Citation"}, statuts: {lue: "Lue"}, etats: {vide: "Vide", mince: "Mince", en_cours: "En cours", prete: "Prête"}};
const cl = C.classeur({notes: N, lectures}, items, sources, s => s.authors[0].family + " " + s.year, lib);
egal(cl.map(f => [f.nom, f.lignes.length]), [["Fiches", 8], ["Lectures", 5], ["Parties", 6]], "classeur : 3 feuilles");
egal(cl[0].lignes[1].slice(0, 5), ["Citation", N[0].texte, "Koné 2016", "50", "1. Le discours partisan de la presse"], "ligne de fiche");
const b = C.bilanLecture([{date: "2026-11-21", pages: 10}, {date: "2026-11-22", pages: 5}, {date: "2026-11-23", pages: 12}, {date: "2026-11-19", pages: 3}], "2026-11-23");
egal([b.aujourdhui, b.serie, b.semaine], [12, 3, 30], "suivi de lecture : série de 3 jours");
egal(C.bilanLecture([{date: "2026-11-22", pages: 5}], "2026-11-23").serie, 1, "série gardée tant que la journée n’est pas finie");

errs.forEach(e => console.log("ÉCHEC " + e));
console.log(errs.length ? `erreurs : ${errs.length}` : "erreurs : aucune");
process.exit(errs.length ? 1 : 0);
