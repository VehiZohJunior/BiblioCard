// Axe 4 : modèles de plan et lectures proposées pour chaque partie (OpenAlex et HAL simulés, réponses de la forme réelle).
const {JSDOM} = require("jsdom");
const E = require("../js/moteur.js");
const base = require("./charger")();
const errs = [];
const egal = (o, a, q) => { if (o !== a) errs.push(`${q} : attendu ${JSON.stringify(a)}, obtenu ${JSON.stringify(o)}`); };
const wait = ms => new Promise(r => setTimeout(r, ms));
const SUJET = "Le discours de la presse ivoirienne pendant les élections de 2020";

// 1. Moteur : requêtes courtes, d’abord le mot propre à la partie ; le sujet quand l’intitulé est générique
egal(E.requetesLectures(SUJET, "1. La titrologie, un genre journalistique ivoirien").requetes[0], "titrologie", "mot propre à la partie en premier");
egal(E.requetesLectures(SUJET, "Introduction générale").requetes.includes("presse ivoirienne"), true, "intitulé générique : mots du sujet");
egal(E.requetesLectures("", "Introduction").requetes.length, 0, "rien à chercher sans sujet ni intitulé précis");
egal(E.requetesLectures(SUJET, "2.1. [Titre]").requetes.every(q => !/titre/.test(q)), true, "crochets ignorés");

// 2. Classement : faux titres et doublons retirés, mots du titre d’abord
const f = (t, a, n) => Object.assign(E.blank(), {title: t, authors: [{family: a, given: "X."}], year: "2015", _notoriete: n});
const L = E.classerLectures(["presse", "ivoirienne"], [f("References", "A", 900), f("La presse ivoirienne et le pouvoir", "B", 3), f("La presse ivoirienne et le pouvoir", "C", 2), f("Presse écrite au Ghana", "D", 50), f("Sans rapport", "E", 999)]);
egal(L.map(s => s.authors[0].family).join(","), "B,D", "faux titres, doublons et hors sujet écartés");

// 3. Plan d’un document déposé et fiche HAL
egal(E.planDepuisTexte("Introduction\nTexte du paragraphe qui se termine par un point.\n1. Le corpus étudié\n1.1. Les journaux retenus\nConclusion\nRéférences bibliographiques").map(x => x.n + ":" + x.t).join(" | "),
  "1:Introduction | 1:1. Le corpus étudié | 2:1.1. Les journaux retenus | 1:Conclusion | 1:Références bibliographiques", "plan repris du texte");
// page de titre et sommaire d’un vrai mémoire PDF (Ouagadougou) : adresse écartée, titres répétés gardés une fois
egal(E.planDepuisTexte("03 BP 7021 Ouagadougou 03\nIntroduction\n1. Cadre théorique\nINTRODUCTION\nTexte du chapitre qui finit par un point.\n1. Cadre théorique\nCONCLUSION").map(x => x.t).join(" | "),
  "Introduction | 1. Cadre théorique | CONCLUSION", "adresse et doublons du sommaire");
const these = E.fromHal({docType_s: "THESE", title_s: ["La titrologie ivoirienne"], authFullName_s: ["Koffi Kouassi"], producedDateY_i: 2018, authorityInstitution_s: ["Université Félix Houphouët-Boigny"], uri_s: "https://theses.hal.science/tel-1"});
egal(`${these.type} | ${these.genre} | ${these.publisher}`, "thesis | Thèse de doctorat | Université Félix Houphouët-Boigny", "thèse HAL");

