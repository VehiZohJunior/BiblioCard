// Conformité au document officiel « Normes d’édition des revues de LSH dans le système CAMES »
// (NORCAMES/LSH) : ses exemples, recopiés tels quels, doivent ressortir à l’identique.
const E = require('../js/moteur.js');
let err = 0;
const txt = h => E.stripHtml(h).replace(/ /g, " ");
const egal = (obtenu, attendu, quoi) => { if (obtenu !== attendu) { err++; console.log(`ÉCHEC ${quoi}\n  attendu ${attendu}\n  obtenu  ${obtenu}`); } };

// 1. Exemples de la liste « Références bibliographiques » du document (classés par ordre alphabétique)
// (exemple Diagne : numéro nu, « Diogène, 202 », comme dans NORCAMES/LSH 2016 et les Normes de présentation CAMES)
const officiels = [
  "AMIN Samir, 1996, Les Défis de la mondialisation, Paris, L’Harmattan.",
  "AUDARD Catherine, 2009, Qu’est-ce que le libéralisme ? Ethique, politique, société, Paris, Gallimard.",
  "BERGER Gaston, 1967, L’Homme moderne et son éducation, Paris, PUF.",
  "DIAGNE Souleymane Bachir, 2003, « Islam et philosophie. Leçons d’une rencontre », Diogène, 202, p. 145-151.",
  "DIAKITE Sidiki, 1985, Violence technologique et développement. La question africaine du développement, Paris, L’Harmattan.",
];
const melange = [officiels[3], officiels[0], officiels[4], officiels[2], officiels[1]];
const L = E.withLabels(E.sortSources(melange.map(E.parseRefHeuristic)), true);
L.forEach((s, i) => egal(txt(E.STYLES.cames.bib(s)), officiels[i], `exemple ${i + 1}`));

// 2. Zone titre : italique pour l’ouvrage, guillemets pour l’article ; traduction et réédition après le titre
const audard = L[1];
egal(audard.title, "Qu’est-ce que le libéralisme ? Ethique, politique, société", "titre avec virgules");
if (!/<i>Qu’est-ce que le libéralisme/.test(E.STYLES.cames.bib(audard))) { err++; console.log("ÉCHEC titre d’ouvrage non italique"); }
if (/<i>/.test(E.STYLES.cames.bib(L[3]).split("»")[0])) { err++; console.log("ÉCHEC titre d’article en italique"); }
const fanon = E.parseRefHeuristic("FANON Frantz, 2011, Les Damnés de la terre, 3e éd., Paris, La Découverte.");
egal(fanon.edition + " | " + fanon.title, "3e éd. | Les Damnés de la terre", "réédition");
const said = E.parseRefHeuristic("SAID Edward W., 2005, L’Orientalisme, trad. Catherine Malamoud, Paris, Seuil.");
egal(said.translator + " | " + said.title, "Catherine Malamoud | L’Orientalisme", "traduction");
egal(txt(E.STYLES.cames.bib(said)), "SAID Edward W., 2005, L’Orientalisme, trad. Catherine Malamoud, Paris, Seuil.", "sortie traduction");

// 3. Références de citation : « (S. Diakité, 1985, p. 105) » et « M. Ascher (1998, p. 223) »
const diakite = L[4];
diakite.authors[0].family = "Diakité";
egal(txt(E.STYLES.cames.cite(diakite, "105")), "(S. Diakité, 1985, p. 105)", "citation entre parenthèses");
const ascher = E.parseRefHeuristic("ASCHER Marcia, 1998, Mathématiques d’ailleurs, Paris, Seuil.");
egal(txt(E.STYLES.cames.cite(ascher, "223", "narratif")), "M. Ascher (1998, p. 223)", "citation dans la phrase");

// 4. Contrôle : citations sans initiale du prénom
const biblio = E.withLabels([diakite, ascher, E.parseRefHeuristic("UNESCO, 2022, Rapport mondial sur l’éducation, Paris, UNESCO.")], true);
const texte = "Comme le dit M. Ascher (1998, p. 223), puis (S. Diakité, 1985, p. 105). Mais Ascher (1998) insiste, et (Diakité, 1985) aussi. Voir (UNESCO, 2022).";
const r = E.verify(texte, biblio);
egal(r.noInitial.map(x => x.c.rawNoInitial).sort().join(" | "), "Ascher (1998 | Diakité, 1985", "citations sans initiale");
egal(String(r.ok.length + r.yearOff.length), "3", "auteurs cités rattachés (Ascher, Diakité, UNESCO)");

// 5. Une liste de références dans le texte (éditorial d’un numéro de revue) n’est pas une suite de citations
const liste = "Références\nDIOP, Cheikh Anta (1954). Nations nègres et culture.\nSAID, Edward (1978). Orientalism.\nUsing C.\nShannon’s (1948) information theory.";
egal(E.findCitations(liste).map(c => c.family + " " + c.year + " " + c.raw).join(" | "), "Shannon 1948 C. Shannon’s (1948", "liste de références ignorée, citation gardée sur une seule ligne");

// 6. « Normes de présentation CAMES » : volume et numéro nus après la revue, dans cet ordre
const diagne2 = E.parseRefHeuristic("DIAGNE Souleymane Bachir, 2003, « Islam et philosophie. Leçons d’une rencontre », Diogène, 202, 4, p. 145-151.");
egal(diagne2.volume + " | " + diagne2.issue, "202 | 4", "volume et numéro nus lus");
egal(txt(E.STYLES.cames.bib(diagne2)), "DIAGNE Souleymane Bachir, 2003, « Islam et philosophie. Leçons d’une rencontre », Diogène, 202, 4, p. 145-151.", "exemple officiel des Normes de présentation");
const avecVol = E.parseRefHeuristic("KOUADIO Jean, 2019, « La presse ivoirienne », Revue ivoirienne de communication, vol. 8, n° 2, p. 11-30.");
egal(txt(E.STYLES.cames.bib(avecVol)), "KOUADIO Jean, 2019, « La presse ivoirienne », Revue ivoirienne de communication, 8, 2, p. 11-30.", "« vol. » et « n° » ramenés à la forme CAMES");
console.log(err ? `erreurs : ${err}` : "erreurs : aucune");
