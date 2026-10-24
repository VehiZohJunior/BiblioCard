// Reconstitution du texte d’un PDF (pdfPagesToText) à partir des morceaux de texte de pdf.js
const E = require('../js/moteur.js');
let err = 0;
const egal = (o, a, q) => { if (o !== a) { err++; console.log(`ÉCHEC ${q}\n  attendu ${JSON.stringify(a)}\n  obtenu  ${JSON.stringify(o)}`); } };
// morceaux collés (pas d’espace), séparés (espace), et morceau qui commence par une espace
const ligne = (y, parts) => { let x = 50; return parts.map(([str, gap]) => { x += gap || 0; const it = {str, x, y, w: str.length * 5, h: 10}; x += it.w; return it; }); };
const page = (n, corps) => [
  ...ligne(800, [["Revue Flaly no 13, Deuxi" + (n % 2 ? "e" : "è") + "me semestre"]]),
  ...corps,
  ...ligne(40, [[String(100 + n)]]),
];
const p1 = page(1, [
  ...ligne(700, [["AL"], ["-"], ["AZZAWI", 0], [" Qasim", 0], ["Obayes,", 3], ["2018,", 3]]),
  ...ligne(688, [["The Case of Proto"], ["-"], ["Mark", 0], ["Pro", 3], ["blem", 0]]),
  ...ligne(650, [["Nouveau paragraphe."]]),
]);
const t = E.pdfPagesToText([p1, page(2, ligne(700, [["Texte de la page 2."]])), page(3, ligne(700, [["Texte de la page 3."]])), page(4, ligne(700, [["Fin."]]))]);
const lignes = t.split("\n");
egal(lignes[0], "AL-AZZAWI Qasim Obayes, 2018,", "morceaux collés et séparés");
egal(lignes[1], "The Case of Proto-Mark Problem", "mot coupé en deux morceaux");
egal(lignes[2], "", "ligne vide entre deux paragraphes");
egal(/Revue Flaly/.test(t), false, "en-tête répété retiré (avec et sans accent)");
egal(/\b10[1-4]\b/.test(t), false, "numéros de page retirés");
egal(/Texte de la page 2\.\nTexte de la page 3\./.test(t), true, "pages enchaînées");
console.log(err ? `erreurs : ${err}` : "erreurs : aucune");
