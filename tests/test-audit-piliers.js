// Audit des trois piliers de SCIENTUS (2026-10-28) :
// 1. générer la bibliographie d’une rédaction qui cite des sources, collée, en PDF ou en Word ;
// 2. dictée et transcription vocale intelligentes ;
// 3. test anti-plagiat.
const {JSDOM} = require("jsdom");
const base = require("./charger")();
const errs = [];
const egal = (o, a, q) => { if (o !== a) errs.push(`${q} :\n    attendu ${JSON.stringify(a)}\n    obtenu  ${JSON.stringify(o)}`); };
const wait = ms => new Promise(r => setTimeout(r, ms));
const NUMEROTE = "Le paludisme reste endémique en Afrique de l’Ouest [1]. Plusieurs essais cliniques le confirment [2].\n\nRéférences\n1. Smith J, Jones K. Malaria in West Africa. Lancet. 2010;375(9714):45-50.\n2. Bah M. Prévention du paludisme. Dakar: PUD; 2012.";
const PROSE = "En 1990, le multipartisme est rétabli en Côte d’Ivoire. Entre 2002 et 2011, la crise militaro-politique divise le pays. Depuis 2011, la presse se reconstruit lentement.";
// phrase « copiée » d’une thèse de HAL, et la même idée citée correctement avec un appel [1]
const COPIEE = "les journaux ivoiriens ont largement contribué à la polarisation du débat public pendant la crise";
const CITEE = "la presse partisane a durci les clivages identitaires dans les grandes villes du pays";
const remplissage = n => Array.from({length: n}, (_, k) => `Le chapitre ${k + 1} décrit la méthode d’enquête menée auprès des lecteurs et des rédactions de la capitale économique.`).join(" ");
const DOC = `${remplissage(12)} Nous observons que ${COPIEE} et que cette tendance persiste. ${remplissage(6)} Selon les études, ${CITEE} [1]. ${remplissage(6)}`;

