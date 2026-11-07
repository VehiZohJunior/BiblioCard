// De bout en bout : l’application SCIENTUS avec le VRAI serveur Django (serveur/), démarré sur le PC.
// Deux appareils, un compte : sauvegarde en ligne, reprise sur l’autre appareil, la version la plus récente gagne ;
// puis l’anti-plagiat interroge la base des mémoires déposés par un établissement.
// Ignoré si l’environnement Python du serveur (serveur/.venv) n’est pas installé.
const {JSDOM} = require("jsdom");
const {spawn, execFileSync} = require("child_process");
const fs = require("fs"), path = require("path"), os = require("os");
const base = require("./charger")();
const errs = [];
const egal = (o, a, q) => { if (o !== a) errs.push(`${q} :\n    attendu ${JSON.stringify(a)}\n    obtenu  ${JSON.stringify(o)}`); };
const wait = ms => new Promise(r => setTimeout(r, ms));
const SERVEUR = path.join(__dirname, "..", "serveur"), PY = path.join(SERVEUR, ".venv", "Scripts", "python.exe");
if(!fs.existsSync(PY)){ console.log("ignoré : serveur/.venv absent"); console.log("erreurs : aucune"); process.exit(0); }
const PORT = 8765, URL_SRV = `http://127.0.0.1:${PORT}`, ORIGINE = "https://bibliocard.pages.dev";
const DB = path.join(os.tmpdir(), `scientus-e2e-${process.pid}.sqlite3`);
const env = {...process.env, SCIENTUS_DEBUG: "1", SCIENTUS_DB: DB, SCIENTUS_ORIGINES: ORIGINE};

async function appareil(nom){
  const dom = new JSDOM(base, {runScripts: "dangerously", pretendToBeVisual: true, url: ORIGINE + "/", beforeParse(w){
    w.BIBLIOCARD_CONFIG = {serveurScientus: URL_SRV};
    // le serveur réel pour le serveur SCIENTUS (avec l’origine de l’application) ; rien d’autre ne sort
    w.fetch = async (url, init = {}) => { url = String(url);
      if(url.startsWith(URL_SRV)){ const r = await fetch(url, {...init, signal: undefined, headers: {...(init.headers || {}), Origin: ORIGINE}}); return {ok: r.ok, status: r.status, json: () => r.json(), text: () => r.text()}; }
      return {ok: true, status: 200, json: async () => ({results: [], docs: [], message: {items: []}, response: {docs: []}, query: {search: []}}), text: async () => ""}; };
  }});
  const w = dom.window; w.scrollTo = () => {};
  w.HTMLDialogElement.prototype.showModal = function(){ this.open = true; }; w.HTMLDialogElement.prototype.close = function(){ this.open = false; };
  w.addEventListener("error", e => errs.push(`${nom} : ${e.message}`));
  await wait(400); w.document.querySelector('#uiLangSeg [data-l="fr"]').click(); await wait(20);
  return w;
}
async function formulaire(w, mode, email, mdp){
  const f = w.document.querySelector("#nuageF"); f.querySelector("[name=email]").value = email; f.querySelector("[name=mdp]").value = mdp;
  f.querySelector(`[data-m="${mode}"]`).click(); // le bouton envoie le formulaire
  for(let i = 0; i < 100 && !w.eval("nuage.connecte()"); i++) await wait(100);
  await wait(500);
}

