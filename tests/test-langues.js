// Test : langues
const {JSDOM} = require("jsdom"); const fs = require("fs");
const base = require("./charger")();
const dom = new JSDOM(base, {runScripts:"dangerously", pretendToBeVisual:true, url:"https://example.org/", beforeParse(w){ w.fetch = async () => { throw new TypeError("blocked"); }; }});
const w = dom.window; const d = w.document; const errs = []; w.addEventListener("error", e => errs.push(e.message));
w.HTMLDialogElement.prototype.showModal = function(){ this.open = true; }; w.HTMLDialogElement.prototype.close = function(){ this.open = false; this.dispatchEvent(new w.Event("close")); };
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await wait(150); d.querySelector('#uiLangSeg [data-l="fr"]').click(); d.querySelector("#demoBtn").click(); await wait(400); // jsdom est réglé en anglais : on part du français
  const snap = () => [d.querySelector("#h1").textContent, d.querySelector("#todoBanner").textContent.trim(), d.querySelector("#facts dt").textContent, d.querySelector("#micBtn").getAttribute("aria-label"), d.querySelector(".entry .ref").textContent.slice(0, 40)].join(" | ");
  const fr1 = snap(), onglets = () => [...d.querySelectorAll("[data-st]")].map(b => b.childNodes[0].textContent.trim()).join(" / "), ong1 = onglets();
  console.log("FR :", fr1);
  w.openDash("norme"); d.querySelector('#uiLangSeg [data-l="en"]').click(); await wait(20);
  console.log("EN :", snap(), "| lang =", d.documentElement.lang);
  console.log("EN onglets :", [...d.querySelectorAll("#dnav button")].map(b => b.textContent).join(", "));
  w.openDash("todo"); await wait(10); console.log("EN tâche :", d.querySelector(".task b").textContent, "→", [...d.querySelectorAll(".task")[0].querySelectorAll("button")].map(b => b.textContent).join(" / "));
  [...d.querySelectorAll(".entry .ref")][0]; w.removeSource(w.eval("state").sources[0].id); await wait(10); console.log("EN toast :", d.querySelector("#toastMsg").textContent, "+", d.querySelector("#toastAct").textContent);
  d.querySelector("#toastAct").click(); await wait(10);
  d.querySelector('#uiLangSeg [data-l="fr"]').click(); await wait(20);
  console.log("FR :", snap(), "| lang =", d.documentElement.lang);
  // aller-retour : le français revient à l’identique (défaut corrigé le 2026-10-24 : les onglets restaient en anglais)
  if(!/^Ta bibliographie, tirée de ton texte/.test(snap()) || !onglets().startsWith("Bibliographie / À faire")) errs.push("interface restée en anglais : " + snap() + " | " + onglets());
  if(snap() !== fr1) errs.push("retour au français incomplet : " + snap() + " ≠ " + fr1);
  if(onglets() !== ong1) errs.push("onglets restés traduits : " + onglets() + " ≠ " + ong1);
  console.log("erreurs :", errs.length ? errs : "aucune"); process.exit(0);
})();