(async () => {
  const appels = [];
  const dom = new JSDOM(base, {runScripts: "dangerously", pretendToBeVisual: true, url: "https://bibliocard.pages.dev/", beforeParse(w){
    w.fetch = async url => {
      url = decodeURIComponent(String(url)); appels.push(url); const rep = c => ({ok: true, status: 200, json: async () => c, text: async () => JSON.stringify(c)});
      if(/archives-ouvertes\.fr\/search\/\?q=fulltext_t:/.test(url)){
        const p = (url.match(/fulltext_t:"([^"]+)"/) || [])[1] || "";
        const trouve = COPIEE.includes(p) || CITEE.includes(p);
        return rep({response: {docs: trouve ? [{title_s: ["La presse ivoirienne et la crise"], uri_s: "https://dumas.ccsd.cnrs.fr/dumas-0001", authFullName_s: ["A. Koffi"], producedDateY_i: 2019}] : []}});
      }
      return rep({results: [], docs: [], message: {items: []}, response: {docs: []}, query: {search: []}});
    };
  }});
  const w = dom.window, d = w.document; w.scrollTo = () => {};
  w.HTMLDialogElement.prototype.showModal = function(){ this.open = true; }; w.HTMLDialogElement.prototype.close = function(){ this.open = false; };
  w.addEventListener("error", e => errs.push(e.message));
  await wait(300); d.querySelector('#uiLangSeg [data-l="fr"]').click(); await wait(20);
  const vider = () => w.eval("state.sources = []; state.thread = []; ui.files = []; renderAll();");
  const familles = () => w.eval("state.sources").map(s => s.authors[0] && s.authors[0].family).sort().join(",");
  const coller = async t => { const ta = d.querySelector("#smart"); ta.value = t; ta.dispatchEvent(new w.Event("input")); await d.querySelector("#addBtn").onclick(); await wait(300); };

  // ---- PILIER 1
  vider(); await coller(NUMEROTE);
  egal(familles(), "Bah,Smith", "barre : texte à appels numérotés → ses deux sources");
  vider(); await coller(PROSE);
  egal(w.eval("state.sources.length"), 0, "barre : prose sans source → aucune entrée");
  egal(/ne cite aucune source/.test(w.eval("state.thread").map(m => m.text || "").join(" ")), true, "barre : prose sans source → message clair");
  vider(); d.querySelector("#draft").value = NUMEROTE; await d.querySelector("#genRedac").onclick(); await wait(300);
  egal(familles(), "Bah,Smith", "Rédaction : texte à appels numérotés → ses deux sources");

  // ---- PILIER 2
  vider(); w.eval(`setView("redac")`); const ta = d.querySelector("#draft"); ta.value = "Le langage est un pouvoir"; ta.setSelectionRange(ta.value.length, ta.value.length);
  w.insertSpoken("citation Bourdieu 1982 page 64 point");
  egal(ta.value.replace(/[\u00a0\u202f]/g, " "), "Le langage est un pouvoir (Bourdieu, 1982, p. 64).", "dictée : « citation Bourdieu 1982 page 64 » hors bibliographie");
  egal(w.citeDesSources(ta.value), true, "dictée : la citation dictée est reconnue par la génération");
  await d.querySelector("#genRedac").onclick(); await wait(300);
  egal(familles(), "Bourdieu", "dictée puis génération : Bourdieu (1982) entre dans la bibliographie");
  // transcription d’un enregistrement de 70 s (Whisper simulé : une phrase par tranche de 30 s)
  w.eval(`setView("redac")`); ta.value = "Introduction.";
  let tranches = 0;
  w.loadWhisper = async () => { w.eval("red").asr = async () => ({text: ` le témoin raconte la tranche ${++tranches}`}); return w.eval("red").asr; };
  w.AudioContext = class { decodeAudioData(){ return Promise.resolve({getChannelData: () => new Float32Array(16000 * 70)}); } close(){} };
  const n = await w.transcrireEnregistrement(new w.File([new Uint8Array(64)], "entretien.mp3", {type: "audio/mpeg"}));
  egal(tranches, 3, "transcription : 70 s → 3 tranches de 30 s");
  egal(ta.value, "Introduction.\n\nLe témoin raconte la tranche 1 le témoin raconte la tranche 2 le témoin raconte la tranche 3", "transcription : texte ajouté à la suite, fidèlement");
  egal(n > 0 && /entretien\.mp3 transcrit/.test(d.querySelector("#micSub").textContent), true, "transcription : bilan affiché");

  // ---- PILIER 3
  vider(); w.eval(`ui.files.push({name: "memoire.docx", text: ${JSON.stringify(DOC)}})`); // le document contrôlé, déjà déposé
  await w.runSimilarity(DOC, "memoire.docx"); await wait(50);
  const res = d.querySelector("#simRes").textContent; if(process.argv[2] === "detail") console.log(res);
  egal(/HAL : La presse ivoirienne et la crise/.test(res), true, "anti-plagiat : passage retrouvé dans HAL (DUMAS)");
  egal(/1 passage/.test(res) || /passages? repris sans guillemets/.test(res), true, "anti-plagiat : le passage copié est reproché");
  egal(res.includes("largement contribué à la polarisation") && !res.includes("durci les clivages"), true, "anti-plagiat : le passage cité avec [1] n’est pas reproché");
  egal(/memoire\.docx/.test([...d.querySelectorAll("#simRes .b span")].map(e => e.textContent).join(" ")), false, "anti-plagiat : le document ne se compare pas à lui-même");
  egal(appels.filter(u => /fulltext_t:/.test(u)).length, w.eval("pickProbes")(DOC, w.eval("nbSondes")(DOC)).length, "anti-plagiat : chaque sondage interroge HAL");
  egal(w.eval("nbSondes")(remplissage(1200)), 60, "anti-plagiat : une thèse longue reçoit 60 sondages");

  errs.forEach(e => console.log("ÉCHEC " + e));
  console.log(errs.length ? `erreurs : ${errs.length}` : "erreurs : aucune");
  process.exit(errs.length ? 1 : 0);
})();
