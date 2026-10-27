// Valeur ajoutée de SCIENTUS : compléter en ligne les éléments que le chercheur n’a pas fournis
// (livre : éditeur et ville ; article : revue, volume, numéro, pages), sans jamais écraser ce qu’il a écrit.
const {JSDOM} = require("jsdom");
const base = require("./charger")();
const errs = [];
const egal = (o, a, q) => { if (o !== a) errs.push(`${q} : attendu ${JSON.stringify(a)}, obtenu ${JSON.stringify(o)}`); };
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const dom = new JSDOM(base, {runScripts: "dangerously", pretendToBeVisual: true, url: "https://bibliocard.pages.dev/", beforeParse(w){
    w.fetch = async url => {
      url = String(url); const rep = c => ({ok: true, status: 200, json: async () => c});
      if (/openlibrary\.org\/search\.json/.test(url)) return rep({docs: [{key: "/works/OL1W"}]});
      if (/openlibrary\.org\/works\/OL1W\/editions/.test(url)) return rep({entries: [{publish_date: "2000", publishers: ["Karthala"], publish_places: ["Paris"]}]});
      if (/api\.crossref\.org\/works\?query\.bibliographic/.test(url) && /Language%20and%20Control/.test(url)) return rep({message: {items: [{type: "book", title: ["Language and Control"], author: [{family: "Fowler", given: "Roger"}, {family: "Hodge", given: "Bob"}, {family: "Kress", given: "Gunther"}, {family: "Trew", given: "Tony"}], issued: {"date-parts": [[1979]]}, publisher: "Routledge"}]}});
      if (/api\.crossref\.org\/works\?query\.bibliographic/.test(url)) return rep({message: {items: [{type: "journal-article", title: ["Framing: Toward Clarification of a Fractured Paradigm"], author: [{family: "Entman", given: "Robert M."}], issued: {"date-parts": [[1993]]}, "container-title": ["Journal of Communication"], volume: "43", issue: "4", page: "51-58", DOI: "10.1111/j.1460-2466.1993.tb01304.x", publisher: "Oxford University Press"}]}});
      return rep({results: [], docs: [], message: {items: []}, response: {docs: []}});
    };
  }});
  const w = dom.window, d = w.document;
  w.HTMLDialogElement.prototype.showModal = function(){ this.open = true; }; w.HTMLDialogElement.prototype.close = function(){ this.open = false; };
  w.addEventListener("error", e => errs.push(e.message));
  await wait(300);
  d.querySelector('#uiLangSeg [data-l="fr"]').click(); await wait(20);
  w.eval(`state.sources = [
    Object.assign(blank(), {id: "livre", type: "book", authors: [{family: "Mbembe", given: "Achille"}], year: "2000", title: "De la postcolonie"}),
    Object.assign(blank(), {id: "art", type: "article", authors: [{family: "Entman", given: "Robert M."}], year: "1993", title: "Framing: Toward Clarification of a Fractured Paradigm", container: "Journal of Communication"}),
    Object.assign(parseRefHeuristic("FOWLER Roger et al., 1979, Language and Control, London, Routledge."), {id: "etal"}),
    Object.assign(blank(), {id: "complet", type: "book", authors: [{family: "Bourdieu", given: "Pierre"}], year: "1982", title: "Ce que parler veut dire", publisher: "Fayard", city: "Paris"})
  ];`);
  await w.completerEnLigne(); await wait(50);
  const S = id => w.eval(`state.sources.find(s => s.id === "${id}")`);
  egal(`${S("livre").publisher} | ${S("livre").city}`, "Karthala | Paris", "livre : éditeur et ville trouvés");
  egal(`${S("art").volume} | ${S("art").issue} | ${S("art").pages}`, "43 | 4 | 51-58", "article : volume, numéro, pages trouvés");
  egal(S("art").container, "Journal of Communication", "ce que le chercheur a écrit n’est pas écrasé");
  egal(S("complet")._enligne, undefined, "référence déjà complète : rien n’est ajouté");
  egal(S("livre")._enligne.join(","), "éditeur,ville", "les ajouts sont marqués");
  egal(/Complété en ligne \(Open Library\) : éditeur, ville/.test(d.querySelector("#biblio").textContent), true, "mention « Complété en ligne » dans la bibliographie");
  egal(/J’ai complété en ligne/.test(d.querySelector("#thread").textContent), true, "bilan affiché");
  // « et al. » : tous les auteurs retrouvés en ligne et écrits jusqu’au dernier
  egal(S("etal").authors.map(a => a.family).join(","), "Fowler,Hodge,Kress,Trew", "et al. remplacé par la liste complète des auteurs");
  egal(S("etal").etAl, undefined, "plus de marque « et al. » une fois la liste complète");
  egal(/FOWLER Roger, HODGE Bob, KRESS Gunther et TREW Tony/.test(d.querySelector("#biblio").textContent), true, "bibliographie : tous les auteurs, pas « et al. »");
  egal(/et al/i.test(d.querySelector("#biblio").textContent), false, "aucun « et al. » dans la bibliographie");
  // une fiche relue et enregistrée perd la mention
  console.log(errs.length ? errs.join("\n") + `\nerreurs : ${errs.length}` : "erreurs : aucune");
})();
