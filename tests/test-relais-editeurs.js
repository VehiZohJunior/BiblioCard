// Relais Cloudflare du propriétaire (relais/relais-editeurs.js) : lit sur la page de présentation d’un document,
// même payant, les seules informations bibliographiques publiques de l’éditeur. Exigence du 2026-10-27.
const fs = require("fs"), path = require("path"), os = require("os");
const {JSDOM} = require("jsdom");
const base = require("./charger")();
const errs = [];
const egal = (o, a, q) => { if (o !== a) errs.push(`${q} :\n    attendu ${JSON.stringify(a)}\n    obtenu  ${JSON.stringify(o)}`); };
const wait = ms => new Promise(r => setTimeout(r, ms));
const SCIENTUS = "https://vehizohjunior.github.io";
// page de présentation de type Persée / OJS : balises de bibliographie, mais aussi résumé, mots clés, e-mail
const PAGE = `<!doctype html><html><head><title>Le champ littéraire</title>
<meta name="DC.title" content="Le champ littéraire"><meta name="DC.creator" content="Bourdieu, Pierre">
<meta name="DC.description" content="Bilan théorique d&apos;un ensemble de recherches sur le champ littéraire.">
<meta name="DC.publisher" content="Maison des sciences de l&apos;homme"><meta name="DC.publisher" content="Persée - Portail des revues scientifiques en SHS">
<meta name="DC.isPartOf" content="0335-5322"><meta name="DC.isPartOf" content="Actes de la Recherche en Sciences Sociales">
<meta content="89" name="citation_volume"><meta name="citation_issue" content="1"><meta name="citation_firstpage" content="3"><meta name="citation_lastpage" content="46">
<meta name="citation_date" content="1991"><meta name="citation_author_email" content="auteur@exemple.org"><meta name="citation_keywords" content="champ ; littérature">
<meta name="citation_abstract" content="Ce texte est le bilan théorique…"></head><body>…</body></html>`;