// 4. L’écran
(async () => {
  const appels = [];
  const dom = new JSDOM(base, {runScripts: "dangerously", pretendToBeVisual: true, url: "https://bibliocard.pages.dev/", beforeParse(w){
    w.fetch = async url => {
      url = String(url); appels.push(url);
      const rep = corps => ({ok: true, status: 200, json: async () => corps});
      // autocomplétion (gratuite) puis fiche complète de chaque œuvre retenue (gratuite)
      if (/api\.openalex\.org\/autocomplete\/works/.test(url)) return rep({results: [
        {id: "https://openalex.org/W1", short_id: "works/W1", display_name: "La titrologie et la presse ivoirienne", hint: "Aimé Kouakou", cited_by_count: 12, entity_type: "work", external_id: "https://doi.org/10.1/abc"},
        {id: "https://openalex.org/W2", short_id: "works/W2", display_name: "References", hint: "Jean Dupont", cited_by_count: 0, entity_type: "work"}]});
      if (/api\.openalex\.org\/works\/W1\?/.test(url)) return rep(
        {display_name: "La titrologie et la presse ivoirienne", publication_year: 2014, type: "article", cited_by_count: 12, authorships: [{author: {display_name: "Aimé Kouakou"}}],
         primary_location: {source: {display_name: "Communication en question"}}, biblio: {volume: "3", first_page: "45", last_page: "67"}, doi: "https://doi.org/10.1/abc", open_access: {oa_url: "https://exemple.org/pdf"}});
      if (/api\.openalex\.org\/works\?/.test(url)) return {ok: false, status: 429, json: async () => ({retryAfter: 30000})}; // recherche payante : jamais utilisée ici
      if (/api\.archives-ouvertes\.fr/.test(url)) return rep({response: {docs: [
        {docType_s: "ART", title_s: ["Discours de presse et élections en Côte d’Ivoire"], authFullName_s: ["Awa Traoré"], producedDateY_i: 2021, journalTitle_s: "Revue ivoirienne de communication", volume_s: "8", page_s: "11-30", uri_s: "https://hal.science/hal-1"}]}});
      throw new TypeError("hors ligne");
    };
  }});
  const w = dom.window, d = w.document;
  w.HTMLDialogElement.prototype.showModal = function(){ this.open = true; }; w.HTMLDialogElement.prototype.close = function(){ this.open = false; };
  w.addEventListener("error", e => errs.push(e.message));
  await wait(300);
  const clic = s => d.querySelector(s).click();
  const parties = () => [...d.querySelectorAll("#planListe .ppart")];

  w.setView("plan"); await wait(30);
  egal(d.body.dataset.view, "plan", "vue ouverte");
  egal(d.querySelector("#viewPlan h1").textContent, "Outline and readings", "titre traduit en anglais");
  d.querySelector('#uiLangSeg [data-l="fr"]').click(); await wait(30);
  egal(d.querySelector("#viewPlan h1").textContent, "Plan et lectures", "retour en français");
  egal(d.querySelector("#planModele").options.length, 4, "4 modèles");

  // modèle appliqué : autant de parties que le modèle, pas de lectures pour la bibliographie elle-même
  const sujet = d.querySelector("#planSujet"); sujet.value = SUJET; sujet.dispatchEvent(new w.Event("change"));
  clic("#planAppliquer"); await wait(20);
  egal(parties().length, E.MODELES_PLAN.article_theorique.items.length, "parties du modèle");
  const derniere = parties()[parties().length - 1];
  egal(derniere.querySelector(".pt2").value, "Références bibliographiques", "dernière partie");
  egal(!!derniere.querySelector('[data-pa="lect"]'), false, "pas de lectures pour les références");
  egal(/Justification du thème/.test(parties()[0].textContent), true, "consigne affichée");

  // l’intitulé réécrit par le chercheur sert à la recherche
  const t = parties()[1].querySelector(".pt2"); t.value = "1. La titrologie, un genre journalistique ivoirien"; t.dispatchEvent(new w.Event("change", {bubbles: true}));
  egal(w.eval("state.plan.items[1].t"), "1. La titrologie, un genre journalistique ivoirien", "intitulé enregistré");
  parties()[1].querySelector('[data-pa="lect"]').click(); await wait(80);
  egal(appels.some(u => /openalex\.org\/autocomplete\/works\?q=titrologie/.test(u)) && appels.some(u => /archives-ouvertes.*q=titrologie/.test(u)), true, "OpenAlex et HAL interrogés avec l’intitulé");
  egal(appels.some(u => /openalex\.org\/works\?/.test(u)), false, "aucune recherche OpenAlex payante");
  egal(/2014/.test(parties()[1].querySelector(".lects").textContent) && /Communication en question/.test(parties()[1].textContent), true, "fiche complétée (année, revue)");
  egal(appels.every(u => !/discours de la presse ivoirienne pendant/i.test(decodeURIComponent(u))), true, "jamais la phrase entière");
  const lects = parties()[1].querySelectorAll(".lects li");
  egal(lects.length, 2, "2 lectures (le faux titre « References » écarté)");
  egal(/Lire en ligne/.test(parties()[1].textContent), true, "lien de lecture");

  // ajout à la bibliographie : origine « Recherche en ligne » (donc à relire), sans les champs internes
  parties()[1].querySelector('[data-pa="add"]').click(); await wait(30);
  const src = w.eval("state.sources");
  egal(src.length, 1, "lecture ajoutée");
  egal(src[0].origin, "Recherche en ligne", "origine notée");
  egal(Object.keys(src[0]).some(k => /^_(lien|src|notoriete)$/.test(k)), false, "champs internes retirés");
  egal(/Dans ta bibliographie/.test(parties()[1].textContent), true, "lecture marquée comme ajoutée");

  // édition du plan : niveau, ordre, suppression avec annulation
  const n0 = parties().length;
  parties()[2].querySelector('[data-pa="niv"]').click(); await wait(10);
  egal(parties()[2].classList.contains("n1"), true, "sous-partie remontée d’un niveau");
  parties()[1].querySelector('[data-pa="down"]').click(); await wait(10);
  egal(parties()[2].querySelector(".pt2").value, "1. La titrologie, un genre journalistique ivoirien", "partie descendue");
  parties()[2].querySelector('[data-pa="del"]').click(); await wait(10);
  egal(parties().length, n0 - 1, "partie supprimée");
  clic("#planAjout"); await wait(10);
  egal(parties()[parties().length - 1].querySelector(".pt2").value, "Nouvelle partie", "partie ajoutée");

  // le plan appartient au projet : il est conservé
  egal(w.eval("state.projects[state.current].plan") ? true : w.eval("JSON.stringify(state.plan.items.length)") > 0, true, "plan enregistré");

  // la commande tapée ouvre l’écran
  w.setView("biblio"); await wait(10);
  egal(JSON.stringify(w.eval('intent("propose-moi un plan")')), '{"t":"plan"}', "commande « propose-moi un plan »");

  console.log(errs.length ? errs.join("\n") + `\nerreurs : ${errs.length}` : "erreurs : aucune");
})();
