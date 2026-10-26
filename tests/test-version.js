// Mise à jour : le numéro du cache hors connexion et le « ?v= » des styles et scripts doivent être identiques
// dans toutes les pages. Sinon un téléphone peut afficher une page neuve avec des styles anciens (vu le 2026-10-26).
const fs = require("fs"), path = require("path");
const dir = path.join(__dirname, ".."), lire = f => fs.readFileSync(path.join(dir, f), "utf8");
const errs = [];
const v = (lire("sw.js").match(/const CACHE = "bibliocard-v(\d+)"/) || [])[1];
if(!v) errs.push("numéro de cache introuvable dans sw.js");
for(const f of ["index.html", "accueil.html", "cgu.html", "cgv.html", "confidentialite.html"]){
  const h = lire(f);
  const refs = [...h.matchAll(/(?:href|src)="((?:css|js)\/[^"]+)"/g)].map(m => m[1]);
  refs.forEach(r => { const m = r.match(/\?v=(\d+)$/); if(!m) errs.push(`${f} : ${r} sans ?v=`); else if(m[1] !== v) errs.push(`${f} : ${r} au lieu de ?v=${v}`); });
  if(!refs.length) errs.push(`${f} : aucun style ni script trouvé`);
}
console.log(errs.length ? errs.join("\n") + `\nerreurs : ${errs.length}` : "erreurs : aucune");
