// Test : catalogue
const {JSDOM} = require("jsdom"); const fs = require("fs");
const base = require("./charger")();
const STORE = new Map();   // base partagée simulée (même artifact, deux personnes)
function mkDb(){
  const doc = path => ({ path, async get(){ const v = STORE.get(path); return {id: path.split("/").pop(), exists: v !== undefined, data: () => v}; }, async set(v){ STORE.set(path, JSON.parse(JSON.stringify(v))); }, async delete(){ STORE.delete(path); }, collection: sub => coll(path + "/" + sub) });
  const coll = path => ({ doc: id => doc(path + "/" + id), limit(){ return this; }, async get(){ const depth = path.split("/").length + 1; const docs = [...STORE.entries()].filter(([k]) => k.startsWith(path + "/") && k.split("/").length === depth).map(([k, v]) => ({id: k.split("/").pop(), exists: true, data: () => v})); return {docs, size: docs.length, empty: !docs.length}; } });
  return {doc, collection: coll};
}
function browser(uid){
  const errs = [];
  const dom = new JSDOM(base, {runScripts:"dangerously", pretendToBeVisual:true, url:"https://example.org/", beforeParse(w){ w.fetch = async () => { throw new TypeError("blocked"); }; w.claude = {use: async n => n === "db" ? mkDb() : n === "user" ? {id: async () => uid} : null}; }});
  const w = dom.window; w.addEventListener("error", e => errs.push(e.message));
  w.HTMLDialogElement.prototype.showModal = function(){ this.open = true; };
  w.HTMLDialogElement.prototype.close = function(){ this.open = false; this.dispatchEvent(new w.Event("close")); };
  return {w, d: w.document, errs};
}
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const A = browser("etudiant-a"); await wait(200);
  A.w.addSources([Object.assign(A.w.blank(), {type:"thesis", authors:[{family:"Koné", given:"Aminata"}], title:"Discours médiatique et alternance politique en Côte d’Ivoire", year:"2021", city:"Abidjan", publisher:"Université Félix Houphouët-Boigny", genre:"Thèse de doctorat", origin:"Saisie manuelle"})]);
  A.d.querySelector("#demoBtn").click(); await wait(400);
  A.w.openDash("catalogue"); console.log("A — partageables :", A.d.querySelector("#catBox .kv").textContent.replace(/\s+/g," ").trim());
  A.d.querySelector("#catShare").click(); await wait(300);
  console.log("A — après partage :", A.d.querySelector("#toastMsg").textContent, "| documents en base :", [...STORE.keys()].filter(k => k.startsWith("catalogue/")).length);
  const B = browser("etudiant-b"); await wait(200);
  B.w.addSources([Object.assign(B.w.blank(), {type:"thesis", authors:[{family:"Koné", given:"A."}], title:"Discours médiatique et alternance politique en Côte d'Ivoire", year:"2021", origin:"Saisie manuelle"})]);
  console.log("B — avant :", B.d.querySelector(".entry .ref").textContent, "| marques :", B.d.querySelector(".entry .marks").textContent);
  await B.w.runExistence(true); await wait(200);
  B.w.openDash("existence"); console.log("B — existence :", B.d.querySelector("#existBox .card .legend").textContent.slice(0, 90));
  B.d.querySelector("[data-enrich]").click();
  console.log("B — après « Compléter » :", B.d.querySelector(".entry .ref").textContent);
  B.w.openDash("catalogue"); B.d.querySelector("#catShare").click(); await wait(300); B.d.querySelector("#catLoad").click(); await wait(200);
  console.log("B — catalogue :", [...B.d.querySelectorAll("#catBox .card")].map(c => c.querySelector("h5").textContent.slice(0, 40) + " (" + c.querySelector(".tag").textContent + ")").join(" | "));
  console.log("Exemple ou suspecte partagée ?", [...STORE.entries()].some(([k, v]) => k.startsWith("catalogue/") && /Traoré|Ostrom|Berger/i.test(JSON.stringify(v))));
  console.log("erreurs :", A.errs.concat(B.errs).length ? A.errs.concat(B.errs) : "aucune");
  process.exit(0);
})();
