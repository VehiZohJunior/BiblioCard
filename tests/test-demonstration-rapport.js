// Test : demonstration rapport
const {JSDOM} = require("jsdom"); const fs = require("fs");
const html = require("./charger")();
const dom = new JSDOM(html, {runScripts:"dangerously", pretendToBeVisual:true, url:"https://example.org/"});
const w = dom.window; const errs = []; let saved = null;
w.addEventListener("error", e => errs.push(e.message));
w.HTMLDialogElement.prototype.showModal = function(){ this.open = true; };
w.HTMLDialogElement.prototype.close = function(){ this.open = false; this.dispatchEvent(new w.Event("close")); };
w.URL.createObjectURL = b => { saved = b; return "blob:x"; }; w.URL.revokeObjectURL = () => {};
(async () => {
  await new Promise(r => setTimeout(r, 100));
  const d = w.document;
  d.querySelector("#demoBtn").click(); await new Promise(r => setTimeout(r, 300));
  console.log("SYNTHÈSE:", d.querySelector("#ring").textContent.trim(), "|", [...d.querySelectorAll("#facts div")].map(x => x.querySelector("dt").textContent + " " + x.querySelector("dd").textContent).join(" · "));
  console.log("Bandeau:", d.querySelector("#todoBanner").textContent.trim());
  console.log("\nÉPREUVE:"); d.querySelectorAll(".entry").forEach(e => console.log(" ", e.querySelector(".ref").textContent, "‖", e.querySelector(".marks").textContent));
  console.log("\nÀ FAIRE:"); d.querySelectorAll(".task").forEach(t => console.log(" •", t.querySelector("b").textContent));
  w.dashTab("analyse"); console.log("\nANALYSE:", d.querySelector("#analyse .kv").textContent.replace(/\s+/g," ").trim()); d.querySelectorAll("#analyse .note").forEach(n => console.log("  note:", n.textContent));
  d.querySelector("#dReport").click(); await new Promise(r => setTimeout(r, 7000));
  const txt = (await saved.text()).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  console.log("\nRAPPORT:", txt.slice(0, 700));
  console.log("\nerreurs:", errs.length ? errs : "aucune");
  process.exit(0);
})();
