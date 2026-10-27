// Lecture des sources dans un texte : chaque forme réelle de citation doit donner ses sources, et seulement elles.
const E = require("../js/moteur.js");
const norm = t => String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, "").toLowerCase().trim();
const C = require("./corpus-citations.js");
const cle = c => `${c.family} ${c.year}`;
const proche = (x, y) => { const [fx, ax] = x.split(/ (?=\S+$)/), [fy, ay] = y.split(/ (?=\S+$)/); return ax === ay && (norm(fx) === norm(fy) || norm(fx).endsWith(" " + norm(fy)) || norm(fy).endsWith(" " + norm(fx))); };
let ok = 0, ko = [];
const verifier = (t, attendu, nom) => {
  const lu = E.findCitations(t).map(cle);
  const manque = attendu.filter(a => !lu.some(l => proche(l, a))), trop = lu.filter(l => !attendu.some(a => proche(l, a)));
  if(!manque.length && !trop.length) ok++; else ko.push(`${nom}\n    attendu ${JSON.stringify(attendu)}\n    lu      ${JSON.stringify(lu)}`);
};
C.forEach((x, i) => verifier(x.t, x.s, `${i + 1}. ${x.t.slice(0, 70)}`));
verifier(C.notes.t, C.notes.s, "notes de bas de page");
// les notes donnent des références complètes, lues sans recherche en ligne
const st = h => E.stripHtml(h).replace(/ /g, " ");
const notes = E.findCitations(C.notes.t).filter(c => c.refNote).map(c => st(E.STYLES.cames.bib(E.parseNote(c.refNote))));
const attenduNotes = ["BOURDIEU P., 1982, Ce que parler veut dire, Paris, Fayard.", "MBEMBE A., 2000, De la postcolonie, Paris, Karthala.", "KI-ZERBO J., 1972, Histoire de l’Afrique noire, Paris, Hatier."];
if(JSON.stringify(notes) !== JSON.stringify(attenduNotes)) ko.push("références des notes\n    attendu " + JSON.stringify(attenduNotes) + "\n    lu      " + JSON.stringify(notes));
const total = C.length + 1;
if(process.argv[2] === "detail") ko.forEach(k => console.log("ÉCHEC " + k));
console.log(`${ok} formes sur ${total} lues correctement`);
console.log(ko.length ? `erreurs : ${ko.length}` : "erreurs : aucune");
