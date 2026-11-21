// Mesure d’audience et bandeau de consentement (2026-11-21) : rien n’est chargé sans « Accepter » ;
// « Refuser » ne charge rien ; le choix est retenu ; sans jeton, ni bandeau ni mesure ; « Gérer mes choix » rouvre le bandeau.
const {JSDOM} = require("jsdom");
const fs = require("fs"), path = require("path");
const src = fs.readFileSync(path.join(__dirname, "../js/audience.js"), "utf8");
const errs = [];
const vrai = (v, q) => { if(!v) errs.push(q); };
const page = async (code, stockage = {}) => {
  const dom = new JSDOM(`<!doctype html><html><head></head><body><a href="#" data-consentement id="gerer">Gérer mes choix</a></body></html>`, {runScripts: "outside-only", url: "https://vehizohjunior.github.io/BiblioCard/accueil.html"});
  Object.entries(stockage).forEach(([k, v]) => dom.window.localStorage.setItem(k, v));
  dom.window.alert = m => { dom.window.__alerte = m; };
  dom.window.eval(code); await new Promise(r => setTimeout(r, 30)); return dom.window;
};
(async () => {
const avecJeton = src.replace('const JETON_AUDIENCE = "";', 'const JETON_AUDIENCE = "jeton-public-essai";');
vrai(avecJeton !== src, "le jeton se règle à un seul endroit");
const balise = w => w.document.querySelector("script[data-cf-beacon]");

// 1. sans jeton : ni bandeau, ni mesure ; « Gérer mes choix » l’explique
let w = await page(src);
vrai(!w.document.querySelector("#consentement") && !balise(w), "sans jeton : aucun bandeau, aucune mesure");
w.document.querySelector("#gerer").click(); vrai(/Aucune mesure/.test(w.__alerte || ""), "sans jeton : « Gérer mes choix » l’explique");

// 2. première visite : bandeau, rien de chargé ; Refuser et Accepter ont le même poids
w = await page(avecJeton);
const b = w.document.querySelector("#consentement");
vrai(b && !balise(w), "première visite : bandeau affiché, rien chargé avant le choix");
vrai(b && b.querySelector('[data-choix="non"]').className === b.querySelector('[data-choix="oui"]').className, "Refuser et Accepter ont le même style");
vrai(b && b.querySelector('a[href="confidentialite.html#audience"]'), "lien vers la politique de confidentialité");

// 3. Refuser : rien n’est chargé, le choix est retenu
b.querySelector('[data-choix="non"]').click();
vrai(!balise(w) && !w.document.querySelector("#consentement"), "refus : bandeau fermé, aucune mesure");
const refus = w.localStorage.getItem("scientus.audience");
w = await page(avecJeton, {"scientus.audience": refus});
vrai(!w.document.querySelector("#consentement") && !balise(w), "refus retenu à la visite suivante");

// 4. Gérer mes choix puis Accepter : la mesure se charge, avec le jeton ; retenue ensuite
w.document.querySelector("#gerer").click();
const b2 = w.document.querySelector("#consentement"); vrai(b2, "« Gérer mes choix » rouvre le bandeau");
b2.querySelector('[data-choix="oui"]').click();
const s = balise(w);
vrai(s && s.src === "https://static.cloudflareinsights.com/beacon.min.js" && JSON.parse(s.getAttribute("data-cf-beacon")).token === "jeton-public-essai", "accord : Cloudflare Web Analytics chargé avec le jeton");
w = await page(avecJeton, {"scientus.audience": w.localStorage.getItem("scientus.audience")});
vrai(balise(w) && !w.document.querySelector("#consentement"), "accord retenu : mesure chargée, sans bandeau");

// 5. choix de plus de 6 mois : redemandé
w = await page(avecJeton, {"scientus.audience": JSON.stringify({choix: "oui", le: Date.now() - 200 * 864e5})});
vrai(w.document.querySelector("#consentement") && !balise(w), "choix de plus de 6 mois : redemandé");

errs.forEach(e => console.log("ÉCHEC " + e));
console.log(errs.length ? `erreurs : ${errs.length}` : "erreurs : aucune");
process.exit(errs.length ? 1 : 0);
})();
