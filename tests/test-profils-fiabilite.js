// Test : profils fiabilite
const {JSDOM} = require("jsdom"); const fs = require("fs");
const html = require("./charger")();
let saved = null;
const dom = new JSDOM(html, {runScripts:"dangerously", pretendToBeVisual:true, url:"https://example.org/", beforeParse(w){ w.fetch = async () => { throw new TypeError("blocked"); }; }});
const w = dom.window; const errs = [];
w.addEventListener("error", e => errs.push(e.message));
w.HTMLDialogElement.prototype.showModal = function(){ this.open = true; };
w.HTMLDialogElement.prototype.close = function(){ this.open = false; this.dispatchEvent(new w.Event("close")); };
w.URL.createObjectURL = b => { saved = b; return "blob:x"; }; w.URL.revokeObjectURL = () => {};
(async () => {
  await new Promise(r => setTimeout(r, 100)); const d = w.document;
  d.querySelector("#demoBtn").click(); await new Promise(r => setTimeout(r, 400));
  // PROFILS
  w.openDash("norme");
  const sel = d.querySelector("#profSel"); console.log("Profils:", [...sel.options].map(o => o.textContent).join(" | "));
  sel.value = "kurukan"; sel.dispatchEvent(new w.Event("change"));
  console.log("Kurukan →", d.querySelector(".entry .ref").textContent);
  d.querySelector("#profDup").click();
  console.log("Profil créé:", d.querySelector("#profSel").selectedOptions[0].textContent);
  const cb = d.querySelector('[data-po="upper"]'); cb.checked = true; cb.dispatchEvent(new w.Event("change"));
  const ps = d.querySelector('[data-pv="placeSep"]'); ps.value = ", "; ps.dispatchEvent(new w.Event("change"));
  console.log("Personnalisé →", d.querySelector(".entry .ref").textContent);
  console.log("Aperçu:", d.querySelector("#profBody .sheet p").textContent);
  const s2 = d.querySelector("#profSel"); s2.value = "norcames"; s2.dispatchEvent(new w.Event("change"));
  // FIABILITÉ : corriger une fiche (Diakité : ajouter la ville), puis tout valider
  w.dashTab("fiabilite"); console.log("\nFiabilité avant:", d.querySelector("#evalBox").textContent.replace(/\s+/g," ").trim().slice(0,110));
  const card = [...d.querySelectorAll("#cards .card")].find(c => /Violence/.test(c.textContent)); card.querySelector("[data-edit]").click();
  const f = d.querySelector("#srcForm"); f.querySelector("[name=city]").value = "Paris";
  d.querySelector("#dlg").returnValue = "save"; d.querySelector("#dlg").close();
  const ostrom = [...d.querySelectorAll("#cards .card")].find(c => /Governing/.test(c.textContent)); ostrom.querySelector("[data-edit]").click();
  const f2 = d.querySelector("#srcForm"); f2.querySelector("[name=authors]").value = "Elinor Ostrom"; f2.querySelector("[name=city]").value = "Cambridge";
  d.querySelector("#dlg").returnValue = "save"; d.querySelector("#dlg").close();
  [...d.querySelectorAll(".task button")].find(b => b.textContent === "Tout valider").click();
  w.dashTab("fiabilite");
  console.log("Fiabilité après:", [...d.querySelectorAll("#evalBox .kv div")].map(x => x.querySelector("dt").textContent + " = " + x.querySelector("dd").textContent).join(" | "));
  console.log("Par champ:", [...d.querySelectorAll("#evalBox .bars .b")].map(b => b.children[0].textContent + " " + b.children[2].textContent).join(", "));
  d.querySelector("#evOut").click(); await new Promise(r => setTimeout(r, 50));
  const exp = JSON.parse(await saved.text()); console.log("Export anonyme:", exp.records.length, "références, contient un titre ?", /Mondialisation|Violence/i.test(JSON.stringify(exp)));
  // réimport comme si c'était un autre relecteur
  await w.handleFiles([new w.File([JSON.stringify(exp)], "mesures-collegue.json")]);
  console.log("Après import collègue:", d.querySelector("#evalBox .kv dd").textContent, "références relues");
  console.log("erreurs:", errs.length ? errs : "aucune");
  process.exit(0);
})();
