// Test : rapport moderation synchro
const {JSDOM} = require("jsdom"); const fs = require("fs"); const JSZip = require("jszip");
const base = require("./charger")();
const wait = ms => new Promise(r => setTimeout(r, ms));
function mk(opts){
  const outs = []; const errs = [];
  const dom = new JSDOM(base, {runScripts:"dangerously", pretendToBeVisual:true, url: opts.url || "https://moi.github.io/bibliocard/", beforeParse(w){ Object.defineProperty(w.navigator, "languages", {get: () => ["fr-FR"]}); w.fetch = opts.fetch || (async () => { throw new TypeError("blocked"); }); w.JSZip = JSZip; if(opts.claude) w.claude = opts.claude; if(opts.ls) Object.entries(opts.ls).forEach(([k, v]) => w.localStorage.setItem(k, v)); }});
  const w = dom.window; w.addEventListener("error", e => errs.push(e.message)); w.scrollTo = () => {};
  w.HTMLDialogElement.prototype.showModal = function(){ this.open = true; }; w.HTMLDialogElement.prototype.close = function(){ this.open = false; this.dispatchEvent(new w.Event("close")); };
  w.HTMLAnchorElement.prototype.click = function(){ outs.push({name: this.download}); }; w.URL.createObjectURL = b => { outs.push({blob: b}); return "blob:x"; }; w.URL.revokeObjectURL = () => {};
  return {w, d: w.document, outs, errs};
}
(async () => {
  // 1. RAPPORT EN ANGLAIS
  const A = mk({}); await wait(150);
  A.d.querySelector("#demoBtn").click(); await wait(500);
  A.w.eval("state").uiLang = "en"; A.w.applyLang(); A.w.downloadReport(); await wait(300);
  const blob = A.outs.find(o => o.blob).blob; const z = await JSZip.loadAsync(Buffer.from(await blob.arrayBuffer()));
  const txt = (await z.file("word/document.xml").async("string")).replace(/<\/w:p>/g, "\n").replace(/<[^>]+>/g, "");
  console.log("1. Rapport :", A.outs.find(o => o.name).name); txt.split("\n").filter(Boolean).slice(0, 14).forEach(l => console.log("   ", l.slice(0, 120)));
  const french = txt.split("\n").filter(l => /\b(dont|médiane|trouvée|Références suspectes|Établi|Cohérence|incomplètes)\b/.test(l));
  console.log("   Restes de français hors bibliographie :", french.length ? french : "aucun");
  // 2. CATALOGUE : signalements
  const STORE = new Map();
  const mkDb = () => { const doc = path => ({path, async get(){ const v = STORE.get(path); return {id: path.split("/").pop(), exists: v !== undefined, data: () => v}; }, async set(v){ STORE.set(path, JSON.parse(JSON.stringify(v))); }, async delete(){ STORE.delete(path); }}); const coll = path => ({doc: id => doc(path + "/" + id), limit(){ return this; }, async get(){ const depth = path.split("/").length + 1; const docs = [...STORE.entries()].filter(([k]) => k.startsWith(path + "/") && k.split("/").length === depth).map(([k, v]) => ({id: k.split("/").pop(), exists: true, data: () => v})); return {docs}; }}); return {doc, collection: coll}; };
  const claude = (uid, owner) => ({use: async n => n === "db" ? mkDb() : n === "user" ? {id: async () => uid, isOwner: async () => owner} : null});
  STORE.set("catalogue/r1", {tkey: "x|1990", ref: {type: "book", title: "Une référence erronée", year: "1990", authors: [{family: "Faux", given: "A."}]}, by: ["u0"], n: 1});
  const B = mk({claude: claude("u1", false)}), C = mk({claude: claude("u2", false)}), O = mk({claude: claude("prop", true)}); await wait(250);
  for(const X of [B, C]){ X.w.openDash("catalogue"); X.d.querySelector("#catLoad").click(); await wait(150); X.d.querySelector("[data-catflag]").click(); await wait(200); }
  B.d.querySelector("#catLoad").click(); await wait(150);
  console.log("\n2. Catalogue vu par un utilisateur :", B.d.querySelectorAll("#catBox .card").length, "entrée visible |", B.d.querySelector("#catBox").textContent.match(/\d+ entrée[s]? masquée[s]?[^.]*/)?.[0]);
  O.w.openDash("catalogue"); O.d.querySelector("#catLoad").click(); await wait(200);
  console.log("   Vu par le propriétaire :", [...O.d.querySelectorAll("#catBox .card .tag")].map(t => t.textContent).join(", "));
  const del = O.d.querySelector("[data-catdel]"); del.click(); del.click(); await wait(200);
  console.log("   Après suppression :", STORE.has("catalogue/r1") ? "toujours là" : "supprimée");
  // 3. SYNCHRONISATION (faux Supabase)
  const SB = {rows: {}, otp: []};
  const fake = async (url, opt = {}) => { const ok = (d, st = 200) => ({ok: st < 300, status: st, json: async () => d});
    if(url.includes("/auth/v1/otp")){ SB.otp.push(JSON.parse(opt.body).email); return ok({}); }
    if(url.includes("/rest/v1/bibliotheques")){ if(opt.method === "POST"){ const [r] = JSON.parse(opt.body); SB.rows[r.user_id] = r; return ok({}, 201); } const id = decodeURIComponent(url).match(/user_id=eq\.(\S+)$/)[1]; return ok(SB.rows[id] ? [SB.rows[id]] : []); }
    return ok([]); };
  const cfg = JSON.stringify({catalogCfg: {url: "https://abc.supabase.co", key: "anon"}, uiLang: "fr"});
  const P1 = mk({fetch: fake, ls: {"bibliocard.v3": cfg}}); await wait(200);
  P1.w.openDash("export"); P1.d.querySelector("#syncMail").value = "zoh@exemple.com"; P1.d.querySelector("#syncGo").click(); await wait(100);
  console.log("\n3. Lien demandé pour :", SB.otp[0], "|", P1.d.querySelector("#toastMsg").textContent);
  const jwt = "x." + Buffer.from(JSON.stringify({sub: "user-42", email: "zoh@exemple.com"})).toString("base64") + ".y";
  const PH = mk({fetch: fake, ls: {"bibliocard.v3": cfg}, url: `https://moi.github.io/bibliocard/#access_token=${jwt}&refresh_token=r&expires_in=3600`}); await wait(200);
  console.log("   Retour du lien → connecté :", !!PH.w.eval("sync").session, "| adresse nettoyée :", !PH.w.location.hash);
  PH.d.querySelector("#demoBtn").click(); await wait(1600);
  console.log("   Téléphone → serveur :", SB.rows["user-42"] ? JSON.parse(SB.rows["user-42"].json).sources.length + " références envoyées" : "rien");
  const sess = PH.w.localStorage.getItem("bibliocard.session");
  const PC = mk({fetch: fake, ls: {"bibliocard.v3": cfg, "bibliocard.session": sess}}); await wait(900);
  console.log("   Ordinateur → récupère :", PC.w.eval("state").sources.length, "références |", PC.d.querySelector("#toastMsg").textContent);
  console.log("\nerreurs :", [A, B, C, O, P1, PH, PC].flatMap(x => x.errs).length ? [A, B, C, O, P1, PH, PC].flatMap(x => x.errs) : "aucune"); process.exit(0);
})();
