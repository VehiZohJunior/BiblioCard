// Lecture de vraies bibliographies CAMES (tests/corpus-articles-reels.js) : chaque champ vérifié doit être exact
const E = require('../js/moteur.js');
const corpus = require('./corpus-articles-reels.js');
const champs = ["y", "type", "title", "container", "city", "publisher"];
const N = v => String(v || "").replace(/[’']/g, "'").trim();
let err = 0;
corpus.forEach(c => {
  const s = E.parseRefHeuristic(c.l);
  const got = {a: s.authors.map(x => x.family).join("/"), y: s.year, type: s.type, title: s.title, container: s.container, city: s.city, publisher: s.publisher};
  ["a", ...champs].forEach(k => { if (c[k] !== undefined && N(got[k]) !== N(c[k])) { err++; console.log(`ÉCHEC ${k} : « ${got[k] || ""} » au lieu de « ${c[k]} » ← ${c.l.slice(0, 80)}`); } });
});
console.log(`${corpus.length} références réelles contrôlées.`);
console.log(err ? `erreurs : ${err}` : "erreurs : aucune");
