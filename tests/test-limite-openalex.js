// Limite gratuite d’OpenAlex (0,10 $ par jour et par adresse IP, sans clé) : appels gratuits d’abord, réponses
// gardées sur l’appareil, repli CrossRef, et jamais de référence déclarée « introuvable » parce qu’OpenAlex a refusé.
const {JSDOM} = require("jsdom");
const E = require("../js/moteur.js");
const base = require("./charger")();
const errs = [];
const egal = (o, a, q) => { if (o !== a) errs.push(`${q} : attendu ${JSON.stringify(a)}, obtenu ${JSON.stringify(o)}`); };
const wait = ms => new Promise(r => setTimeout(r, ms));

// 1. Moteur : fiches CrossRef (recherche) et autocomplétion OpenAlex
const cr = E.fromCrossrefRecherche({type: "book", title: ["Governing the Commons"], author: [{family: "Ostrom", given: "Elinor"}], issued: {"date-parts": [[1990]]}, publisher: "Cambridge University Press", "is-referenced-by-count": 9000});
egal(`${cr.type} | ${cr.year} | ${cr.city} | ${cr._src} | ${cr._notoriete} | ${cr.origin}`, "book | 1990 | Cambridge | CrossRef | 9000 | Recherche en ligne", "fiche CrossRef");
const ac = E.fromOAAutocomplete({id: "https://openalex.org/W42", short_id: "works/W42", display_name: "La titrologie", hint: "Nanourougo Coulibaly", cited_by_count: 3, external_id: "https://doi.org/10.1/x"});
egal(`${ac._oaId} | ${ac.authors[0].family} | ${ac.doi} | ${ac._notoriete}`, "W42 | Coulibaly | 10.1/x | 3", "fiche d’autocomplétion");

(async () => {
  let budget = true; const appels = [];
  const dom = new JSDOM(base, {runScripts: "dangerously", pretendToBeVisual: true, url: "https://bibliocard.pages.dev/", beforeParse(w){
    w.fetch = async url => {
      url = String(url); appels.push(url);
      const rep = corps => ({ok: true, status: 200, json: async () => corps});
      if (/api\.openalex\.org\/works\?/.test(url)) return budget // recherche payante
        ? rep({results: [{display_name: "Governing the Commons", publication_year: 1990, type: "book", cited_by_count: 20000, authorships: [{author: {display_name: "Elinor Ostrom"}}], primary_location: {source: {host_organization_name: "Cambridge University Press"}}, biblio: {}}]})
        : {ok: false, status: 429, json: async () => ({error: "Rate limit exceeded", retryAfter: 30000})};
      if (/api\.openalex\.org\/autocomplete/.test(url)) return rep({results: []}); // gratuit : toujours servi
      if (/api\.crossref\.org\/works\?/.test(url)) return rep({message: {items: [{type: "book", title: ["Governing the Commons"], author: [{family: "Ostrom", given: "Elinor"}], issued: {"date-parts": [[1990]]}, publisher: "Cambridge University Press", "is-referenced-by-count": 9000}]}});
      if (/openlibrary|archives-ouvertes/.test(url)) return rep({docs: [], response: {docs: []}});
      throw new TypeError("hors ligne");
    };
  }});
  const w = dom.window;
  w.HTMLDialogElement.prototype.showModal = function(){ this.open = true; }; w.HTMLDialogElement.prototype.close = function(){ this.open = false; };
  w.addEventListener("error", e => errs.push(e.message));
  await wait(300);
  const cite = {family: "Ostrom", year: "1990", raw: "E. Ostrom (1990"}, ctx = "E. Ostrom (1990) a proposé une théorie des communs.";
  const payants = () => appels.filter(u => /openalex\.org\/works\?/.test(u)).length;

  // 2. Budget disponible : OpenAlex répond, la réponse est gardée ; la même citation ne coûte plus rien ensuite
  let r = await w.chercherCitation(cite, ctx);
  egal(r.top[0] && r.top[0].title, "Governing the Commons", "trouvée par OpenAlex");
  egal(payants(), 1, "un appel payant");
  await w.chercherCitation(cite, ctx);
  egal(payants(), 1, "deuxième fois : réponse gardée sur l’appareil");

  // 3. Budget épuisé : CrossRef prend le relais, puis OpenAlex n’est plus appelé jusqu’à la remise à zéro
  budget = false;
  const autre = {family: "Ostrom", year: "1991", raw: "E. Ostrom (1991"};
  r = await w.chercherCitation(autre, ctx);
  egal(r.top[0] && r.top[0]._src, "CrossRef", "repli CrossRef");
  egal(!!w.localStorage.getItem("bibliocard.oa.bloque"), true, "blocage noté jusqu’à minuit UTC");
  const avant = payants();
  await w.chercherCitation({family: "Ostrom", year: "1992", raw: "E. Ostrom (1992"}, ctx);
  egal(payants(), avant, "plus d’appel payant une fois le budget épuisé");

  // 4. Les appels gratuits passent toujours ; une référence non confirmée n’est pas déclarée introuvable
  const n = appels.filter(u => /autocomplete/.test(u)).length;
  const v = await w.checkOne({title: "Une œuvre absente des bases ouvertes", year: "2015", doi: "", authors: [{family: "Kouassi", given: "A."}], type: "book"});
  egal(appels.filter(u => /autocomplete/.test(u)).length, n + 1, "autocomplétion gratuite appelée malgré le blocage");
  egal(v.v === "none" || v.v === "suspect", false, "pas de verdict « introuvable » sans OpenAlex");

  // 5. OpenAlex injoignable (réseau) : la vérification attend, elle n’accuse pas
  w.fetch = async url => { if (/openalex/.test(String(url))) throw new TypeError("hors ligne"); return {ok: true, status: 200, json: async () => ({response: {docs: []}})}; };
  const v2 = await w.checkOne({title: "Une autre œuvre", year: "2016", doi: "", authors: [{family: "Yao", given: "B."}], type: "book"});
  egal(!!v2.plusTard, true, "sans OpenAlex ni confirmation HAL : à vérifier plus tard");

  console.log(errs.length ? errs.join("\n") + `\nerreurs : ${errs.length}` : "erreurs : aucune");
})();
