// Test : redaction similitudes
const {JSDOM} = require("jsdom"); const fs = require("fs");
const html = require("./charger")();
let saved = null;
const dom = new JSDOM(html, {runScripts:"dangerously", pretendToBeVisual:true, url:"https://example.org/", beforeParse(w){
  w.fetch = async (url) => {
    const ok = d => ({ok:true, status:200, json: async () => d});
    if(url.includes("wikipedia.org") && url.includes("list=search")) return ok({query:{search: decodeURIComponent(url).includes("médias dans la société") ? [{title:"Médias en Côte d’Ivoire"}] : []}});
    if(url.includes("wikipedia.org") && url.includes("prop=extracts")) return ok({query:{pages:{"1":{extract:"Le rôle des médias dans la société ivoirienne reste central pour le débat public national depuis le retour du multipartisme en 1990."}}}});
    if(url.includes("openalex")) return ok({results:[]});
    return {ok:false, status:404};
  };
}});
const w = dom.window; const errs = [];
w.addEventListener("error", e => errs.push(e.message));
w.HTMLDialogElement.prototype.showModal = function(){ this.open = true; };
w.HTMLDialogElement.prototype.close = function(){ this.open = false; this.dispatchEvent(new w.Event("close")); };
w.URL.createObjectURL = b => { saved = b; return "blob:x"; }; w.URL.revokeObjectURL = () => {};
(async () => {
  await new Promise(r => setTimeout(r, 100)); const d = w.document;
  d.querySelector("#demoBtn").click(); await new Promise(r => setTimeout(r, 500));
  w.setView("redac");
  console.log("Vue:", d.body.dataset.view, "| bibliographie masquée:", w.getComputedStyle(d.querySelector("#viewBiblio")).display);
  d.querySelector("#draftTitle").value = "Médias et mondialisation";
  const ta = d.querySelector("#draft");
  ["introduction deux points la mondialisation est un défi virgule comme le montre citation Amin point",
   "nouveau paragraphe Le rôle des médias dans la société ivoirienne reste central pour le débat public national point",
   "ouvrez les guillemets la presse est libre fermez les guillemets citation Diagne point",
   "une phrase en trop point", "efface ça"].forEach(t => w.insertSpoken(t));
  console.log("TEXTE DICTÉ:\n" + ta.value);
  console.log("compteur:", d.querySelector("#wcount").textContent);
  // insérer une citation via le sélecteur
  d.querySelector("#citeIns").click(); d.querySelector("#pickPg").value = "45"; [...d.querySelectorAll(".pick [data-id]")].find(b => /Koné/.test(b.textContent)).click();
  console.log("après sélecteur:", ta.value.slice(-40));
  // texte long pour la similitude : on ajoute un passage copié depuis le mémoire d'exemple
  ta.value += "\n\nComme on le sait, la question de la mondialisation traverse les sciences humaines africaines et elle constitue d’abord un défi politique pour nos États. Le rôle des médias dans la société ivoirienne reste central pour le débat public national.";
  await w.runSimilarity();
  console.log("\nSIMILITUDES:", d.querySelector(".simscore").textContent.replace(/\s+/g," ").trim());
  d.querySelectorAll("#simRes .pass").forEach(p => console.log("  ▸", p.querySelector("small").textContent.slice(0,90)));
  console.log("  sources:", [...d.querySelectorAll("#simRes .bars .b")].map(b => b.children[0].textContent + " " + b.children[2].textContent + "%").join(" | "));
  console.log("Tâche ajoutée:", [...d.querySelectorAll(".task b")].map(b => b.textContent).filter(t => /repris/.test(t)));
  d.querySelector("#wDoc").click(); await new Promise(r => setTimeout(r, 7000));
  const doc = (await saved.text()).replace(/<[^>]+>/g, "\n").replace(/\n+/g, "\n");
  console.log("\nEXPORT WORD (fin):", doc.slice(doc.indexOf("Références")).slice(0, 400));
  console.log("erreurs:", errs.length ? errs : "aucune");
  process.exit(0);
})();
