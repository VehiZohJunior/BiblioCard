// Verdict d’existence, avec les candidats réellement renvoyés par OpenAlex le 2026-10-24
const E = require('../js/moteur.js');
const ref = (family, year, title) => Object.assign(E.blank(), {authors: [{family, given: ""}], year, title});
const cas = [
  // titre cité sans son sous-titre : même œuvre
  [ref("Ostrom", "1992", "Covenants with and without a sword"),
   [{title: "Covenants with and without a Sword: Self-Governance Is Possible", year: 1992, authors: ["Elinor Ostrom B", "James M. Walker", "Roy Gardner"]}], "found"],
  // même titre, autre auteur, autre année : ce n’est pas la référence citée
  [ref("Amin", "1996", "Les Défis de la mondialisation"),
   [{title: "Les défis de la mondialisation", year: 2006, authors: ["B Henry"]}], "none"],
  // titre voisin, autre auteur, autre année
  [ref("Koné", "2021", "Discours médiatique en Côte d’Ivoire"),
   [{title: "La « titrologie » en Côte d’Ivoire. Discours médiatique et perpétuation des antagonismes politiques", year: 2016, authors: ["Nanourougo Coulibaly"]}], "none"],
  // même auteur, titre légèrement différent : proche
  [ref("Berger", "1967", "L’Homme moderne et son éducation"),
   [{title: "L'homme moderne et son éducation", year: 1962, authors: ["Gaston Berger", "Gilbert Varet"]}], "found"],
  [ref("Bourdieu", "1982", "Ce que parler veut dire : l’économie des échanges"),
   [{title: "Ce que parler veut dire", year: 1981, authors: ["Pierre Bourdieu"]}], "found"],
  [ref("Bourdieu", "1982", "Ce que parler veut dire des échanges sociaux"),
   [{title: "Ce que parler veut dire : économie des échanges linguistiques", year: 1982, authors: ["Pierre Bourdieu"]}], "close"],
  // titre trop court pour conclure sur l’inclusion seule
  [ref("Yao", "2020", "La presse"),
   [{title: "La presse ivoirienne et le pouvoir", year: 2020, authors: ["Awa Koné"]}], "none"],
];
let err = 0;
cas.forEach(([s, cands, attendu]) => {
  const v = E.judge(s, cands).v;
  if (v !== attendu) { err++; console.log("ÉCHEC :", s.authors[0].family, s.title, "→", v, "au lieu de", attendu); }
});
console.log(err ? `erreurs : ${err}` : "erreurs : aucune");
