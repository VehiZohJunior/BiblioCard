// Test : module Word (avec un Word simulé)
const {JSDOM} = require("jsdom"); const fs = require("fs"); const path = require("path");
const dir = path.join(__dirname, "../addin");
let html = fs.readFileSync(path.join(dir, "taskpane.html"), "utf8").replace(/<script src="https:[^>]+><\/script>/, "").replace('<script src="../js/moteur.js"></script>', () => "<script>" + fs.readFileSync(path.join(dir, "../js/moteur.js"), "utf8") + "</script>");
const calls = [];
const lib = {projects: {p1: {id: "p1", name: "Thèse", style: "cames", profile: "norcames", sources: [{id: "a", type: "book", authors: [{family: "Amin", given: "Samir"}], title: "Les Défis de la mondialisation", year: "1996", city: "Paris", publisher: "L’Harmattan"}, {id: "d", type: "article", authors: [{family: "Diagne", given: "Souleymane Bachir"}], title: "Islam et philosophie", container: "Diogène", issue: "202", year: "2003", pages: "145-151"}]}}};
const dom = new JSDOM(html, {runScripts: "dangerously", url: "https://moi.github.io/bibliocard/addin/taskpane.html", beforeParse(w){
  w.localStorage.setItem("bibliocard.v3", JSON.stringify(lib));
  w.Office = {HostType: {Word: "Word"}, onReady: cb => setTimeout(() => cb({host: "Word"}), 10)};
  w.Word = {InsertLocation: {end: "End", after: "After"}, run: async fn => { const sel = {insertText: (t, l) => calls.push(["texte", t, l]), insertHtml: (h, l) => calls.push(["html", h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 140), l])}; await fn({document: {getSelection: () => sel}, sync: async () => {}}); }};
}});
const w = dom.window, d = w.document; const errs = []; w.addEventListener("error", e => errs.push(e.message));
setTimeout(async () => {
  console.log("Panneau :", d.querySelector("#msg").textContent, "| projets :", [...d.querySelectorAll("#proj option")].map(o => o.textContent).join(", "));
  d.querySelector("#pg").value = "147"; d.querySelectorAll("[data-id]")[1].click(); await new Promise(r => setTimeout(r, 20));
  const sel = d.querySelector("#style"); sel.value = "apa"; sel.dispatchEvent(new w.Event("change"));
  d.querySelectorAll("[data-id]")[0].click(); await new Promise(r => setTimeout(r, 20));
  d.querySelector("#insBib").click(); await new Promise(r => setTimeout(r, 20));
  calls.forEach(c => console.log(" ", c[0], "→", c[1], "(" + c[2] + ")"));
  console.log("erreurs :", errs.length ? errs : "aucune"); process.exit(0);
}, 120);
