// Lecture des auteurs dans une référence rédigée : chaque cas est vérifié
const E = require('../js/moteur.js');
const cas = [
  ["Kouadio, Jean. 2019. Les médias ivoiriens et la crise. Abidjan : Éditions du CERAP.", "Kouadio/Jean"],
  ["Kouadio, Jean et Traoré, Awa. 2019. Les médias ivoiriens. Abidjan : CERAP.", "Kouadio/Jean|Traoré/Awa"],
  ["Kouadio, Jean, et Awa Traoré. 2019. Les médias ivoiriens. Abidjan : CERAP.", "Kouadio/Jean|Traoré/Awa"],
  ["Le Goff, Jacques. 1977. Pour un autre Moyen Âge. Paris : Gallimard.", "Le Goff/Jacques"],
  ["Bourdieu, Pierre, 1982, Ce que parler veut dire, Paris, Fayard.", "Bourdieu/Pierre"],
  ["N'Guessan, Kouamé. 2015. Langues et société. Abidjan : EDUCI.", "N'Guessan/Kouamé"],
  ["KOUADIO Jean et TRAORÉ Awa, 2019, Les médias ivoiriens, Abidjan, CERAP.", "Kouadio/Jean|Traoré/Awa"],
  ["AMIN Samir, 1996, Les Défis de la mondialisation, Paris, L'Harmattan.", "Amin/Samir"],
  ["BERGER, Gaston, 1967. L'Homme moderne et son éducation. Paris : PUF.", "Berger/Gaston"],
  ["Ostrom, E., Walker, J., & Gardner, R. (1992). Covenants with and without a sword. American Political Science Review, 86(2), 404–417.", "Ostrom/E.|Walker/J.|Gardner/R."],
];
let err = 0;
for (const [ligne, attendu] of cas) {
  const obtenu = E.parseRefHeuristic(ligne).authors.map(a => a.family + "/" + a.given).join("|");
  if (obtenu !== attendu) { err++; console.log("ÉCHEC :", ligne, "\n  attendu", attendu, "\n  obtenu ", obtenu); }
}
console.log(err ? `erreurs : ${err}` : "erreurs : aucune");
