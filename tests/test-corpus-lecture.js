// Lecture automatique sur le jeu de références réalistes (tests/corpus-references.js) :
// chaque champ attendu doit être exact (noms de famille compris, majuscules comprises).
const E = require('../js/moteur.js');
const corpus = require('./corpus-references.js');
const champs = ["year", "type", "title", "container", "volume", "issue", "pages", "city", "publisher", "doi", "url"];
const N = v => String(v || "").replace(/[’']/g, "'").replace(/–/g, "-").trim().toLowerCase();
let err = 0;
corpus.forEach(c => {
  const s = E.parseRefHeuristic(c.l);
  const a = s.authors.map(x => x.family).join("/");
  if (a.replace(/’/g, "'") !== c.a) { err++; console.log(`ÉCHEC auteurs : « ${a} » au lieu de « ${c.a} » ← ${c.l}`); }
  champs.forEach(k => { const att = k === "year" ? c.y : c[k]; if (att !== undefined && N(s[k]) !== N(att)) { err++; console.log(`ÉCHEC ${k} : « ${s[k] || ""} » au lieu de « ${att} » ← ${c.l}`); } });
});
console.log(`${corpus.length} références contrôlées.`);
console.log(err ? `erreurs : ${err}` : "erreurs : aucune");
