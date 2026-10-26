// Navigation des modules (barre du bas sur téléphone, barre latérale sur ordinateur) : chaque entrée ouvre le bon écran.
const {JSDOM} = require("jsdom");
const base = require("./charger")();
const errs = [];
const egal = (o, a, q) => { if (o !== a) errs.push(`${q} : attendu ${JSON.stringify(a)}, obtenu ${JSON.stringify(o)}`); };
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const dom = new JSDOM(base, {runScripts: "dangerously", pretendToBeVisual: true, url: "https://bibliocard.pages.dev/", beforeParse(w){ w.fetch = async () => { throw new TypeError("hors ligne"); }; }});
  const w = dom.window, d = w.document;
  w.HTMLDialogElement.prototype.showModal = function(){ this.open = true; }; w.HTMLDialogElement.prototype.close = function(){ this.open = false; };
  w.addEventListener("error", e => errs.push(e.message));
  await wait(300);
  const nav = n => d.querySelector(`#appNav [data-nav="${n}"]`);
  const actif = () => [...d.querySelectorAll('#appNav [aria-current="page"]')].map(b => b.dataset.nav).join(",");
  for (const v of ["plan", "redac", "biblio"]) { nav(v).click(); await wait(10); egal(d.body.dataset.view, v, `vue ${v}`); egal(actif(), v, `entrée active ${v}`); }
  nav("controle").click(); await wait(10);
  egal(d.querySelector("#side").hidden, false, "Contrôles ouvre le volet");
  egal(d.querySelector('#stabs [aria-pressed="true"]').dataset.st, "controle", "onglet Contrôles");
  egal(actif(), "controle", "entrée active Contrôles");
  d.querySelector("#sideClose").click(); await wait(10);
  egal(actif(), "biblio", "retour à Bibliographie");
  d.querySelector('#appNav [data-dash="norme"]').click(); await wait(10);
  egal(d.querySelector("#dash").open && d.querySelector("#dt-norme").classList.contains("on"), true, "outil Norme");
  d.querySelector("#dash").close();
  d.querySelector("#appNav .an-plus").click(); await wait(10);
  egal(d.querySelector("#dash").open && d.querySelector("#dt-home").classList.contains("on"), true, "Plus ouvre le menu");
  egal(d.querySelectorAll("#appNav [data-nav]").length, 4, "4 modules");
  egal(/nouveaux outils|new writing tools/i.test(d.querySelector(".an-soon").textContent), true, "place réservée aux futurs modules");
  console.log(errs.length ? errs.join("\n") + `\nerreurs : ${errs.length}` : "erreurs : aucune");
})();
