// Test : projets
const {JSDOM} = require("jsdom"); const fs = require("fs");
const html = require("./charger")();
const dom = new JSDOM(html, {runScripts:"dangerously", pretendToBeVisual:true, url:"https://example.org/", beforeParse(w){ w.fetch = async () => { throw new TypeError("blocked"); };
  // ancienne bibliothèque (v7) pour tester la migration
  w.localStorage.setItem("bibliocard.v3", JSON.stringify({sources:[{id:"old1",type:"book",authors:[{family:"Amin",given:"Samir"}],title:"Les Défis de la mondialisation",year:"1996",city:"Paris",publisher:"L’Harmattan",origin:"Saisie manuelle"}], style:"cames"}));
  w.localStorage.setItem("bibliocard.redaction", JSON.stringify({title:"Mon brouillon", text:"Texte ancien conservé."})); }});
const w = dom.window; const errs = [];
w.addEventListener("error", e => errs.push(e.message));
w.HTMLDialogElement.prototype.showModal = function(){ this.open = true; };
w.HTMLDialogElement.prototype.close = function(){ this.open = false; this.dispatchEvent(new w.Event("close")); };
(async () => {
  await new Promise(r => setTimeout(r, 150)); const d = w.document;
  console.log("Migration →", d.querySelector("#projBtn").textContent.trim(), "|", d.querySelectorAll(".entry").length, "réf. | brouillon:", d.querySelector("#draft").value);
  d.querySelector("#projBtn").click();
  const f = d.querySelector("#newProj"); f.querySelector("[name=name]").value = "Article Diogène"; f.querySelector("[name=kind]").value = "article";
  f.dispatchEvent(new w.Event("submit", {cancelable:true}));
  console.log("Nouveau projet →", d.querySelector("#projBtn").textContent.trim(), "|", d.querySelectorAll(".entry").length, "réf. | brouillon vide:", d.querySelector("#draft").value === "");
  d.querySelector("#demoBtn").click(); await new Promise(r => setTimeout(r, 400));
  d.querySelector("#draft").value = "Texte de l’article."; d.querySelector("#draft").dispatchEvent(new w.Event("input")); await new Promise(r => setTimeout(r, 700));
  console.log("Dans l’article :", d.querySelectorAll(".entry").length, "réf.");
  d.querySelector("#projBtn").click();
  console.log("Liste :", [...d.querySelectorAll(".pitem")].map(x => x.querySelector("h5").textContent.trim() + " [" + x.querySelector(".meta").textContent + "]").join(" || "));
  d.querySelector("[data-open]").click();
  console.log("Retour →", d.querySelector("#projBtn").textContent.trim(), "|", d.querySelectorAll(".entry").length, "réf. | brouillon:", d.querySelector("#draft").value);
  // renommer
  d.querySelector("#projBtn").click(); d.querySelector("[data-ren]").click(); const inp = d.querySelector(".pitem input"); inp.value = "Thèse VEHI"; d.querySelector("[data-ok]").click();
  console.log("Renommé →", d.querySelector("#projBtn").textContent.trim());
  // supprimer l'autre (double clic)
  const del = [...d.querySelectorAll("[data-delp]")].find(b => true); const name = del.closest(".pitem").querySelector("h5").textContent; del.click(); console.log("Bouton armé :", del.textContent); del.click();
  console.log("Après suppression de", name.trim(), ":", d.querySelectorAll(".pitem").length, "projet(s)");
  await new Promise(r => setTimeout(r, 800));
  const saved = JSON.parse(w.localStorage.getItem("bibliocard.v3")); console.log("Enregistré :", Object.keys(saved.projects).length, "projet(s),", Object.values(saved.projects)[0].sources.length, "réf.");
  console.log("erreurs:", errs.length ? errs : "aucune");
  process.exit(0);
})();
