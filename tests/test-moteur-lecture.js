// Test unitaire du moteur
const E = require('../js/moteur.js');
const doc = `Table des matières
Introduction ........ 3
Bibliographie ........ 210

Introduction
Comme l’écrit S. Amin (1996, p. 12), la mondialisation est un défi. Selon (S. B. Diagne, 2003, p. 147) et (Ostrom et al., 1992). Voir aussi M. Ascher (1998, p. 223).

Bibliographie
AMIN Samir, 1996, ⟦Les Défis de la mondialisation⟧, Paris, L’Harmattan.
BERGER Gaston, 1967, ⟦L’Homme moderne et son
éducation⟧, Paris, PUF.
DIAGNE Souleymane Bachir, 2003, « Islam et philosophie. Leçons d’une rencontre », ⟦Diogène⟧, n° 202, p. 145-151.
Ostrom, E., Walker, J., & Gardner, R. (1992). Covenants with and without a sword. ⟦American Political Science Review⟧, 86(2), 404–417.
KONÉ Aminata, 2021, ⟦Discours médiatique en Côte d’Ivoire⟧, Thèse de doctorat, Abidjan, Université Félix Houphouët-Boigny.

Annexes
Annexe 1 : questionnaire 2020`;
const sec = E.findBibSection(doc);
console.log("body ends:", JSON.stringify(sec.body.slice(-60)));
const refs = E.splitReferences(sec.section);
console.log(refs.length, "refs"); refs.forEach(r => console.log(" -", r));
const parsed = refs.map(E.parseRefHeuristic);
parsed.forEach(s => console.log(s.type, "|", s.authors.map(a=>a.family).join("/"), "|", s.year, "|", s.title, "|", s.container, "|", s.city, "|", s.publisher));
const L = E.withLabels(E.sortSources(parsed), true);
console.log("\nCAMES:"); L.forEach(s => console.log(E.stripHtml(E.STYLES.cames.bib(s,{upper:true}))));
const r = E.verify(E.stripMarks(sec.body), L);
console.log("\nok", r.ok.length, "missing", r.missing.map(x=>x.c.raw), "unused", r.unused.map(s=>s.authors[0].family));
// PDF-like (pas de lignes vides, retours à la ligne)
const pdf = `Références bibliographiques
AMIN Samir, 1996, Les Défis de la mondialisation, Paris,
L’Harmattan.
BERGER Gaston, 1967, L’Homme moderne et son éducation,
Paris, PUF.
DIAKITE Sidiki, 1985, Violence technologique et dévelop-
pement, Paris, L’Harmattan.`;
console.log("\nPDF:"); E.splitReferences(E.findBibSection(pdf).section).forEach(r=>console.log(" -", r));

console.log("erreurs: aucune");
