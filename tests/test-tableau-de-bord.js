// Test : tableau de bord
const {JSDOM} = require("jsdom"); const fs = require("fs"); const mammoth = require("mammoth");
const html = require("./charger")();
const dom = new JSDOM(html, {runScripts:"dangerously", pretendToBeVisual:true, url:"https://example.org/", beforeParse(w){ Object.defineProperty(w.navigator, "languages", {get: () => ["fr-FR","fr"]}); }});
const w = dom.window; const errs = [];
w.addEventListener("error", e => errs.push(e.message));
w.mammoth = { convertToHtml: o => mammoth.convertToHtml({buffer: Buffer.from(o.arrayBuffer)}) };
w.HTMLDialogElement.prototype.showModal = function(){ this.open = true; };
w.HTMLDialogElement.prototype.close = function(){ this.open = false; this.dispatchEvent(new w.Event("close")); };
(async () => {
  await new Promise(r => setTimeout(r, 100));
  const d = w.document;
  const vis = id => !d.querySelector(id).hidden;
  console.log("ACCUEIL : titre =", d.querySelector("#h1").textContent, "| feuille visible:", vis("#sheet"), "| bandeau:", vis("#todoBanner"), "| norme:", d.querySelector("#normName").textContent);
  const buf = fs.readFileSync(require("path").join(__dirname, "fixtures/memoire.docx"));
  await w.handleFiles([{ name:"memoire.docx", arrayBuffer: async () => buf }]);
  console.log("APRÈS DÉPÔT : titre =", d.querySelector("#h1").textContent, "| feuille:", vis("#sheet"), "| entrées:", d.querySelectorAll(".entry").length);
  console.log("bandeau:", d.querySelector("#todoBanner").textContent.trim(), "| badge:", d.querySelector("#dashBadge").textContent);
  d.querySelector("#todoBanner").click();
  console.log("\nTABLEAU DE BORD ouvert:", d.querySelector("#dash").open, "| section:", d.querySelector(".dsec.on").id);
  d.querySelectorAll(".task").forEach(t => console.log(" •", t.querySelector("b").textContent, "—", [...t.querySelectorAll("button")].map(b=>"["+b.textContent+"]").join(" ")));
  // corriger l'année de Koné via la tâche
  const yr = [...d.querySelectorAll(".task button")].find(b => b.textContent.startsWith("Mettre"));
  yr.click();
  console.log("\nAprès correction année → Koné:", [...d.querySelectorAll(".entry .ref")].map(e=>e.textContent).find(t=>t.startsWith("KONÉ")));
  // ajouter la référence manquante d'Ascher
  [...d.querySelectorAll(".task button")].find(b => b.textContent === "Ajouter sa référence").click();
  const f = d.querySelector("#srcForm");
  console.log("formulaire prérempli:", f.querySelector("[name=authors]").value, f.querySelector("[name=year]").value);
  const sel = f.querySelector("[name=type]"); sel.value = "book"; sel.dispatchEvent(new w.Event("change"));
  const f2 = d.querySelector("#srcForm");
  f2.querySelector("[name=title]").value = "Mathématiques d’ailleurs";
  f2.querySelector("[name=city]").value = "Paris"; f2.querySelector("[name=publisher]").value = "Seuil";
  f2.querySelector("[name=authors]").value = "Marcia Ascher";
  d.querySelector("#dlg").returnValue = "save"; d.querySelector("#dlg").close();
  console.log("DEBUG entrées:", d.querySelectorAll(".entry").length, "toast:", d.querySelector("#toastMsg").textContent, "ascher:", [...d.querySelectorAll(".entry .ref")].map(e=>e.textContent).filter(t=>/ASCHER/i.test(t)));
  [...d.querySelectorAll(".task button")].find(b => b.textContent === "Tout valider").click();
  [...d.querySelectorAll(".task button")].find(b => b.textContent === "C’est voulu")?.click();
  console.log("\nTâches restantes:", d.querySelectorAll(".task").length, "|", d.querySelector("#tasks").textContent.trim().slice(0,80));
  console.log("bandeau:", d.querySelector("#todoBanner").textContent.trim());
  // norme dans le tableau de bord
  w.dashTab("norme"); d.querySelectorAll("#styleSeg button")[2].click();
  console.log("\nNorme ISO →", d.querySelector("#normName").textContent, "|", d.querySelector(".entry .ref").textContent);
  w.dashTab("controle"); console.log("Contrôle:", d.querySelector("#reports .sum").textContent);
  w.dashTab("export"); console.log("Export désactivé ?", d.querySelector("#dDoc").disabled);
  console.log("\nerreurs:", errs.length ? errs : "aucune");
  process.exit(0);
})();
