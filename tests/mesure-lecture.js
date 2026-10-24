// Mesure du taux de lecture correcte sur tests/corpus-references.js (affiche chaque écart)
// Usage : node mesure-lecture.js
const E = require('../js/moteur.js');
const corpus = require('./corpus-references.js');
const N = v => E.norm ? E.norm(v) : String(v || "").toLowerCase();
const champs = ["a", "y", "type", "title", "container", "volume", "issue", "pages", "city", "publisher", "doi", "url"];
const tot = {}, bon = {}; let refsOk = 0; const ecarts = [];
corpus.forEach(c => {
  const s = E.parseRefHeuristic(c.l);
  const got = {a: s.authors.map(x => x.family).join("/"), y: s.year, type: s.type, title: s.title, container: s.container, volume: s.volume, issue: s.issue, pages: (s.pages || "").replace(/–/g, "-"), city: s.city, publisher: s.publisher, doi: s.doi, url: s.url};
  let ok = true;
  champs.forEach(k => {
    if (c[k] === undefined) return;
    tot[k] = (tot[k] || 0) + 1;
    if (N(got[k]) === N(c[k])) bon[k] = (bon[k] || 0) + 1;
    else { ok = false; ecarts.push(`${k.padEnd(9)} attendu « ${c[k]} » obtenu « ${got[k] || ""} »   ← ${c.l.slice(0, 70)}`); }
  });
  if (ok) refsOk++;
});
ecarts.forEach(e => console.log(e));
console.log("\nChamp      réussite");
champs.filter(k => tot[k]).forEach(k => console.log(`${k.padEnd(10)} ${bon[k] || 0}/${tot[k]}`));
const t = Object.values(tot).reduce((a, b) => a + b, 0), b = Object.values(bon).reduce((a, b) => a + b, 0);
console.log(`\nChamps justes : ${b}/${t} (${Math.round(100 * b / t)} %). Références entièrement justes : ${refsOk}/${corpus.length} (${Math.round(100 * refsOk / corpus.length)} %).`);
module.exports = {champsPct: b / t, refsPct: refsOk / corpus.length};
