// Test : encadreur
const {JSDOM} = require("jsdom"); const fs = require("fs");
const base = require("./charger")();
function browser(){
  const outs = []; const errs = [];
  const dom = new JSDOM(base, {runScripts:"dangerously", pretendToBeVisual:true, url:"https://example.org/", beforeParse(w){ Object.defineProperty(w.navigator, "languages", {get: () => ["fr-FR","fr"]}); w.fetch = async () => { throw new TypeError("blocked"); }; }});
  const w = dom.window; w.addEventListener("error", e => errs.push(e.message));
  w.HTMLDialogElement.prototype.showModal = function(){ this.open = true; };
  w.HTMLDialogElement.prototype.close = function(){ this.open = false; this.dispatchEvent(new w.Event("close")); };
  w.HTMLAnchorElement.prototype.click = function(){ outs.push({name: this.download}); };
  w.URL.createObjectURL = b => { outs.push({blob: b}); return "blob:x"; }; w.URL.revokeObjectURL = () => {};
  w.CSS = w.CSS || {}; w.CSS.escape = w.CSS.escape || (x => x.replace(/["\\]/g, "\\$&"));
  return {w, d: w.document, outs, errs};
}
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  // ÉTUDIANT
  const A = browser(); await wait(150);
  A.d.querySelector("#demoBtn").click(); await wait(400);
  A.w.setView("redac"); A.d.querySelector("#draftTitle").value = "Médias et mondialisation";
  A.d.querySelector("#draft").value = "Premier paragraphe sur la mondialisation (S. Amin, 1996).\n\nDeuxième paragraphe sur les médias ivoiriens.";
  A.d.querySelector("#draft").dispatchEvent(new A.w.Event("input")); await wait(700);
  A.d.querySelector("#dReview").click(); const f = A.d.querySelector("#rvForm"); f.querySelector("[name=who]").value = "VEHI Zoh Junior";
  A.d.querySelector("#dlg").returnValue = "ok"; A.d.querySelector("#dlg").close(); await wait(100);
  const dossier = await A.outs.find(o => o.blob).blob.text(); const dname = A.outs.find(o => o.name).name;
  console.log("1. Dossier envoyé :", dname, Math.round(dossier.length / 1024) + " ko");
  // ENCADREUR
  const B = browser(); await wait(150);
  await B.w.handleFiles([new B.w.File([dossier], dname)]); await wait(100);
  console.log("2. Encadreur :", B.d.body.dataset.view, "|", B.d.querySelector("#revTitle").textContent, "|", B.d.querySelector("#revMeta").textContent.slice(0, 70));
  console.log("   Synthèse :", B.d.querySelector("#revRing").textContent.trim(), "|", B.d.querySelectorAll("#revBiblio .entry").length, "réf. |", B.d.querySelectorAll(".rpara").length, "paragraphes");
  B.d.querySelector("#revName").value = "Pr Kouassi"; B.d.querySelector("#revName").dispatchEvent(new B.w.Event("change"));
  const cref = [...B.d.querySelectorAll("#revBiblio .cbtn")].find(b => /Commenter/.test(b.textContent) && /DIAKITE|DIAKITÉ/.test(b.closest(".entry").textContent)); cref.click();
  let host = cref.parentElement.querySelector(".cform"); host.querySelector("textarea").value = "Ajoute la ville d’édition."; host.querySelector("button").click();
  const cpar = [...B.d.querySelectorAll("#revText .cbtn")][1]; cpar.click();
  host = B.d.querySelectorAll("#revText .rpara")[1].querySelector(".cform"); host.querySelector("textarea").value = "Développe avec des exemples de journaux."; host.querySelector("button").click();
  B.d.querySelector("#revGeneral").value = "Bon travail, bibliographie à compléter."; B.d.querySelector("#revGeneral").dispatchEvent(new B.w.Event("input"));
  console.log("3. Commentaires :", B.d.querySelector("#revCount").textContent, "|", [...B.d.querySelectorAll(".cmt")].map(c => c.textContent.replace("Retirer","").trim()).join(" || "));
  B.outs.length = 0; B.d.querySelector("#revSend").click(); await wait(100);
  const retour = await B.outs.find(o => o.blob).blob.text(); const rname = B.outs.find(o => o.name).name;
  console.log("4. Retour :", rname);
  // ÉTUDIANT reçoit
  await A.w.handleFiles([new A.w.File([retour], rname)]); await wait(100);
  console.log("5. Étudiant, À faire :"); A.d.querySelectorAll(".task").forEach(t => { if(/Kouassi/.test(t.textContent)) console.log("   •", t.querySelector("b").textContent, "—", t.querySelector("p").textContent.slice(0, 70), "—", [...t.querySelectorAll("button")].map(b => "[" + b.textContent + "]").join(" ")); });
  console.log("   Marge :", [...A.d.querySelectorAll(".mark")].map(m => m.textContent).filter(t => /encadreur/.test(t)));
  [...A.d.querySelectorAll(".task button")].find(b => b.textContent === "Marquer comme traité").click();
  console.log("   Après un traitement :", [...A.d.querySelectorAll(".task b")].filter(b => /Kouassi/.test(b.textContent)).length, "restants");
  console.log("erreurs :", A.errs.concat(B.errs).length ? A.errs.concat(B.errs) : "aucune");
  process.exit(0);
})();
