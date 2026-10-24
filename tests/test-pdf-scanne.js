// Découpage du texte rendu par la reconnaissance de caractères (Tesseract) : texte réel obtenu
// le 2026-10-24 sur une page scannée. Tesseract met une ligne vide avant chaque ligne en retrait.
const E = require('../js/moteur.js');
const ocr = "BIBLIOGRAPHIE\n\nAMIN Samir, 1996, Les Défis de la mondialisation, Paris, L'Harmattan.\nBOURDIEU Pierre, 1982, Ce que parler veut dire, Paris, Fayard.\nCHARAUDEAU Patrick, 1997, Le discours d'information\n\nmédiatique, Paris, Nathan.\nDIAGNE Souleymane Bachir, 2003, « Islam et philosophie »,\n\nDiogène, n° 202, p. 145-151.\nKONÉ Aminata, 2021, Discours médiatique en Côte d'Ivoire,\n\nThèse de doctorat, Abidjan, Université Félix Houphouët-Boigny.\n\n\n";
const attendu = [
  "Amin|1996|book|Les Défis de la mondialisation|Paris|L'Harmattan",
  "Bourdieu|1982|book|Ce que parler veut dire|Paris|Fayard",
  "Charaudeau|1997|book|Le discours d'information médiatique|Paris|Nathan",
  "Diagne|2003|article|Islam et philosophie||",
  "Koné|2021|thesis|Discours médiatique en Côte d'Ivoire|Abidjan|Université Félix Houphouët-Boigny",
];
let err = 0;
const parts = E.splitReferences(E.findBibSection(ocr).section);
if (parts.length !== attendu.length) { err++; console.log("ÉCHEC : " + parts.length + " références au lieu de " + attendu.length, parts); }
parts.forEach((p, i) => {
  const s = E.parseRefHeuristic(p);
  const obtenu = [s.authors.map(a => a.family).join("/"), s.year, s.type, s.title, s.city, s.publisher].join("|");
  if (obtenu !== attendu[i]) { err++; console.log("ÉCHEC :", p, "\n  attendu", attendu[i], "\n  obtenu ", obtenu); }
});
const d = E.parseRefHeuristic(parts[3]);
if (d.container !== "Diogène" || d.issue !== "202" || d.pages !== "145-151") { err++; console.log("ÉCHEC Diagne :", d.container, d.issue, d.pages); }
// Références séparées par des lignes vides (paragraphes Word) : rien ne doit être recollé
const word = "AMIN Samir, 1996, Les Défis de la mondialisation, Paris, L'Harmattan.\n\nBOURDIEU Pierre, 1982, Ce que parler veut dire, Paris, Fayard\n\nKONÉ Aminata, 2021, Discours médiatique, Abidjan, PUCI.";
const w = E.splitReferences(word);
if (w.length !== 3) { err++; console.log("ÉCHEC paragraphes Word :", w); }
console.log(err ? `erreurs : ${err}` : "erreurs : aucune");