(async () => {
  execFileSync(PY, ["manage.py", "migrate", "-v", "0"], {cwd: SERVEUR, env});
  const srv = spawn(PY, ["manage.py", "runserver", `127.0.0.1:${PORT}`, "--noreload"], {cwd: SERVEUR, env, stdio: "ignore"});
  try{
    for(let i = 0; i < 60; i++){ try{ if((await fetch(URL_SRV + "/api/etat")).ok) break; }catch(e){} await wait(250); }

    // APPAREIL A : création du compte, un projet, sauvegarde en ligne
    const A = await appareil("A");
    egal(A.document.querySelector("#nuageBox").hidden, false, "la sauvegarde en ligne apparaît dans le menu quand le serveur est configuré");
    await formulaire(A, "inscription", "awa.kone@exemple.ci", "Presse-Ivoirienne-2026");
    egal(A.eval("nuage.connecte()"), true, "A : compte créé et connecté");
    A.eval(`(() => { const v = nuage.lire(); delete v.derniere; nuage.ecrire(v); })()`); // attendre la sauvegarde qui suit cette modification
    A.eval(`state.sources = [Object.assign(blank(), {id: "s1", type: "book", title: "Ce que parler veut dire", year: "1982", authors: [{family: "Bourdieu", given: "Pierre"}], publisher: "Fayard", city: "Paris"})]; save();`);
    for(let i = 0; i < 80 && !A.eval("(nuage.lire() || {}).derniere"); i++) await wait(100); // envoi 3 s après l’enregistrement
    const pid = A.eval("state.current");
    const enLigne = await (await fetch(`${URL_SRV}/api/projets/${pid}`, {headers: {Authorization: "Bearer " + A.eval("nuage.lire().jeton")}})).json();
    egal((enLigne.contenu.sources || []).length, 1, "A : le projet est sauvegardé sur le serveur");

    // APPAREIL B : connexion, le projet arrive
    const B = await appareil("B");
    await formulaire(B, "connexion", "awa.kone@exemple.ci", "Presse-Ivoirienne-2026");
    egal(B.eval(`(state.projects["${pid}"] || {sources: []}).sources.length`), 1, "B : le projet de A est retrouvé sur l’autre appareil");
    // B modifie le projet ; A se resynchronise : la version la plus récente gagne
    B.eval(`switchProject("${pid}"); state.sources.push(Object.assign(blank(), {id: "s2", type: "book", title: "De la postcolonie", year: "2000", authors: [{family: "Mbembe", given: "Achille"}]})); saveNow();`);
    await B.eval("nuageSynchroniser()");
    await A.eval("nuageSynchroniser()");
    egal(A.eval("state.sources.length"), 2, "A : la modification faite sur B est reprise (la plus récente gagne)");

    // ANTI-PLAGIAT : un établissement dépose un mémoire dans la base ; A contrôle un texte qui en copie une phrase
    const MEM = "Introduction\nLes journaux ivoiriens ont largement contribué à la polarisation du débat public pendant la crise politique.\nConclusion";
    const fich = path.join(os.tmpdir(), `depot-${process.pid}.txt`); fs.writeFileSync(fich, MEM);
    execFileSync(PY, ["manage.py", "shell", "-c", `from django.core.files import File; from corpus.models import DocumentDepose, Etablissement
u = Etablissement.objects.create(nom="Université Félix Houphouët-Boigny", sigle="UFHB")
d = DocumentDepose(etablissement=u, titre="La presse ivoirienne et la crise", auteur="A. Koffi", annee=2019, type="memoire")
d.fichier.save("depot.txt", File(open(r"${fich}", "rb")), save=True); d.indexer()`], {cwd: SERVEUR, env});
    const texte = Array.from({length: 8}, (_, k) => `Le chapitre ${k + 1} présente la méthode et le terrain de l’enquête menée auprès des lecteurs.`).join(" ") + " Nous constatons que les journaux ivoiriens ont largement contribué à la polarisation du débat public pendant la crise. " + Array.from({length: 6}, (_, k) => `La section ${k + 1} discute les limites de cette approche et ses conséquences pour la recherche.`).join(" ");
    await A.runSimilarity(texte, "chapitre.docx"); await wait(100);
    const res = A.document.querySelector("#simRes").textContent;
    egal(/Mémoire de master déposé : La presse ivoirienne et la crise \(A\. Koffi, 2019\), Université Félix Houphouët-Boigny \(UFHB\)/.test(res), true, "anti-plagiat : la phrase copiée est retrouvée dans le mémoire déposé");
    egal(A.eval("red.rapportSim.deposes"), 1, "rapport : la base des mémoires déposés est mentionnée");
  } finally {
    srv.kill();
    await wait(300); try{ fs.unlinkSync(DB); }catch(e){}
  }
  errs.forEach(e => console.log("ÉCHEC " + e));
  console.log(errs.length ? `erreurs : ${errs.length}` : "erreurs : aucune");
  process.exit(errs.length ? 1 : 0);
})();
