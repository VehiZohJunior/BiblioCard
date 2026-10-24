// Test : existence
const {JSDOM} = require("jsdom"); const fs = require("fs");
const mode = process.argv[2] || "online";
const html = require("./charger")();
const dom = new JSDOM(html, {runScripts:"dangerously", pretendToBeVisual:true, url:"https://example.org/", beforeParse(w){
  w.fetch = async (url) => {
    if(mode === "blocked") throw new TypeError("Failed to fetch");
    const ok = d => ({ok:true, status:200, json: async () => d});
    if(url.includes("api.crossref.org/works/")) return url.includes("10.9999") ? {ok:false, status:404} : {ok:false, status:404};
    if(url.includes("openalex")){
      const q = decodeURIComponent(url.split("search=")[1]);
      if(/Governing the commons/i.test(q)) return ok({results:[{display_name:"Governing the Commons: The Evolution of Institutions for Collective Action", publication_year:1990, doi:"https://doi.org/10.1017/cbo9780511807763", authorships:[{author:{display_name:"Elinor Ostrom"}}], primary_location:{source:{display_name:"Cambridge University Press"}}, biblio:{}}]});
      if(/Islam et philosophie/i.test(q)) return ok({results:[{display_name:"Islam et philosophie : leçons d'une rencontre", publication_year:2002, doi:"https://doi.org/10.3917/dio.202.0145", authorships:[{author:{display_name:"Souleymane Bachir Diagne"}}], primary_location:{source:{display_name:"Diogène"}}, biblio:{volume:"", issue:"202", first_page:"145", last_page:"151"}}]});
      if(/Homme moderne/i.test(q)) return ok({results:[{display_name:"L'homme moderne et son éducation", publication_year:1962, authorships:[{author:{display_name:"Gaston Berger"}}], biblio:{}}]});
      return ok({results:[]});
    }
    if(url.includes("archives-ouvertes")) return ok({response:{docs:[]}});
    return {ok:false, status:404};
  };
}});
const w = dom.window; const errs = [];
w.addEventListener("error", e => errs.push(e.message));
w.HTMLDialogElement.prototype.showModal = function(){ this.open = true; };
w.HTMLDialogElement.prototype.close = function(){ this.open = false; this.dispatchEvent(new w.Event("close")); };
(async () => {
  await new Promise(r => setTimeout(r, 100)); const d = w.document;
  d.querySelector("#demoBtn").click(); await new Promise(r => setTimeout(r, 1200));
  console.log("MODE", mode);
  console.log("Synthèse:", [...d.querySelectorAll("#facts div")].map(x => x.querySelector("dt").textContent + " = " + x.querySelector("dd").textContent).join(" | "));
  w.dashTab("existence");
  console.log("Existence:", d.querySelector("#existBox .kv, #existBox .note")?.textContent.replace(/\s+/g," ").trim().slice(0,160));
  d.querySelectorAll("#existBox .card").forEach(c => console.log("  ", c.querySelector(".tag").textContent, "—", c.querySelector("h5").textContent.slice(0,45), "→", c.querySelector(".legend").textContent.slice(0,110)));
  console.log("À faire:"); d.querySelectorAll(".task b").forEach(b => console.log("  •", b.textContent.slice(0,90)));
  const en = d.querySelector("[data-enrich]"); if(en){ en.click(); console.log("Compléter →", d.querySelector("#toastMsg").textContent); }
  console.log("Marges:", [...d.querySelectorAll(".marks")].map(m => m.textContent).join(" | ").slice(0,300));
  console.log("erreurs:", errs.length ? errs : "aucune");
  process.exit(0);
})();