(async () => {
  // 1. le relais lui-même
  const fichier = path.join(os.tmpdir(), `relais-${process.pid}.mjs`);
  fs.copyFileSync(path.join(__dirname, "..", "relais", "relais-editeurs.js"), fichier);
  const relais = (await import("file://" + fichier.replace(/\\/g, "/"))).default;
  let pageServie = PAGE, urlFinale = "https://www.persee.fr/doc/arss_1991_num_89_1_2986", statut = 200;
  globalThis.fetch = async () => ({ok: statut === 200, status: statut, url: urlFinale, headers: new Headers({"Content-Type": "text/html; charset=utf-8"}), text: async () => pageServie});
  const appel = async (q, origine = SCIENTUS) => { const r = await relais.fetch(new Request("https://relais.exemple/?" + q, {headers: {Origin: origine}}), {}, {}); return {statut: r.status, cors: r.headers.get("Access-Control-Allow-Origin"), corps: await r.json()}; };
  let r = await appel("doi=10.3406/arss.1991.2986");
  const f = r.corps.fiche || {};
  egal(`${f.titre}|${f.auteurs}|${f.revue}|${f.volume}|${f.numero}|${f.pages}|${f.annee}`, "Le champ littéraire|Bourdieu, Pierre|Actes de la Recherche en Sciences Sociales|89|1|3-46|1991", "relais : champs de bibliographie de la page");
  egal(f.editeur, "Maison des sciences de l’homme", "relais : l’éditeur, pas la plateforme Persée");
  egal(/bilan th[ée]orique|auteur@|champ ; litt/i.test(JSON.stringify(r.corps)), false, "relais : ni résumé, ni mots clés, ni e-mail");
  egal(r.cors, SCIENTUS, "relais : réponse autorisée pour SCIENTUS seulement");
  egal((await appel("doi=10.3406/arss.1991.2986", "https://site-etranger.example")).statut, 403, "relais : un autre site est refusé");
  for(const q of ["url=http://127.0.0.1/admin", "url=http://localhost:8080/", "url=http://192.168.1.1/", "url=file:///etc/passwd", "doi=pas-un-doi"]) egal((await appel(q)).statut, 400, `relais : ${q} refusé`);
  urlFinale = "http://10.0.0.5/interne"; egal((await appel("doi=10.1234/essai")).statut, 400, "relais : une redirection vers le réseau privé est refusée"); urlFinale = "https://www.persee.fr/doc/x";
  pageServie = `<html><head><title>Client Challenge</title></head><body>Just a moment...</body></html>`;
  egal((await appel("doi=10.1234/essai")).corps.bloque, true, "relais : page protégée contre les robots, jamais contournée");
  statut = 403; egal((await appel("doi=10.1234/essai")).corps.bloque, true, "relais : 403 de l’éditeur respecté"); statut = 200;
  fs.unlinkSync(fichier);

  // 2. SCIENTUS avec le relais : une référence sans DOI, complétée par la page de sa revue (OJS)
  const appels = [];
  const dom = new JSDOM(base, {runScripts: "dangerously", pretendToBeVisual: true, url: SCIENTUS + "/BiblioCard/", beforeParse(w){
    w.fetch = async url => {
      url = String(url); appels.push(url); const rep = c => ({ok: true, status: 200, json: async () => c, text: async () => JSON.stringify(c)});
      if (/openalex\.org\/autocomplete\/works/.test(url)) return rep({results: [{id: "https://openalex.org/W1", display_name: "La presse écrite en Côte d’Ivoire", entity_type: "work", hint: "Koné", cited_by_count: 3, external_id: null}]});
      if (/openalex\.org\/works\/W1/.test(url)) return rep({id: "https://openalex.org/W1", display_name: "La presse écrite en Côte d’Ivoire", publication_year: 2015, authorships: [{author: {display_name: "Aminata Koné"}}], primary_location: {landing_page_url: "https://revues.univ-exemple.ci/index.php/ril/article/view/45"}});
      if (/relais\.scientus\.workers\.dev/.test(url)) return rep({fiche: {titre: "La presse écrite en Côte d’Ivoire", auteurs: ["Koné, Aminata"], revue: "Revue Ivoirienne des Lettres", volume: "12", numero: "2", pages: "45-60", annee: "2015"}, page: "https://revues.univ-exemple.ci/index.php/ril/article/view/45"});
      return rep({results: [], docs: [], message: {items: []}, response: {docs: []}, data: []});
    };
  }});
  const w = dom.window, d = w.document; w.scrollTo = () => {};
  w.HTMLDialogElement.prototype.showModal = function(){ this.open = true; }; w.HTMLDialogElement.prototype.close = function(){ this.open = false; };
  w.addEventListener("error", e => errs.push(e.message));
  await wait(300); d.querySelector('#uiLangSeg [data-l="fr"]').click(); await wait(20);
  w.BIBLIOCARD_CONFIG = w.BIBLIOCARD_CONFIG || {}; w.BIBLIOCARD_CONFIG.relaisEditeurs = "https://relais.scientus.workers.dev/";
  w.eval(`state.sources = [Object.assign(blank(), {id: "kone", type: "article", authors: [{family: "Koné", given: "Aminata"}], year: "2015", title: "La presse écrite en Côte d’Ivoire", container: "Revue Ivoirienne des Lettres"})];`);
  await w.completerEnLigne(); await wait(50);
  const k = w.eval(`state.sources[0]`);
  egal(`${k.volume}|${k.issue}|${k.pages}`, "12|2|45-60", "SCIENTUS : volume, numéro et pages lus sur la page de la revue");
  egal((k._sourcesLigne || []).join(), "page de l’éditeur", "SCIENTUS : la source est citée");
  egal(appels.some(u => /relais\.scientus\.workers\.dev\/\?url=https%3A%2F%2Frevues\.univ-exemple\.ci/.test(u)), true, "SCIENTUS : le relais reçoit l’adresse de la page de présentation");
  // sans relais configuré : aucun appel
  w.BIBLIOCARD_CONFIG.relaisEditeurs = ""; appels.length = 0;
  w.eval(`state.sources = [Object.assign(blank(), {id: "kone2", type: "article", authors: [{family: "Koné", given: "Aminata"}], year: "2015", title: "La presse écrite en Côte d’Ivoire", container: "Revue Ivoirienne des Lettres"})];`);
  await w.completerEnLigne(); await wait(50);
  egal(appels.some(u => /workers\.dev/.test(u)), false, "sans relais installé, aucun appel au relais");
  errs.forEach(e => console.log("ÉCHEC " + e));
  console.log(errs.length ? `erreurs : ${errs.length}` : "erreurs : aucune");
  process.exit(errs.length ? 1 : 0);
})();
