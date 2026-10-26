/* SCIENTUS : interface — généré depuis la version autonome, ne pas modifier à la main sans relancer les tests */


const $ = s => document.querySelector(s);
const cap = name => (window.claude && window.claude.use) ? window.claude.use(name).catch(() => null) : Promise.resolve(null);
const LS = "bibliocard.v3";
const NOOP = 0;
const state = { sources: [], style: "cames", cames: {upper:true, yearParen:false}, profile: "norcames", profiles: {}, citeMode: "parenthese", updatedAt: 0, exist: {}, evalExtra: [],
  comments: [], draft: {title:"", text:""}, thread: [], projects: {}, current: null, uiLang: "fr", catalogShare: false, catalogCfg: {url:"", key:""}, studentName: "", reviewerName: "", anonId: "" };
const PKEYS = ["sources","style","profile","citeMode","exist","comments","draft","thread","plan"];
const planVide = () => ({sujet: "", modele: "article_theorique", items: []});
state.plan = planVide();
const GKEYS = ["profiles","evalExtra","projects","current","uiLang","catalogShare","catalogCfg","studentName","reviewerName","anonId","updatedAt"];
const KINDS = {memoire:"Mémoire de master", these:"Thèse de doctorat", article:"Article scientifique", communication:"Communication", rapport:"Rapport", autre:"Autre"};
const ui = { pages: {}, filter: "", files: [], dismissed: new Set() };
let dbRef = null;
const NOTES = {
  cames: "NORCAMES/LSH : la norme des revues et universités du CAMES.",
  apa: "APA 7e édition : psychologie, éducation, sciences sociales.",
  iso: "ISO 690 auteur-date : très utilisée dans les universités françaises.",
  chicago: "Chicago auteur-date : histoire, sciences humaines.",
  mla: "MLA 9e édition : lettres et langues.",
  vancouver: "Vancouver : médecine, pharmacie, sciences de la santé. Références numérotées dans l’ordre de citation.",
  notes: "Notes de bas de page : histoire, droit, lettres. Première citation complète, puis op. cit. et Ibid.",
};

/* ---------- persistance ---------- */
function setStatus(t, saving){ $("#statusText").textContent = t; $("#status").classList.toggle("saving", !!saving); }
function newPid(){ return "j" + Date.now().toString(36) + Math.random().toString(36).slice(2,5); }
function blankProject(name, kind){ return {id: newPid(), name, kind, createdAt: Date.now(), updatedAt: Date.now(), sources: [], style: "cames", profile: "norcames", citeMode: "parenthese", exist: {}, comments: [], draft: {title:"", text:""}, thread: [], plan: planVide()}; }
function syncCurrent(){ const p = state.projects[state.current]; if(!p) return; PKEYS.forEach(k => p[k] = state[k]); p.updatedAt = Date.now(); }
function loadProject(pid){ const p = state.projects[pid]; if(!p) return; state.current = pid; PKEYS.forEach(k => { if(p[k] !== undefined) state[k] = JSON.parse(JSON.stringify(p[k])); }); state.comments = state.comments || []; state.thread = state.thread || []; state.draft = state.draft || {title:"", text:""}; if(!p.plan) state.plan = planVide(); }
function ensureProjects(){
  if(!state.anonId) state.anonId = "u" + Math.random().toString(36).slice(2, 12);
  if(!state.projects || !Object.keys(state.projects).length){
    // migration : l’ancienne bibliothèque unique devient le premier projet
    const p = blankProject("Mon premier projet", "memoire");
    PKEYS.forEach(k => { if(state[k] !== undefined) p[k] = state[k]; });
    try{ const d = JSON.parse(localStorage.getItem("bibliocard.redaction") || "null"); if(d && !(p.draft && p.draft.text)) p.draft = {title: d.title || "", text: d.text || ""}; }catch(e){}
    state.projects = {[p.id]: p}; state.current = p.id;
  }
  if(!state.projects[state.current]) state.current = Object.keys(state.projects)[0];
  loadProject(state.current);
}
function loadLocal(){
  try{ const raw = localStorage.getItem(LS) || localStorage.getItem("bibliocard.v2"); if(raw){ const d = JSON.parse(raw); Object.keys(state).forEach(k => { if(d[k] !== undefined) state[k] = d[k]; }); } }catch(e){}
  ensureProjects();
}
let saveTimer, dbUid = null, dbH = null;
function save(){
  state.updatedAt = Date.now(); setStatus("Enregistrement…", true);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    syncCurrent();
    try{ localStorage.setItem(LS, JSON.stringify(state)); }catch(e){ setStatus("Mémoire de l’appareil pleine : télécharge une copie de secours"); return; }
    if(dbH){
      try{
        const meta = {}; GKEYS.filter(k => k !== "projects").forEach(k => meta[k] = state[k]);
        meta.list = Object.values(state.projects).map(p => ({id: p.id, name: p.name, kind: p.kind, updatedAt: p.updatedAt}));
        await dbH.meta.set({json: JSON.stringify(meta), updatedAt: state.updatedAt, v: 2});
        const p = state.projects[state.current]; if(p) await dbH.projs.doc(p.id).set({json: JSON.stringify(p), updatedAt: p.updatedAt});
        setStatus("Enregistré dans ton compte");
      }catch(e){ setStatus("Enregistré sur cet appareil"); }
    } else { setStatus("Enregistré sur cet appareil"); if(sync.on && sync.session){ await sync.push(); setStatus("Synchronisé avec tes appareils"); } }
  }, 600);
}
(async function connectDb(){
  const [db, user] = await Promise.all([cap("db"), cap("user")]);
  if(!db || !user) return;
  try{
    const id = await user.id(); if(!id) return; dbUid = id;
    dbH = {meta: db.doc("data/users/" + id + "/bibliotheque"), projs: db.collection("data/users/" + id + "/projets")};
    dbRef = dbH.meta;
    const snap = await dbH.meta.get();
    if(snap.exists){
      const d = snap.data(); const v = JSON.parse(d.json || "{}");
      if(d.v !== 2){ /* ancien format : une seule bibliothèque */ if(d.updatedAt > (state.updatedAt || 0) && Array.isArray(v.sources)){ const p = state.projects[state.current]; PKEYS.forEach(k => { if(v[k] !== undefined) p[k] = v[k]; }); loadProject(state.current); renderAll(); } save(); }
      else if(d.updatedAt > (state.updatedAt || 0)){
        GKEYS.filter(k => k !== "projects").forEach(k => { if(v[k] !== undefined) state[k] = v[k]; });
        const qs = await dbH.projs.get(); const projects = {};
        qs.docs.forEach(doc => { try{ const p = JSON.parse(doc.data().json); projects[p.id] = p; }catch(e){} });
        if(Object.keys(projects).length){ state.projects = projects; ensureProjects(); renderAll(); refreshDraftUi(); }
      }
      setStatus("Synchronisé avec ton compte");
    } else save();
  }catch(e){ dbH = null; dbRef = null; }
})();

/* ---------- toast ---------- */
let toastT;
function toast(msg, actLabel, act){
  $("#toastMsg").textContent = msg;
  const b = $("#toastAct");
  if(actLabel){ b.hidden = false; b.textContent = state.uiLang === "en" ? ({"Annuler": "Undo"}[actLabel] || tr(actLabel)) : actLabel; b.onclick = () => { act(); hideToast(); }; } else b.hidden = true;
  $("#toast").classList.add("show"); clearTimeout(toastT); toastT = setTimeout(hideToast, actLabel ? 6500 : 3400);
}
function hideToast(){ $("#toast").classList.remove("show"); }

/* ---------- rendu ---------- */
const docTexts = () => ui.files.filter(f => f.body).map(f => stripMarks(f.body)).concat(state.draft && state.draft.text ? [state.draft.text] : []);
const labeled = () => { const st = STYLES[state.style]; return st.numeric ? numberSources(state.sources.map((s, i) => ({...s, _order: i})), docTexts()) : withLabels(sortSources(state.sources), st.authorDate); };
const verifyAny = (text, L) => STYLES[state.style].numeric ? verifyNumeric(text, L) : verify(text, L);
const curProfile = () => CAMES_PROFILES[state.profile] || state.profiles[state.profile] || CAMES_PROFILES.norcames;
const bibFor = s => state.style === "cames" ? STYLES.cames.bib(s, curProfile()) : STYLES[state.style].bib(s);
const isAuto = s => s.origin === "Analyse automatique" || s.origin === "Analyse par l’IA" || s.origin === "Recherche en ligne";

function renderNorm(){
  $("#styleSeg").innerHTML = Object.entries(STYLES).map(([k,v]) => `<button aria-pressed="${k === state.style}" data-style="${k}">${esc(v.name)}</button>`).join("");
  $("#styleSeg").querySelectorAll("button").forEach(b => b.onclick = () => { state.style = b.dataset.style; save(); renderAll(); toast(`Bibliographie remise en forme : ${STYLES[state.style].name}`); });
  // sélecteur de l’accueil : les normes disponibles, puis la place réservée aux suivantes
  $("#normPick").innerHTML = Object.entries(STYLES).map(([k, v]) => `<button type="button" class="npb" aria-pressed="${k === state.style}" data-np="${k}" title="${esc(v.full)}">${esc(v.name)}</button>`).join("")
    + `<span class="npb bientot" title="Norme en préparation">IEEE<small>bientôt</small></span>`;
  $("#normPick").querySelectorAll("[data-np]").forEach(b => b.onclick = () => { if(b.dataset.np === state.style) return; state.style = b.dataset.np; save(); renderAll(); toast(`Norme choisie : ${STYLES[state.style].full}`); });
  $("#camesOpts").style.display = state.style === "cames" ? "block" : "none";
  renderProfiles();
  $("#normNote").textContent = NOTES[state.style];
  $("#normName").textContent = STYLES[state.style].name; $("#normProf").textContent = state.style === "cames" ? curProfile().name : "";
}

function renderFiles(){
  const box = $("#files");
  box.innerHTML = ui.files.map(f => `<div class="file">
      <span class="ic">${esc(f.ext)}</span><span class="nm" title="${esc(f.name)}">${esc(f.name)}</span>
      <button class="x" data-rm="${f.id}" aria-label="Retirer ${esc(f.name)}">Retirer</button>
      <div class="st ${f.error ? "err" : ""}">${f.busy ? `<span class="busy"></span>` : ""}<span>${esc(f.status)}</span>
        ${f.text && !f.busy ? `<label class="sr" for="m${f.id}">Traiter comme</label><select id="m${f.id}" data-mode="${f.id}">
          <option value="biblio" ${f.mode === "biblio" ? "selected" : ""}>Document avec bibliographie</option>
          <option value="source" ${f.mode === "source" ? "selected" : ""}>Source à citer</option>
          <option value="texte" ${f.mode === "texte" ? "selected" : ""}>Texte à vérifier seulement</option></select>` : ""}
      </div></div>`).join("");
  box.querySelectorAll("[data-rm]").forEach(b => b.onclick = () => removeFile(b.dataset.rm));
  box.querySelectorAll("[data-mode]").forEach(sel => sel.onchange = () => { const f = ui.files.find(x => x.id === sel.dataset.mode); f.mode = sel.value; runFile(f); });
}

function renderSheet(){
  const L = labeled(); const ol = $("#biblio");
  document.body.classList.toggle("has", L.length > 0);
  $("#sheet").hidden = !L.length; $("#bigdl").hidden = !L.length;
  let marks = 0;
  ol.innerHTML = L.map(s => {
    const m = checks(s, state.style, state.sources); marks += m.length;
    const flag = isAuto(s) && !m.length ? `<span class="mark okm">À relire</span>` : "";
    return `<li class="entry"><div class="ref">${bibFor(s)}</div><div class="marks">${m.length ? m.map(x => `<button class="mark" data-fix="${s.id}" data-field="${x.f || ""}">${esc(x.t)}</button>`).join("") : flag || `<span class="mark okm">Conforme</span>`}${(state.comments || []).some(c => !c.done && c.target === "ref" && c.refKey === refKey(s)) ? `<button class="mark" data-cm="1">Commentaire de l’encadreur</button>` : ""}${(() => { const e = existFor(s); return !e ? "" : e.v === "suspect" ? `<button class="mark" data-exist="1">Référence suspecte</button>` : e.v === "found" ? `<span class="mark okm">Existe (${esc(e.best.src)})</span>` : e.v === "close" ? `<button class="mark" data-exist="1">Titre ou année à vérifier</button>` : ""; })()}</div></li>`;
  }).join("");
  ol.querySelectorAll("[data-fix]").forEach(b => b.onclick = () => openForm(state.sources.find(s => s.id === b.dataset.fix), b.dataset.field));
  ol.querySelectorAll("[data-exist]").forEach(b => b.onclick = () => openDash("existence"));
  ol.querySelectorAll("[data-cm]").forEach(b => b.onclick = () => openDash("todo"));
  $("#sheetMeta").textContent = L.length ? `${L.length} référence${L.length > 1 ? "s" : ""}` : "";
  $("#legend").textContent = L.length && marks ? "En rouge dans la marge : ce qui manque pour la norme. Touche une marque pour compléter." : "";
  ["#docBtn","#copyBtn","#dDoc","#dCopy","#bibBtn","#risBtn","#dReport"].forEach(id => $(id).disabled = !L.length);
  $("#dock").hidden = !L.length;
  $("#dockCount").textContent = `${L.length} référence${L.length > 1 ? "s" : ""}`;
  $("#dockNorm").textContent = STYLES[state.style].full;
}

/* ---------- liste « À faire » : tout ce qu’il reste à régler, au même endroit ---------- */
let TASKS = [];
// titre raccourci au mot entier : « La question africaine… » et non « La question africai »
const court = (t, n) => (t = String(t || "")).length > n ? t.slice(0, n).replace(/[\s,;:.]+\S*$/, "") + "…" : t;
// « M. Ascher (1998 » → « M. Ascher (1998) » : la citation relevée s’arrête avant la page
const closeParen = r => (r.match(/\(/g) || []).length > (r.match(/\)/g) || []).length ? r + ")" : r;
// une citation relevée, telle qu’affichée
const citeVue = c => closeParen(String(c.raw).replace(/[(),;\s]+$/, ""));
function computeTasks(){
  const L = labeled(); const t = [];
  const fileReports = ui.files.filter(f => f.body && f.body.trim().length > 200 && (f.mode === "biblio" || f.mode === "texte")).map(f => ({f, r: verifyAny(stripMarks(f.body), L)}));
  fileReports.forEach(({f, r}) => {
    r.missing.forEach(x => { const k = "m|" + norm(x.c.family) + x.c.year; if(ui.dismissed.has(k)) return;
      t.push({key:k, title:`Référence manquante : ${citeVue(x.c)}`, sub:`Citée dans ${f.name}, mais absente de la bibliographie.`,
        acts:[["Chercher en ligne", () => { closeSide(); construireBiblio(f.name); }], ["Saisir à la main", () => { const s = blank(); s.authors = [{family:x.c.family, given:""}]; s.year = x.c.year.replace(/[a-z]$/,""); openForm(s, "title"); }], ["Ignorer", () => dismiss(k)]]}); });
    r.yearOff.forEach(x => { const k = "y|" + x.s.id + x.c.year; if(ui.dismissed.has(k)) return;
      const y = x.c.year.replace(/[a-z]$/,"");
      t.push({key:k, title:`Année à vérifier : ${x.s.authors[0].family}`, sub:`Le texte de ${f.name} cite ${x.c.year}, la bibliographie indique ${x.s._label}.`,
        acts:[[`Mettre ${y} dans la bibliographie`, () => { const s = state.sources.find(o => o.id === x.s.id); s.year = y; save(); renderAll(); toast("Année corrigée"); }], ["La bibliographie a raison", () => dismiss(k)]]}); });
  });
  L.forEach(s => { const m = checks(s, state.style, state.sources); if(!m.length) return;
    t.push({key:"c|" + s.id, title:`À compléter : ${(s.authors[0] ? s.authors[0].family + ", " : "") + court(s.title || "sans titre", 60)}`, sub: m.map(x => x.t).join(", ") + ".",
      acts:[["Compléter", () => openForm(state.sources.find(o => o.id === s.id), m[0].f)]]}); });
  L.forEach(s => { const e = existFor(s); if(!e) return;
    if(e.v === "suspect") t.unshift({key:"s|" + s.id, title:`Référence suspecte : ${(s.authors[0] ? s.authors[0].family + ", " : "") + court(s.title, 60)}`, sub: e.reason + " Elle a peut-être été inventée ou mal recopiée.",
      acts:[["Corriger la fiche", () => openForm(state.sources.find(o => o.id === s.id), "doi")], ["Retirer", () => removeSource(s.id)]]});
    else if(e.v === "close" && !ui.dismissed.has("p|" + s.id)) t.push({key:"p|" + s.id, info:true, title:`Titre ou année à vérifier : ${s.authors[0] ? s.authors[0].family : court(s.title, 40)}`, sub: existHint(s, e),
      acts:[["Corriger la fiche", () => openForm(state.sources.find(o => o.id === s.id), "title")], ["C’est bien ça", () => dismiss("p|" + s.id)]]}); });
  if(typeof red !== "undefined" && red.sim && red.sim.unflagged) t.unshift({key:"sim", title:`${red.sim.unflagged} passage${red.sim.unflagged > 1 ? "s" : ""} repris sans guillemets ni citation`, sub:"Repérés par le contrôle des similitudes de ta rédaction.", acts:[["Voir les passages", () => { $("#dash").close(); setView("redac"); $("#simPanel").scrollIntoView({behavior:"smooth"}); }]]});
  (state.comments || []).filter(c => !c.done).forEach(c => {
    const src = c.target === "ref" ? state.sources.find(s => refKey(s) === c.refKey) : null;
    t.unshift({key: "k|" + c.id, title: `${c.by || "Encadreur"} : ${c.text.length > 90 ? c.text.slice(0, 90) + "…" : c.text}`,
      sub: c.target === "ref" ? `Sur la référence ${c.refLabel || ""}.` : c.target === "para" ? `Sur le paragraphe : « ${(c.excerpt || "").slice(0, 80)}… »` : "Appréciation générale.",
      acts: [[c.target === "ref" && src ? "Ouvrir la fiche" : c.target === "para" ? "Voir dans le texte" : "Lu", () => {
        if(c.target === "ref" && src) openForm(src);
        else if(c.target === "para"){ $("#dash").close(); setView("redac"); const ta = $("#draft"); const i = ta.value.indexOf((c.excerpt || "").slice(0, 40)); if(i >= 0){ ta.focus(); ta.setSelectionRange(i, i + (c.excerpt || "").length); } }
        else { c.done = true; save(); renderAll(); }
      }], ["Marquer comme traité", () => { c.done = true; save(); renderAll(); toast("Commentaire traité"); }]]});
  });
  const auto = state.sources.filter(isAuto);
  if(auto.length) t.push({key:"a", info:true, title:`${auto.length} référence${auto.length > 1 ? "s" : ""} à relire`, sub:"Elles ont été découpées automatiquement. Un coup d’œil suffit, puis valide-les.",
    acts:[["Voir les fiches", () => dashTab("fiches")], ["Tout valider", () => { auto.forEach(s => { s._method = s._method || s.origin; s.origin = "Vérifiée"; s._validated = Date.now(); }); save(); renderAll(); toast("Références validées"); }]]});
  fileReports.forEach(({f, r}) => { if(r.unused.length && !ui.dismissed.has("u|" + f.name)) t.push({key:"u|" + f.name, info:true, title:`${r.unused.length} référence${r.unused.length > 1 ? "s" : ""} jamais citée${r.unused.length > 1 ? "s" : ""}`, sub:`Présentes dans la bibliographie de ${f.name}, absentes du texte. La norme demande en général de ne garder que ce qui est cité.`,
    acts:[["Voir lesquelles", () => dashTab("controle")], ["C’est voulu", () => dismiss("u|" + f.name)]]}); });
  // NORCAMES : structure de l’article (seulement si le document a un résumé ou un abstract)
  if(state.style === "cames") ui.files.forEach(f => { const s = structureOf(f); if(!s || !s.count || ui.dismissed.has("st|" + f.name)) return;
    const l = structureIssues(s);
    t.push({key:"st|" + f.name, info:true, title:`Structure de l’article : ${plur(s.count, "point", "points")} à revoir`, sub:`${f.name} ne suit pas encore NORCAMES : ${l.slice(0, 2).join(" ; ")}${l.length > 2 ? "…" : "."}`,
      acts:[["Voir le détail", () => dashTab("controle")], ["Ignorer", () => dismiss("st|" + f.name)]]}); });
  // NORCAMES : « (S. Diakité, 1985, p. 105) » ou « M. Ascher (1998, p. 223) », avec l’initiale du prénom
  if(state.style === "cames") fileReports.forEach(({f, r}) => { const n = (r.noInitial || []); if(!n.length || ui.dismissed.has("i|" + f.name)) return;
    const ex = n.slice(0, 3).map(x => `«${NB}${closeParen((x.c.rawNoInitial || x.c.raw).replace(/[(),\s]+$/,""))}${NB}»`).join(", ");
    t.push({key:"i|" + f.name, info:true, title:`${n.length} citation${n.length > 1 ? "s" : ""} sans l’initiale du prénom`, sub:`NORCAMES demande l’initiale du prénom avant le nom, par exemple «${NB}(S. Diakité, 1985, p.${NB}105)${NB}». Dans ${f.name}${NB}: ${ex}.`,
      acts:[["C’est voulu", () => dismiss("i|" + f.name)]]}); });
  return t;
}
function dismiss(k){ ui.dismissed.add(k); renderAll(); }
const structureOf = f => f.text && f.text.length > 300 ? checkArticleStructure(f.text, f.headings) : null;
function structureIssues(s){
  const q = t => `«${NB}${t}…${NB}»`;
  return [
    ...s.missing.map(x => `partie absente${NB}: ${x}`),
    ...s.order.map(x => x),
    ...(s.email ? [] : ["adresse électronique de l’auteur absente avant le résumé"]),
    ...(s.refsLabel ? [`intitulé ${q(s.refsLabel).replace("…", "")} au lieu de «${NB}Références bibliographiques${NB}»`] : []),
    ...s.numbering.map(n => `${q(n.text.slice(0, 50))}${NB}: ${n.issue}`),
    ...s.longQuotes.map(c => `citation de ${c.words} mots dans la phrase, à mettre à la ligne et en retrait${NB}: ${q(c.text.slice(0, 50))}`),
    ...s.italicQuotes.map(c => `citation en italique, à mettre en romain entre guillemets${NB}: ${q(c.slice(0, 50))}`),
  ];
}
function renderTasks(){
  TASKS = computeTasks();
  const urgent = TASKS.filter(x => !x.info).length;
  const n = TASKS.length;
  const badge = $("#dashBadge"); badge.hidden = !n; badge.textContent = n;
  const mb = $("#sideBadge"); if(mb){ mb.hidden = !n; mb.textContent = n; }
  const ban = $("#todoBanner");
  ban.hidden = !state.sources.length;
  ban.classList.toggle("done", !n);
  ban.innerHTML = n ? `<span><b>${n} chose${n > 1 ? "s" : ""} à régler</b>${urgent ? "" : ", rien d’urgent"}</span><span class="go">Voir</span>` : `<span><b>Ta bibliographie est prête.</b> Rien à régler.</span>`;
  $("#tasks").innerHTML = n ? TASKS.map((x, i) => `<div class="task ${x.info ? "info" : ""}"><span class="ico" aria-hidden="true"></span><div><b>${esc(x.title)}</b><p>${esc(x.sub)}</p><div class="row">${x.acts.map((a, j) => `<button class="btn small ${j === 0 ? "primary" : ""}" data-t="${i}" data-a="${j}">${esc(a[0])}</button>`).join("")}</div></div></div>`).join("")
    : state.sources.length ? `<div class="donebox"><b>Tout est en ordre</b>Ta bibliographie est complète pour la norme ${esc(STYLES[state.style].name)}.</div>` : `<div class="donebox" style="color:var(--muted)"><b>Rien pour l’instant</b>Dépose un document sur la page principale.</div>`;
  $("#tasks").querySelectorAll("[data-t]").forEach(b => b.onclick = () => TASKS[+b.dataset.t].acts[+b.dataset.a][1]());
}

function renderReports(){
  const L = labeled(); const st = STYLES[state.style];
  const docs = ui.files.filter(f => f.body && f.body.trim().length > 200 && (f.mode === "biblio" || f.mode === "texte"));
  const structBlk = f => { if(state.style !== "cames") return ""; const s = structureOf(f); if(!s) return "";
    return s.count ? `<details open><summary class="bad">Structure NORCAMES de l’article (${s.count})</summary><ul>${structureIssues(s).map(x => `<li>${esc(x)}</li>`).join("")}</ul><p class="sum">La mise en page (retrait, interligne, police) n’est pas contrôlée${NB}: vérifie-la selon les consignes de la revue.</p></details>`
      : `<p class="sum">Structure NORCAMES de l’article${NB}: conforme (parties, ordre, numérotation, citations).</p>`; };
  $("#reports").innerHTML = docs.length ? docs.map(f => {
    const r = verifyAny(stripMarks(f.body), L);
    if(!r.total) return `<div class="report"><h4>${esc(f.name)}</h4><p class="sum">Aucune citation auteur-date repérée dans le texte.</p>${structBlk(f)}</div>`;
    const list = (arr, fn) => `<ul>${arr.slice(0,40).map(fn).join("")}</ul>${arr.length > 40 ? `<p class="sum">et ${arr.length - 40} autres</p>` : ""}`;
    const issues = r.missing.length + r.yearOff.length;
    return `<div class="report"><h4>${esc(f.name)}</h4>
      <p class="sum">${r.total} citation${r.total > 1 ? "s" : ""} dans le texte. ${issues ? `${issues} problème${issues > 1 ? "s" : ""}.` : "Toutes ont leur référence."}</p>
      ${r.missing.length ? `<details open><summary class="bad">Citées sans référence (${r.missing.length})</summary>${list(r.missing, x => `<li>${esc(citeVue(x.c))}</li>`)}</details>` : ""}
      ${r.yearOff.length ? `<details open><summary class="bad">Année différente (${r.yearOff.length})</summary>${list(r.yearOff, x => `<li>${esc(citeVue(x.c))} : la référence indique ${esc(x.s._label)}</li>`)}</details>` : ""}
      ${r.unused.length ? `<details><summary>Jamais citées (${r.unused.length})</summary>${list(r.unused, s => `<li>${st.cite(s, "", "parenthese")} ${esc(s.title)}</li>`)}</details>` : ""}
      ${r.ok.length ? `<details><summary>Correspondances (${r.ok.length})</summary>${list(r.ok, x => `<li>${esc(citeVue(x.c))}</li>`)}</details>` : ""}
      ${structBlk(f)}
    </div>`;
  }).join("") : state.sources.length
    // le texte des documents n’est gardé qu’en mémoire (confidentialité) : après un rechargement, il faut le redéposer
    ? `<p class="legend">Le contrôle des citations se fait à partir du texte de ton document, qui n’est jamais enregistré. Redépose ton mémoire pour comparer ses citations avec ta bibliographie.</p>`
    : `<p class="legend">Dépose ton mémoire ou ta thèse sur la page principale : son contrôle apparaîtra ici.</p>`;
}

function renderIntext(){
  const st = STYLES[state.style]; const L = labeled();
  $("#intextSub").textContent = !L.length ? "Ajoute des références pour obtenir leur forme de citation." : st.footnote ? "Forme à placer en note de bas de page. La première citation est complète ; ensuite, forme abrégée avec op. cit., ou Ibid. si la note précédente cite le même ouvrage." : st.numeric ? "Le numéro suit l’ordre de première citation dans ton texte. Indique la page pour une citation directe." : state.style === "cames" ? "Initiale du prénom, nom, année et page. Au-delà de trois lignes, la citation va à la ligne, en retrait, interligne simple." : `Forme ${st.full}. Indique la page pour une citation directe.`;
  const seg = $("#citeSeg"); seg.style.display = st.narrative && L.length ? "inline-flex" : "none";
  if(st.footnote) seg.style.display = L.length ? "inline-flex" : "none";
  seg.innerHTML = (st.footnote ? [["parenthese","Première citation"],["court","Citations suivantes"],["ibid","Ibid."]] : [["parenthese","Entre parenthèses"],["narratif","Dans la phrase"]]).map(([k,v]) => `<button aria-pressed="${state.citeMode === k}" data-m="${k}">${v}</button>`).join("");
  seg.querySelectorAll("button").forEach(b => b.onclick = () => { state.citeMode = b.dataset.m; save(); renderIntext(); });
  $("#intext").innerHTML = L.map(s => `<div class="it"><input aria-label="Page" placeholder="p." value="${esc(ui.pages[s.id] || "")}" data-pg="${s.id}"><span class="c">${st.cite(s, ui.pages[s.id], state.citeMode)}</span><button class="btn small" data-cc="${s.id}">Copier</button></div>`).join("");
  $("#intext").querySelectorAll("[data-pg]").forEach(inp => inp.oninput = () => { ui.pages[inp.dataset.pg] = inp.value; const s = L.find(x => x.id === inp.dataset.pg); inp.parentElement.querySelector(".c").innerHTML = st.cite(s, inp.value, state.citeMode); });
  $("#intext").querySelectorAll("[data-cc]").forEach(b => b.onclick = () => { const s = L.find(x => x.id === b.dataset.cc); copyRich(st.cite(s, ui.pages[s.id], state.citeMode)); });
}

function renderCards(){
  const n = state.sources.length;
  $("#cardsSum").textContent = n ? `${n} fiche${n > 1 ? "s" : ""}` : "Fiches";
  const f = norm(ui.filter);
  const list = sortSources(state.sources).filter(s => !f || norm([s.title, s.container, s.year, s.file, ...s.authors.map(a => a.family + " " + a.given)].join(" ")).includes(f));
  $("#filter").hidden = n < 6;
  $("#cards").innerHTML = !n ? `<p class="legend">Aucune fiche pour l’instant.</p>` : list.map(s => {
    const m = checks(s, state.style, state.sources);
    return `<div class="card"><div><h5>${esc(s.title || "Sans titre")}</h5>
      <div class="meta">${esc(s.authors.map(a => a.family).join(", ") || "Auteur inconnu")}, ${esc(s.year || "s.d.")}${s.file ? `. Tiré de ${esc(s.file)}` : ""}</div>
      <span class="tag">${TYPE_LABEL[s.type]}</span>${isAuto(s) ? `<span class="tag brass">À relire</span>` : ""}${m.slice(0,2).map(x => `<span class="tag proof">${esc(x.t)}</span>`).join("")}</div>
      <div class="cact"><button data-edit="${s.id}">Modifier</button><button data-del="${s.id}">Retirer</button></div></div>`;
  }).join("") || `<p class="legend">Aucune fiche ne correspond.</p>`;
  $("#cards").querySelectorAll("[data-edit]").forEach(b => b.onclick = () => openForm(state.sources.find(s => s.id === b.dataset.edit)));
  $("#cards").querySelectorAll("[data-del]").forEach(b => b.onclick = () => removeSource(b.dataset.del));
  $("#saveInfo").textContent = (dbRef ? "Ta bibliographie est enregistrée dans ton compte et sur cet appareil." : "Ta bibliographie est enregistrée sur cet appareil.") + " Tes documents, eux, ne sont jamais conservés.";
}

function ringSvg(p){
  const r = 52, c = 2 * Math.PI * r, col = p >= 90 ? "var(--ok)" : p >= 60 ? "var(--brass)" : "var(--proof)";
  return `<svg viewBox="0 0 118 118" aria-hidden="true"><circle cx="59" cy="59" r="${r}" fill="none" stroke="var(--sunk)" stroke-width="9"/><circle cx="59" cy="59" r="${r}" fill="none" stroke="${col}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(c * p / 100).toFixed(1)} ${c.toFixed(1)}"/></svg>`;
}
function renderSynth(){
  const L = labeled(); $("#synth").hidden = !L.length; $("#demoLine").hidden = !!L.length; if(!L.length) return;
  const c = conformity(state.sources, state.style), a = analyze(state.sources);
  $("#ring").innerHTML = `${ringSvg(c.score)}<div><span class="v">${c.score}${NB}%</span><span class="l">conforme ${esc(STYLES[state.style].name)}</span></div>`;
  $("#ring").setAttribute("aria-label", `Conformité ${STYLES[state.style].name} : ${c.score} %`);
  const issues = TASKS.filter(x => !x.info).length;
  $("#facts").innerHTML = `<div><dt>Références</dt><dd>${a.n}</dd></div><div><dt>À corriger</dt><dd>${issues}</dd></div>
    <div><dt>Période couverte</dt><dd>${a.min ? (a.min === a.max ? a.min : `${a.min}–${a.max}`) : "—"}</dd></div><div><dt>Moins de dix ans</dt><dd>${a.dated ? Math.round(100 * a.recent / a.dated) + NB + "%" : "—"}</dd></div>
    <div><dt>Existence vérifiée</dt><dd>${(() => { const ex = L.map(existFor).filter(Boolean); const sus = ex.filter(e => e.v === "suspect").length; return net.blocked ? "Hors ligne" : net.running ? "En cours…" : ex.length ? `${ex.filter(e => e.v === "found").length}/${L.length}${sus ? `<small class="sus">${sus} suspecte${sus > 1 ? "s" : ""}</small>` : ""}` : "—"; })()}</dd></div>`;
}
function renderAnalyse(){
  const box = $("#analyse"); const a = analyze(state.sources);
  if(!a.n){ box.innerHTML = `<p class="legend">Dépose un document pour obtenir le profil de sa bibliographie.</p>`; return; }
  const bars = (obj, labels) => { const max = Math.max(...Object.values(obj), 1); return `<div class="bars">${Object.entries(obj).map(([k,v]) => `<div class="b"><span>${esc(labels ? labels[k] || k : k)}</span><span class="t"><i style="width:${(100 * v / max).toFixed(0)}%"></i></span><span class="n">${v}</span></div>`).join("")}</div>`; };
  const dec = Object.fromEntries(Object.entries(a.decades).sort((x,y) => x[0] - y[0]).map(([d,v]) => [`Années ${d}`, v]));
  box.innerHTML = `<dl class="kv"><div><dt>Références</dt><dd>${a.n}</dd></div><div><dt>Année médiane</dt><dd>${a.median || "—"}</dd></div><div><dt>Période</dt><dd>${a.min ? `${a.min}–${a.max}` : "—"}</dd></div><div><dt>Moins de dix ans</dt><dd>${a.dated ? Math.round(100 * a.recent / a.dated) + NB + "%" : "—"}</dd></div></dl>
    ${a.notes.map(n => `<p class="note">${esc(n)}</p>`).join("")}
    <div class="blk"><h3>Types de documents</h3>${bars(a.byType, TYPE_LABEL)}</div>
    ${Object.keys(dec).length ? `<div class="blk"><h3>Répartition dans le temps</h3>${bars(dec)}</div>` : ""}
    <div class="blk"><h3>Langue des titres</h3>${bars(Object.fromEntries(Object.entries(a.lang).filter(([,v]) => v)), {fr:"Français", en:"Anglais", autre:"Autre ou indéterminée"})}</div>
    ${a.top.length ? `<div class="blk"><h3>Auteurs les plus cités</h3>${bars(Object.fromEntries(a.top))}</div>` : ""}`;
}
function renderEval(){
  const own = evalRecords(state.sources), all = own.concat(state.evalExtra || []);
  const st = evalStats(all), pct = x => Math.round(100 * x) + NB + "%";
  const pending = state.sources.filter(s => s._orig && !s._validated).length;
  const box = $("#evalBox");
  const per = EVAL_FIELDS.filter(([k]) => st.per[k]).map(([k,l]) => `<div class="b"><span>${l}</span><span class="t"><i style="width:${(100 * st.per[k].ok / st.per[k].tot).toFixed(0)}%"></i></span><span class="n">${Math.round(100 * st.per[k].ok / st.per[k].tot)}</span></div>`).join("");
  const meth = Object.entries(st.byMethod).map(([m,v]) => `<div><dt>${m === "ia" ? "Avec l’IA" : "Sans IA"}</dt><dd>${pct(v.ok / v.tot)} <span class="legend" style="font-weight:400">sur ${v.n}</span></dd></div>`).join("");
  box.innerHTML = (st.n ? `<dl class="kv"><div><dt>Références relues</dt><dd>${st.n}</dd></div><div><dt>Champs justes</dt><dd>${pct(st.fieldAcc)}</dd></div><div><dt>Références sans aucune erreur</dt><dd>${pct(st.refAcc)}</dd></div><div><dt>En attente de relecture</dt><dd>${pending}</dd></div></dl>
      ${st.n < 100 ? `<p class="note">Résultat indicatif : vise au moins 200 références issues de documents variés pour un chiffre solide.</p>` : ""}
      <div class="blk"><h3>Exactitude par champ (%)</h3><div class="bars">${per}</div></div>
      ${Object.keys(st.byMethod).length > 1 ? `<div class="blk"><h3>Selon la méthode</h3><dl class="kv">${meth}</dl></div>` : ""}
      ${state.evalExtra.length ? `<p class="legend" style="margin-top:10px">Dont ${state.evalExtra.length} mesure${state.evalExtra.length > 1 ? "s" : ""} importée${state.evalExtra.length > 1 ? "s" : ""} d’autres relecteurs.</p>` : ""}`
    : `<p class="legend">${pending ? `${pending} fiche${pending > 1 ? "s" : ""} en attente : ouvre « Fiches », relis et corrige chacune, ou valide-les dans « À faire ».` : "Importe un document, puis relis ses fiches pour lancer la mesure."}</p>`) +
    `<div class="blk exp">
      <button id="evOut" ${own.length ? "" : "disabled"}><b>Exporter mes mesures</b><span>Un fichier anonyme (aucun titre ni auteur, seulement juste ou faux par champ) à partager pour constituer le corpus.</span></button>
      <button id="evCsv" ${all.length ? "" : "disabled"}><b>Tableau des résultats (.csv)</b><span>Pour Excel ou un article : exactitude par champ et par méthode.</span></button>
      <button id="evIn"><b>Ajouter les mesures d’autres relecteurs</b><span>Regroupe plusieurs fichiers de mesures pour un taux sur tout le corpus.</span></button>
    </div>`;
  $("#evOut").onclick = () => download("bibliocard-mesures.json", JSON.stringify({app:"BiblioCard-mesures", version:1, date:new Date().toISOString().slice(0,10), records: own}, null, 1), "application/json");
  $("#evCsv").onclick = () => { const rows = [["champ","justes","total","pourcentage"], ...EVAL_FIELDS.filter(([k]) => st.per[k]).map(([k,l]) => [l, st.per[k].ok, st.per[k].tot, (100 * st.per[k].ok / st.per[k].tot).toFixed(1)]), [], ["références relues", st.n], ["champs justes (%)", (100 * st.fieldAcc).toFixed(1)], ["références sans erreur (%)", (100 * st.refAcc).toFixed(1)]];
    download("bibliocard-fiabilite.csv", "\ufeff" + rows.map(r => r.join(";")).join("\n"), "text/csv"); };
  $("#evIn").onclick = () => $("#fileIn").click();
}
function renderAll(){ renderPlan(); renderProjBtn(); renderCatalog(); renderSync(); renderEval(); renderNorm(); renderFiles(); renderSheet(); renderTasks(); renderSynth(); renderExist(); renderReports(); renderIntext(); renderCards(); renderAnalyse(); renderThread(); }

/* ---------- tableau de bord ---------- */
const DGROUPS = {home:["home"], norme:["norme"], fiches:["fiches","catalogue","citer"], export:["export"], methode:["methode"]};
const SGROUPS = {biblio:["biblio"], todo:["todo"], controle:["controle","existence"], analyse:["analyse","fiabilite"]};
function openSide(name){
  const g = Object.keys(SGROUPS).find(k => SGROUPS[k].includes(name)) || "biblio";
  document.querySelectorAll("#stabs button").forEach(b => b.setAttribute("aria-pressed", b.dataset.st === g ? "true" : "false"));
  document.querySelectorAll("#side .dsec").forEach(x => x.classList.toggle("on", SGROUPS[g].includes(x.id.slice(3))));
  $("#side").hidden = false; document.body.classList.add("sideopen"); if($("#dash").open) $("#dash").close();
  $("#side .sbody").scrollTop = 0;
  marquerNav();
  if(name !== SGROUPS[g][0]){ const el = $("#dt-" + name); if(el && el.scrollIntoView) setTimeout(() => el.scrollIntoView({block: "start"}), 30); }
}
function closeSide(){ $("#side").hidden = true; document.body.classList.remove("sideopen"); marquerNav(); }
const DTITLES = {home:"SCIENTUS", todo:"À faire", norme:"Norme, profil et langue", fiches:"Références et catalogue", controle:"Contrôles et existence", analyse:"Analyse et fiabilité", export:"Export, encadreur et sauvegarde", methode:"Méthode et éthique"};
function dashTab(name){
  const g = Object.keys(DGROUPS).find(k => DGROUPS[k].includes(name)) || "home";
  $("#dashTitle").textContent = DTITLES[g] || "SCIENTUS"; $("#dashBack").hidden = g === "home";
  document.querySelectorAll("#dnav button").forEach(b => b.setAttribute("aria-pressed", b.dataset.dt === g ? "true" : "false"));
  document.querySelectorAll(".dsec").forEach(s => s.classList.toggle("on", DGROUPS[g].includes(s.id.slice(3))));
  $(".dscroll").scrollTop = 0;
  if(name !== DGROUPS[g][0]){ const el = $("#dt-" + name); if(el && el.scrollIntoView) setTimeout(() => el.scrollIntoView({block: "start"}), 30); }
}
function openDash(name){ if(name && Object.values(SGROUPS).some(v => v.includes(name))){ openSide(name); return; } dashTab(name || "home"); if(!$("#dash").open) $("#dash").showModal(); }
document.querySelectorAll(".menu [data-dt]").forEach(b => b.onclick = () => dashTab(b.dataset.dt));
document.querySelectorAll(".menu [data-go]").forEach(b => b.onclick = () => { $("#dash").close(); setView(b.dataset.go); });
$("#dashBack").onclick = () => dashTab("home");
$("#todoBtn").onclick = () => $("#side").hidden ? openSide("biblio") : closeSide();
$("#sideClose").onclick = closeSide;
document.querySelectorAll("#stabs button").forEach(b => b.onclick = () => openSide(b.dataset.st));
document.addEventListener("keydown", e => { if(e.key === "Escape" && !$("#side").hidden && !document.querySelector("dialog[open]")) closeSide(); });
$("#newProjBtn").onclick = () => { $("#dash").close(); projectDialog(); setTimeout(() => { const i = document.querySelector("#newProj [name=name]"); if(i) i.focus(); }, 60); };
$("#backBiblio").onclick = () => setView("biblio");
$("#dashBtn").onclick = () => openDash();
// navigation des modules (barre latérale ou barre du bas) : mêmes chemins que le menu
document.querySelectorAll("#appNav [data-nav]").forEach(b => b.onclick = () => {
  if(b.dataset.nav === "controle"){ setView("biblio"); openSide("controle"); return; }
  closeSide(); setView(b.dataset.nav);
});
document.querySelectorAll("#appNav [data-dash]").forEach(b => b.onclick = () => openDash(b.dataset.dash));
$("#anNew").onclick = () => $("#newProjBtn").click();
function marquerNav(){
  const v = document.body.dataset.view, ctl = !$("#side").hidden && $('#stabs [data-st="controle"]').getAttribute("aria-pressed") === "true";
  document.querySelectorAll("#appNav [data-nav]").forEach(b => { const on = ctl ? b.dataset.nav === "controle" : b.dataset.nav === v; on ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current"); });
}
$("#dashClose").onclick = () => $("#dash").close();
$("#dash").addEventListener("click", e => { if(e.target === $("#dash")) $("#dash").close(); });
$("#normChange").onclick = () => openDash("norme");
$("#todoBanner").onclick = () => openDash("todo");

/* ---------- fiches ---------- */
const sameRef = (a, b) => (a.doi && b.doi && norm(a.doi) === norm(b.doi)) || (norm(a.title) && norm(a.title) === norm(b.title) && a.year === b.year);
function addSources(list){
  list.forEach(s => { if(isAuto(s) && !s._orig){ s._orig = snapshot(s); s._method = s.origin; } });
  const fresh = []; list.forEach(s => { if(!state.sources.some(o => sameRef(o, s)) && !fresh.some(o => sameRef(o, s))) fresh.push(s); });
  state.sources.push(...fresh); save(); renderAll(); return fresh.length;
}
function removeSource(id){
  const i = state.sources.findIndex(s => s.id === id); if(i < 0) return;
  const s = state.sources[i]; state.sources.splice(i, 1); save(); renderAll();
  toast("Fiche retirée", "Annuler", () => { state.sources.splice(i, 0, s); save(); renderAll(); });
}
$("#clearBtn").onclick = () => {
  const old = state.sources; const oldFiles = ui.files;
  const oldThread = state.thread; state.sources = []; state.thread = []; ui.files = []; save(); renderAll();
  toast("Bibliographie vidée", "Annuler", () => { state.sources = old; state.thread = oldThread; ui.files = oldFiles; save(); renderAll(); });
};

/* ---------- lecture des fichiers ---------- */
async function waitFor(name){ for(let i = 0; i < 60 && !window[name]; i++) await new Promise(r => setTimeout(r, 100)); return window[name]; }
function htmlToMarked(html){
  return html.replace(/<(em|i)>([\s\S]*?)<\/\1>/g, (m, t, x) => "⟦" + x.replace(/<[^>]+>/g, "") + "⟧")
    .replace(/<\/(p|h\d|li|tr)>/g, "\n\n").replace(/<br\s*\/?>/g, "\n").replace(/<[^>]+>/g, "")
    .replace(/⟧(\s*)⟦/g, "$1").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
const withTimeout = (pr, ms) => Promise.race([pr, new Promise((_, rej) => setTimeout(() => rej(new Error("délai dépassé")), ms))]);
function loadScript(src){ return withTimeout(new Promise((res, rej) => { const el = document.createElement("script"); el.src = src; el.onload = res; el.onerror = () => rej(new Error("script")); document.head.appendChild(el); }), 20000); }
async function ocrPdf(pdf, f){
  const NO = "ce PDF est une image scannée et la reconnaissance de caractères ne peut pas se charger ici. Elle fonctionne sur la version installée sur ton site";
  if(!window.Tesseract){ try{ await loadScript("https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js"); }catch(e){ throw new Error(NO); } }
  const n = pdf.numPages; let pages = Array.from({length:n}, (_, i) => i + 1);
  if(n > 40) pages = [1, 2, 3, ...pages.slice(-30)]; // page de garde + fin du document, où se trouve la bibliographie
  f.status = "Document scanné : préparation de la reconnaissance de caractères (une seule fois)…"; renderFiles();
  let worker; try{ worker = await withTimeout(Tesseract.createWorker("fra+eng"), 180000); }catch(e){ throw new Error(NO); }
  let out = "", k = 0;
  try{
    for(const p of pages){
      k++; f.status = `Document scanné : lecture de la page ${k} sur ${pages.length}…`; f.busy = true; renderFiles();
      const page = await pdf.getPage(p), vp = page.getViewport({scale: 2});
      const c = document.createElement("canvas"); c.width = vp.width; c.height = vp.height;
      await page.render({canvasContext: c.getContext("2d"), viewport: vp}).promise;
      const r = await worker.recognize(c); out += r.data.text + "\n\n";
    }
  } finally { await worker.terminate(); }
  f.ocr = true; return out;
}
async function extract(file, f){
  const n = file.name.toLowerCase();
  if(n.endsWith(".docx")){
    const m = await waitFor("mammoth"); if(!m) throw new Error("le lecteur Word n’a pas pu se charger");
    const r = await m.convertToHtml({arrayBuffer: await file.arrayBuffer()});
    // titres de parties (styles Titre 1, Titre 2… de Word), pour le contrôle de structure NORCAMES
    if(f) f.headings = [...r.value.matchAll(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/g)].map(x => stripMarks(htmlToMarked(x[1])).replace(/\s+/g, " ").trim()).filter(Boolean);
    return htmlToMarked(r.value);
  }
  if(n.endsWith(".pdf")){
    const lib = await waitFor("pdfjsLib"); if(!lib) throw new Error("le lecteur PDF n’a pas pu se charger");
    lib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const pdf = await lib.getDocument({data: await file.arrayBuffer()}).promise;
    const pages = [];
    for(let p = 1; p <= Math.min(pdf.numPages, 400); p++){
      const c = await (await pdf.getPage(p)).getTextContent();
      pages.push(c.items.filter(it => it.str !== undefined).map(it => ({str: it.str, x: it.transform[4], y: it.transform[5], w: it.width || 0, h: Math.abs(it.transform[3])})));
    }
    const clean = pdfPagesToText(pages);
    if(clean.replace(/\s/g, "").length < 60 * Math.min(pdf.numPages, 400) && f) return await ocrPdf(pdf, f);
    return clean;
  }
  return await file.text();
}
function decide(text){
  const sec = findBibSection(text);
  // une liste de références n’est retenue que si ses entrées ressemblent vraiment à des références
  if(sec){ const r = splitReferences(sec.section); if(r.length >= 2 && partReferences(r) >= 0.6) return {mode:"biblio", body: sec.body, section: sec.section}; }
  const all = splitReferences(text);
  if(all.length >= 4 && all.join(" ").length > text.length * 0.5 && partReferences(all) >= 0.6) return {mode:"biblio", body:"", section:text};
  if(findCitations(stripMarks(text)).length >= 4) return {mode:"texte", body:text, section:""};
  return {mode:"source", body:"", section:""};
}

$("#pickBtn").onclick = () => $("#fileIn").click();
$("#fileIn").onchange = e => { handleFiles([...e.target.files]); e.target.value = ""; e.target.accept = ".docx,.pdf,.txt,.bib,.ris,.json,.bibliocard"; };
let dragN = 0;
window.addEventListener("dragenter", e => { if(!e.dataTransfer || ![...e.dataTransfer.types].includes("Files")) return; e.preventDefault(); dragN++; $("#dropVeil").classList.add("on"); });
window.addEventListener("dragover", e => { if(e.dataTransfer && [...e.dataTransfer.types].includes("Files")) e.preventDefault(); });
window.addEventListener("dragleave", () => { dragN = Math.max(0, dragN - 1); if(!dragN) $("#dropVeil").classList.remove("on"); });
window.addEventListener("drop", e => { if(!e.dataTransfer || !e.dataTransfer.files.length) return; e.preventDefault(); dragN = 0; $("#dropVeil").classList.remove("on"); handleFiles([...e.dataTransfer.files]); });

async function handleFiles(list){
  // une copie de secours ou un dossier de relecture se rouvre toujours ; un nouveau document demande la formule 1
  if(list.some(f => /\.(docx|pdf|txt|bib|ris)$/i.test(f.name)) && !exiger("biblio")) return;
  for(const file of list){
    const n = file.name.toLowerCase(); const ext = (n.split(".").pop() || "").toUpperCase();
    if(n.endsWith(".bib") || n.endsWith(".ris")){ post({role: "u", kind: "file", name: file.name, ext}); const l = (n.endsWith(".bib") ? parseBibtex : parseRis)(await file.text()); l.forEach(s => s.file = file.name); const before = new Set(state.sources.map(s => s.id)); const k = addSources(l); post({role: "a", kind: "added", ids: state.sources.filter(s => !before.has(s.id)).map(s => s.id), dup: l.length - k}); continue; }
    if(n.endsWith(".json") || n.endsWith(".bibliocard")){ try{ const d = JSON.parse(await file.text()); if(d.app === "BiblioCard-relecture"){ openReview(d); continue; } if(d.app === "BiblioCard-commentaires" && Array.isArray(d.comments)){ importComments(d); continue; } if(d.app === "BiblioCard-mesures" && Array.isArray(d.records)){ state.evalExtra = (state.evalExtra || []).concat(d.records.filter(r => r && r.fields)); save(); renderAll(); toast(`${d.records.length} mesures ajoutées au corpus`); continue; } if(d.projects && typeof d.projects === "object"){ syncCurrent(); Object.values(d.projects).forEach(p => { if(p && p.id) state.projects[p.id] = p; }); if(d.profiles) Object.assign(state.profiles, d.profiles); save(); renderAll(); toast(`Copie restaurée : ${Object.keys(d.projects).length} projet(s)`); continue; } if(Array.isArray(d.sources)){ state.sources = d.sources; save(); renderAll(); toast(`Copie restaurée : ${d.sources.length} fiches`); } else toast("Ce fichier n’est pas une copie SCIENTUS"); }catch(err){ toast("Copie illisible"); } continue; }
    if(!/\.(docx|pdf|txt)$/.test(n)){ toast(`${file.name} : seuls les fichiers Word (.docx) et PDF sont lus. Un ancien .doc doit être réenregistré en .docx.`); continue; }
    const f = {id: "f" + Math.random().toString(36).slice(2,8), name: file.name, ext, status: "Lecture…", busy: true};
    ui.files.push(f); renderFiles(); post({role: "u", kind: "file", name: file.name, ext, fid: f.id}); think(true);
    try{
      if(n.endsWith(".docx")) f.buf = await file.arrayBuffer();
      const text = await extract(file, f);
      if(!stripMarks(text).trim()){ Object.assign(f, {busy:false, error:true, status:"Aucun texte trouvé. Un PDF scanné doit d’abord passer par une reconnaissance de caractères."}); renderFiles(); think(false); post({role: "a", kind: "error", text: f.status}); continue; }
      Object.assign(f, {text}, decide(text)); IDB.put({name: f.name, text: stripMarks(text).slice(0, 3000000), at: Date.now()});
      await runFile(f);
      // le texte cite des œuvres absentes de la liste du document (ou il n’y a pas de liste) : on les cherche aussitôt
      if(!f.error && (f.mode === "biblio" || f.mode === "texte") && f.body && apparierCitations(stripMarks(f.body), state.sources).missing.length) await construireBiblio(f.name, true);
    }catch(err){ Object.assign(f, {busy:false, error:true, status:`Lecture impossible : ${err.message || err}`}); renderFiles(); think(false); post({role: "a", kind: "error", text: f.status}); }
  }
}

async function runFile(f){ think(true); try{ await runFileCore(f); } finally { think(false); }
  if(f.error) post({role: "a", kind: "error", text: f.status});
  else post({role: "a", kind: "import", mode: f.mode, gen: f.gen || null, file: f.name, ids: state.sources.filter(s => s.file === f.name).map(s => s.id), ocr: !!f.ocr, docx: !!f.buf, cites: f.mode === "texte" ? findCitations(stripMarks(f.body || "")).length : 0});
}
async function runFileCore(f){
  state.sources = state.sources.filter(s => s.file !== f.name);
  f.error = false; f.busy = true;
  if(f.mode === "biblio" && !f.section){ const sec = findBibSection(f.text); f.section = sec ? sec.section : f.text; f.body = sec ? sec.body : ""; }
  if(f.mode === "texte"){ f.body = f.body || f.text; f.busy = false; const c = findCitations(stripMarks(f.body)).length; f.status = `${c} citation${c > 1 ? "s" : ""} repérée${c > 1 ? "s" : ""}, comparées avec ta bibliographie ci-contre`; save(); renderAll(); return; }
  if(f.mode === "biblio"){
    const refs = splitReferences(f.section).filter(estReference); // jamais un paragraphe rédigé
    if(!refs.length){ Object.assign(f, {busy:false, error:true, status:"Aucune référence reconnue. Essaie « Source à citer » ou colle tes références."}); renderAll(); return; }
    f.status = `${refs.length} référence${refs.length > 1 ? "s" : ""} trouvée${refs.length > 1 ? "s" : ""}, mise en forme…`; renderFiles();
    const list = await parseMany(refs, f);
    list.forEach(s => s.file = f.name);
    /* Générer la bibliographie, ce n’est pas recopier la liste du document : on part des citations du texte.
       La liste du document ne sert que de source de données (auteur, année, titre, revue ou éditeur, volume,
       numéro, pages), rédigées ensuite selon la norme choisie. Une référence jamais citée n’est pas reprise ;
       une œuvre citée absente de la liste est cherchée en ligne (construireBiblio). */
    const corps = stripMarks(f.body || "");
    const v = corps.trim().length > 200 ? apparierCitations(corps, list) : null;
    if(v && v.total){
      const citees = new Set(v.pairs.map(x => x.s.id));
      f.nonCitees = list.filter(s => !citees.has(s.id));
      const k = addSources(list.filter(s => citees.has(s.id)));
      const aChercher = new Set(v.missing.map(x => norm(x.c.family) + annee(x.c))).size;
      f.gen = {citations: v.total, retenues: k, nonCitees: f.nonCitees.length, aChercher};
      f.busy = false; f.status = `${k} source${k > 1 ? "s" : ""} citée${k > 1 ? "s" : ""} retrouvée${k > 1 ? "s" : ""} dans la liste du document${aChercher ? `, ${aChercher} à chercher en ligne` : ""}${f.ocr ? ". Document scanné : relis attentivement" : ""}`;
    } else {
      // une simple liste de références, sans texte rédigé : il n’y a pas de citations à suivre
      const k = addSources(list); f.gen = null; f.nonCitees = [];
      f.busy = false; f.status = `${k} référence${k > 1 ? "s" : ""} ajoutée${k > 1 ? "s" : ""}${list.length - k ? `, ${list.length - k} déjà présente${list.length - k > 1 ? "s" : ""}` : ""}${f.ocr ? ". Document scanné : relis attentivement" : ""}`;
    }
    renderAll(); if(!net.blocked) runExistence(false); return;
  }
  f.status = "Identification de la source…"; renderFiles();
  let s = (await aiParse(stripMarks(f.text).slice(0, 4000), "meta") || [])[0];
  if(!s){
    s = blank(); s.origin = "Analyse automatique";
    const lines = stripMarks(f.text).split("\n").map(x => x.trim()).filter(Boolean).slice(0, 50);
    const COVER = /^(r[ée]sum[ée]|abstract|universit|minist|r[ée]publique|union|th[èe]se|m[ée]moire|pr[ée]sent[ée]e?|soutenue|sous la direction|direct(eur|rice)|jury|membres|ann[ée]e (universitaire|acad)|ufr|[ée]cole|facult|d[ée]partement|option|sp[ée]cialit|discipline|pour l.obtention|en vue|grade|dipl[ôo]me|doctorat|master|licence)/i;
    s.title = lines.find(l => l.length > 15 && l.length < 220 && !/^\d/.test(l) && !COVER.test(l)) || f.name.replace(/\.\w+$/, "");
    const uni = lines.find(l => /^universit[ée]/i.test(l)); if(uni) s.publisher = uni;
    const who = lines.find(l => l !== s.title && !COVER.test(l) && !/\d/.test(l) && l.split(/\s+/).length <= 5 && /(^|\s)\p{Lu}{2,}(\s|$)/u.test(l));
    if(who){ const a = parseAuthor(who.replace(/^(par|pr[ée]sent[ée]e? par)\s+/i, "")); if(a) s.authors = [a]; }
    const y = stripMarks(f.text).slice(0, 3000).match(/\b(19[5-9]\d|20[0-3]\d)\b/); if(y) s.year = y[1];
    if(/th[èe]se|doctorat|dissertation/i.test(f.text.slice(0, 3000))){ s.type = "thesis"; s.genre = /m[ée]moire/i.test(f.text.slice(0, 3000)) ? "Mémoire de master" : "Thèse de doctorat"; }
  }
  const doi = (stripMarks(f.text).slice(0, 6000).match(/10\.\d{4,9}\/[^\s"<>]+/) || [])[0];
  if(doi && !s.doi) s.doi = doi.replace(/[).,;]+$/, "");
  if(s.doi){ const cr = await crossref(s.doi); if(cr.source) s = cr.source; }
  s.file = f.name;
  const k = addSources([s]);
  f.busy = false; f.status = k ? `Source ajoutée : ${s.title.slice(0, 70)}${s.title.length > 70 ? "…" : ""}` : "Cette source est déjà dans ta bibliographie";
  renderAll();
}

async function parseMany(refs, f){
  const sample = f && f.demo ? null : await cap("sample");
  if(!sample) return refs.map(parseRefHeuristic).filter(s => s.title);
  const out = []; const size = 25;
  for(let i = 0; i < refs.length; i += size){
    const chunk = refs.slice(i, i + size);
    f.status = `Mise en forme ${Math.min(i + size, refs.length)} sur ${refs.length}…`; renderFiles();
    const ai = await aiParse(chunk.map(r => r.replace(/⟦/g, "*").replace(/⟧/g, "*")).join("\n"), "refs");
    out.push(...(ai && ai.length >= chunk.length * 0.6 ? ai : chunk.map(parseRefHeuristic).filter(s => s.title)));
  }
  return out;
}
function removeFile(id){
  const f = ui.files.find(x => x.id === id); if(!f) return;
  const removed = state.sources.filter(s => s.file === f.name);
  state.sources = state.sources.filter(s => s.file !== f.name); ui.files = ui.files.filter(x => x.id !== id); save(); renderAll();
  toast(`${f.name} retiré${removed.length ? ` avec ses ${removed.length} référence${removed.length > 1 ? "s" : ""}` : ""}`, "Annuler", () => { state.sources.push(...removed); ui.files.push(f); save(); renderAll(); });
}

/* ---------- IA (dans Claude) et CrossRef ---------- */
async function aiParse(text, mode){
  const sample = await cap("sample"); if(!sample) return null;
  const prompt = `Tu extrais des références bibliographiques. ${mode === "meta" ? "Le texte ci-dessous est le début d’un document (article, thèse, mémoire, livre, rapport). Décris CE document comme une seule référence." : "Chaque ligne ci-dessous est une référence bibliographique déjà rédigée. Rends-en exactement une par ligne, dans le même ordre. Les passages entre *astérisques* étaient en italique dans le document d’origine : en général le titre d’un livre ou le nom d’une revue."}
Réponds UNIQUEMENT par un tableau JSON. Chaque objet a les clés : type ("article"|"book"|"chapter"|"thesis"|"report"|"webpage"), authors (tableau de {"family","given"}), title, container (revue, ouvrage collectif ou site), year, volume, issue, pages, city, publisher (éditeur, ou université pour une thèse), edition, translator, editors, genre (diplôme pour une thèse ou un mémoire), url, doi, isbn.
N’invente rien : mets "" pour toute information absente. Garde l’orthographe et les accents d’origine. Un nom écrit en MAJUSCULES est un nom de famille.

Texte :
"""${text.slice(0, 16000)}"""`;
  try{
    const r = await sample.json(prompt);
    const arr = Array.isArray(r) ? r : (r && Array.isArray(r.references) ? r.references : [r]);
    return arr.filter(x => x && x.title).map(x => {
      const s = blank();
      Object.keys(s).forEach(k => { if(!["id","authors","origin"].includes(k) && x[k] != null) s[k] = String(x[k]).trim(); });
      if(!TYPE_LABEL[s.type]) s.type = "book";
      s.authors = Array.isArray(x.authors) ? x.authors.map(a => typeof a === "string" ? parseAuthor(a) : {family: String(a.family || "").trim(), given: String(a.given || "").trim()}).filter(a => a && a.family) : [];
      s.year = (String(x.year || "").match(/\d{4}/) || [""])[0];
      s.origin = "Analyse par l’IA";
      return s;
    });
  }catch(e){ return null; }
}
/* ---------- vérification d’existence ---------- */
const net = { blocked: false, running: false, done: 0, total: 0 };
async function getJSON(url, ms = 10000){
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try{ const r = await fetch(url, {signal: ctl.signal}); if(!r.ok) return {status: r.status}; return {data: await r.json()}; }
  catch(e){ return {error: true}; } finally { clearTimeout(t); }
}
/* ---------- OpenAlex : budget gratuit limité ----------
   Sans clé, chaque adresse IP dispose de 0,10 $ par jour (remis à zéro à minuit UTC). Une recherche par mots
   coûte 0,001 $, un filtre 0,0001 $ ; l’autocomplétion et la lecture d’une œuvre par son identifiant sont gratuites.
   On privilégie donc les appels gratuits, on garde les réponses 30 jours sur l’appareil, et quand le budget
   est épuisé on n’appelle plus OpenAlex jusqu’à la remise à zéro (CrossRef et HAL prennent le relais). */
const OA_MEMO = "bibliocard.oa:", OA_INDEX = "bibliocard.oa.index", OA_BLOQUE = "bibliocard.oa.bloque";
const oaBloque = () => { try{ return Date.now() < +(localStorage.getItem(OA_BLOQUE) || 0); }catch(e){ return false; } };
function oaMemoLire(url){
  try{ const c = JSON.parse(localStorage.getItem(OA_MEMO + url) || "null"); return c && Date.now() - c.at < 30 * 86400000 ? c.data : null; }catch(e){ return null; }
}
function oaMemoEcrire(url, data){
  try{
    const idx = JSON.parse(localStorage.getItem(OA_INDEX) || "[]").filter(u => u !== url); idx.push(url);
    while(idx.length > 150) localStorage.removeItem(OA_MEMO + idx.shift());
    try{ localStorage.setItem(OA_MEMO + url, JSON.stringify({at: Date.now(), data})); }
    catch(e){ idx.splice(0, idx.length >> 1).forEach(u => localStorage.removeItem(OA_MEMO + u)); } // mémoire pleine : on oublie la moitié la plus ancienne
    localStorage.setItem(OA_INDEX, JSON.stringify(idx));
  }catch(e){}
}
// payant : l’appel est décompté du budget du jour (les appels gratuits passent même quand il est épuisé)
async function oaJSON(url, payant, ms = 10000){
  const m = oaMemoLire(url); if(m) return {data: m};
  if(payant && oaBloque()) return {status: 429, bloque: true};
  for(let essai = 0; essai < 2; essai++){
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
    try{
      const r = await fetch(url, {signal: ctl.signal});
      if(r.status === 429){
        let attente = 0; try{ attente = +((await r.json()).retryAfter) || 0; }catch(e){}
        if(payant && attente > 60){ try{ localStorage.setItem(OA_BLOQUE, String(Date.now() + attente * 1000)); }catch(e){} return {status: 429, bloque: true}; }
        await new Promise(res => setTimeout(res, 1200)); continue; // limite par seconde : on réessaie une fois
      }
      if(!r.ok) return {status: r.status};
      const data = await r.json(); oaMemoEcrire(url, data); return {data};
    }catch(e){ return {error: true}; } finally { clearTimeout(t); }
  }
  return {status: 429};
}
const OA_CHAMPS = "display_name,title,publication_year,authorships,type,cited_by_count,primary_location,biblio,doi,open_access";
// autocomplétion (gratuite) puis fiches complètes des meilleures (gratuites aussi, une par œuvre)
async function oaAutocomplete(q, filtre){
  const r = await oaJSON(`https://api.openalex.org/autocomplete/works?q=${encodeURIComponent(q)}${filtre ? "&filter=" + filtre : ""}`);
  return r.data ? {L: (r.data.results || []).filter(x => x.entity_type === "work").map(fromOAAutocomplete)} : r;
}
async function oaOeuvre(id){ const r = await oaJSON(`https://api.openalex.org/works/${id}?select=${OA_CHAMPS}`); return r.data || null; }
const oaCand = w => ({
  title: w.display_name || w.title || "", year: w.publication_year, src: "OpenAlex",
  authors: (w.authorships || []).map(a => (a.author && a.author.display_name) || "").filter(Boolean),
  doi: String(w.doi || "").replace(/^https?:\/\/doi\.org\//i, ""), url: w.doi || w.id,
  container: (w.primary_location && w.primary_location.source && w.primary_location.source.display_name) || "",
  volume: (w.biblio && w.biblio.volume) || "", issue: (w.biblio && w.biblio.issue) || "",
  pages: w.biblio && w.biblio.first_page ? w.biblio.first_page + (w.biblio.last_page ? "-" + w.biblio.last_page : "") : "",
});
const titreRequete = s => s.title.replace(/[^\p{L}\p{N}\s'’-]/gu, " ").replace(/\s+/g, " ").trim();
// gratuit : autocomplétion sur le titre, puis les 3 fiches les plus proches
async function searchOpenAlex(s){
  const ac = await oaAutocomplete(titreRequete(s).slice(0, 120));
  if(!ac.L) return {error: true};
  const top = ac.L.sort((a, b) => simTitle(s.title, b.title) - simTitle(s.title, a.title)).slice(0, 3);
  return {cands: (await Promise.all(top.map(x => oaOeuvre(x._oaId)))).filter(Boolean).map(oaCand)};
}
// payant (0,001 $) : la recherche complète, plus tolérante, seulement quand rien d’autre n’a confirmé la référence
async function searchOpenAlexComplet(s){
  const r = await oaJSON(`https://api.openalex.org/works?search=${encodeURIComponent(titreRequete(s).slice(0, 200))}&per-page=6&select=${OA_CHAMPS}`, true);
  return r.data ? {cands: (r.data.results || []).map(oaCand)} : {error: true};
}
async function searchHal(s){
  const words = norm(s.title).split(" ").filter(w => w.length > 2).slice(0, 12).join(" ");
  if(!words) return {cands: []};
  const r = await getJSON(`https://api.archives-ouvertes.fr/search/?q=${encodeURIComponent("title_t:(" + words + ")")}&fl=title_s,authLastName_s,producedDateY_i,doiId_s,uri_s,journalTitle_s&rows=6&wt=json`);
  if(r.error) return {error:true};
  return {cands: (((r.data || {}).response || {}).docs || []).map(d => ({
    title: [].concat(d.title_s || "")[0], year: d.producedDateY_i, authors: [].concat(d.authLastName_s || []), src: "HAL",
    doi: d.doiId_s || "", url: d.uri_s || "", container: d.journalTitle_s || "",
  }))};
}
async function checkOne(s){
  const stamp = norm(s.title) + "|" + s.year + "|" + norm(s.doi);
  if(s.doi){
    const cr = await crossref(s.doi);
    if(cr.notFound) return {v:"suspect", stamp, reason:"Le DOI indiqué n’existe pas chez CrossRef."};
    if(cr.source){
      const t = simTitle(s.title, cr.source.title);
      if(t < .5) return {v:"suspect", stamp, reason:`Le DOI renvoie à une autre publication : « ${cr.source.title} » (${cr.source.year || "s.d."}).`, best:{...cr.source, src:"CrossRef", authors: cr.source.authors.map(a => a.family)}};
      return {v:"found", stamp, best:{...cr.source, src:"CrossRef", url:"https://doi.org/" + cr.source.doi, authors: cr.source.authors.map(a => a.family)}};
    }
    if(cr.blocked) return {error:true};
  }
  const cat = await catalog.find(s);
  if(cat && cat.ref) return {v: "found", stamp, best: {...cat.ref, src: `le catalogue SCIENTUS (confirmée par ${cat.n})`, authors: (cat.ref.authors || []).map(a => a.family)}};
  // 1. appels gratuits : autocomplétion OpenAlex, puis HAL
  const oa = await searchOpenAlex(s);
  let j = oa.error ? {v: "none"} : judge(s, oa.cands), halErreur = false;
  if(j.v !== "found"){ const hal = await searchHal(s); halErreur = !!hal.error; if(!hal.error){ const j2 = judge(s, hal.cands); if(j2.v === "found" || (j2.v === "close" && j.v === "none")) j = j2; } }
  if(j.v === "found") return {...j, stamp};
  // 2. rien de confirmé : la recherche complète d’OpenAlex avant de conclure. Si elle est refusée (budget du
  //    jour épuisé), on ne conclut pas : une référence n’est jamais déclarée introuvable faute de budget.
  const oa2 = await searchOpenAlexComplet(s);
  if(oa2.error) return oa.error && halErreur ? {error: true} : {plusTard: true};
  const j3 = judge(s, oa2.cands);
  if(j3.v === "found" || j.v === "none") j = j3;
  return {...j, stamp};
}
function existFor(s){ const e = state.exist[s.id]; return e && e.stamp === norm(s.title) + "|" + s.year + "|" + norm(s.doi) ? e : null; }
async function runExistence(manual){
  if(net.running) return;
  const todo = state.sources.filter(s => s.title && !existFor(s));
  if(!todo.length){ if(manual) toast("Toutes les références ont déjà été vérifiées"); renderAll(); return; }
  net.running = true; net.done = 0; net.total = todo.length; net.plusTard = 0; renderExist();
  let i = 0;
  const worker = async () => {
    while(i < todo.length && !net.blocked){
      const s = todo[i++];
      const r = await checkOne(s);
      if(r.error){ net.blocked = true; break; }
      if(r.plusTard){ net.plusTard++; net.done++; continue; }
      state.exist[s.id] = {...r, at: Date.now()}; net.done++;
      if(net.done % 3 === 0) renderExist();
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  net.running = false; save(); renderAll();
  if(!net.blocked){ const ex = labeled().map(s => ({s, e: existFor(s)})).filter(x => x.e); const c = v => ex.filter(x => x.e.v === v); post({role: "a", kind: "exist", found: c("found").length, suspect: c("suspect").length, close: c("close").length, none: c("none").length, sus: c("suspect").map(x => x.s.id)}); }
  else if(manual) post({role: "a", kind: "error", text: "Je ne peux pas joindre OpenAlex, HAL ni CrossRef depuis cette page. La vérification fonctionne sur la version installée sur ton site."});
  else if(!net.blocked){ const sus = Object.values(state.exist).filter(e => e.v === "suspect").length; toast(sus ? `${sus} référence${sus > 1 ? "s" : ""} suspecte${sus > 1 ? "s" : ""} : regarde la liste À faire` : "Vérification terminée"); }
  if(net.plusTard && !net.blocked) post({role: "a", kind: "info", text: `${net.plusTard} référence${net.plusTard > 1 ? "s n’ont" : " n’a"} pas pu être vérifiée${net.plusTard > 1 ? "s" : ""} aujourd’hui : OpenAlex a atteint sa limite gratuite du jour pour ta connexion Internet. Relance la vérification demain.`});
}

/* ================= CONSTRUIRE LA BIBLIOGRAPHIE À PARTIR DES CITATIONS =================
   Le chercheur a cité « P. Bourdieu (1982, p. 64) » dans son texte : on cherche l’œuvre dans OpenAlex et
   Open Library, on la classe d’après la phrase où elle est citée (moteur : classerCandidats), on complète
   éditeur et ville avec l’édition de l’année citée, puis on lui propose la référence. Rien n’est ajouté sans
   son accord, et ce qui est ajouté porte la mention « À relire ». Seuls le nom et l’année partent en ligne. */
const annee = c => String(c.year).replace(/[a-z]$/, "");
async function completerEdition(s, an){
  let key = s._olKey;
  if(!key){
    // le titre principal seul : Open Library ne trouve pas « Ce que parler veut dire : l’économie des… »
    const principal = s.title.split(/\s*[:.]\s+|\s+[–—]\s+/)[0].slice(0, 80);
    const r = await getJSON(`https://openlibrary.org/search.json?author=${encodeURIComponent((s.authors[0] || {}).family || "")}&title=${encodeURIComponent(principal)}&limit=1&fields=key`, 15000);
    key = r.data && r.data.docs && r.data.docs[0] && r.data.docs[0].key;
  }
  if(!key) return s;
  const e = await getJSON(`https://openlibrary.org${key}/editions.json?limit=80`, 15000);
  if(e.data) appliquerEdition(s, e.data.entries, an);
  return s;
}
// CrossRef (accès public) refuse les appels simultanés : une seule recherche à la fois
let crTour = Promise.resolve();
function crFile(url){ const r = crTour.then(() => getJSON(url, 15000)); crTour = r.catch(() => {}); return r; }
async function chercherCitation(c, ctx){
  const an = annee(c), fam = encodeURIComponent(c.family);
  // Open Library deux fois : les œuvres de l’auteur autour de l’année citée, et ses œuvres les plus éditées
  // (les 25 plus connues de Bourdieu ne comptent pas « Ce que parler veut dire », 1982)
  const [oa, ol, olAn] = await Promise.all([
    oaJSON(`https://api.openalex.org/works?filter=publication_year:${+an - 1}-${+an + 1},raw_author_name.search:${fam}&sort=cited_by_count:desc&per-page=15&select=display_name,title,publication_year,authorships,type,cited_by_count,primary_location,biblio,doi`, true),
    getJSON(`https://openlibrary.org/search.json?author=${fam}&limit=25&fields=key,title,subtitle,author_name,first_publish_year,edition_count`, 15000),
    getJSON(`https://openlibrary.org/search.json?q=${encodeURIComponent(`author:${c.family} first_publish_year:[${+an - 1} TO ${+an + 1}]`)}&limit=15&fields=key,title,subtitle,author_name,first_publish_year,edition_count`, 15000),
  ]);
  const olDocs = [...(((olAn.data || {}).docs) || []), ...(((ol.data || {}).docs) || [])].filter((d, i, T) => T.findIndex(x => x.key === d.key) === i);
  // OpenAlex refuse (budget du jour épuisé) : CrossRef, gratuit et sans plafond quotidien, prend le relais
  const cr = oa.data ? {} : await crFile(`https://api.crossref.org/works?query.author=${fam}&filter=from-pub-date:${+an - 1},until-pub-date:${+an + 1}&sort=is-referenced-by-count&order=desc&rows=20&select=DOI,title,author,issued,type,container-title,publisher,publisher-location,volume,issue,page,ISBN,editor,is-referenced-by-count`, 15000);
  if(!oa.data && !ol.data && !olAn.data && !cr.data) return {erreur: true};
  const cands = [...(((oa.data || {}).results) || []).map(fromOpenAlex),
    ...((((cr.data || {}).message || {}).items) || []).map(fromCrossrefRecherche),
    ...olDocs.filter(d => !d.first_publish_year || d.first_publish_year <= +an + 1).map(fromOpenLibrary)];
  const {verdict, L} = classerCandidats(c, ctx, cands);
  const top = L.slice(0, 3).map(x => ({...x.s, _score: Math.round(x.score * 100) / 100}));
  // un livre est cité dans une édition précise : son année, son éditeur, sa ville
  if(top[0] && top[0].type === "book"){ top[0].year = an; await completerEdition(top[0], an); }
  return {verdict, top};
}
async function construireBiblio(nom, sansCommande){
  if(!exiger("biblio")) return;
  const docs = ui.files.filter(f => f.body && (f.mode === "texte" || f.mode === "biblio") && (!nom || f.name === nom));
  if(!sansCommande) post({role: "u", kind: "cmd", text: "Construire ma bibliographie"});
  if(!docs.length){ post({role: "a", kind: "error", text: "Dépose d’abord ton document (Word, PDF ou texte) avec le bouton + : je construis la bibliographie à partir des citations de son texte."}); return; }
  const L = labeled(), vus = new Set(), todo = [];
  docs.forEach(f => { const body = stripMarks(f.body); apparierCitations(body, state.sources).missing.forEach(x => { const k = norm(x.c.family) + annee(x.c); if(vus.has(k)) return; vus.add(k); todo.push({c: x.c, ctx: contexteCitation(body, x.c.raw), file: f.name, pos: body.indexOf(x.c.raw)}); }); });
  todo.sort((a, b) => a.file === b.file ? a.pos - b.pos : 0); // dans l’ordre du texte
  if(!todo.length){ post({role: "a", kind: "info", text: "Toutes les citations de ton texte ont déjà leur référence dans la bibliographie."}); return; }
  post({role: "a", kind: "info", text: `Je cherche ${todo.length > 1 ? `les ${todo.length} œuvres citées` : "l’œuvre citée"} dans OpenAlex et Open Library…`}); think(true);
  const items = new Array(todo.length); let i = 0, horsLigne = 0;
  const travail = async () => { while(i < todo.length){ const k = i++, t = todo[k]; const r = await chercherCitation(t.c, t.ctx); if(r.erreur) horsLigne++;
    items[k] = {cite: {family: t.c.family, year: t.c.year, raw: citeVue(t.c)}, file: t.file, verdict: r.erreur ? "rien" : r.verdict, choix: (r.top || []).map(s => ({...s, _notoriete: undefined})), pick: 0, etat: "attente"}; } };
  await Promise.all([travail(), travail(), travail()]);
  think(false);
  if(horsLigne === todo.length){ post({role: "a", kind: "error", text: "Je n’arrive pas à joindre les bases en ligne. Vérifie ta connexion Internet, puis réessaie."}); return; }
  /* La bibliographie générée contient TOUTES les sources citées : la meilleure œuvre trouvée est ajoutée
     d’office (marquée « Œuvre à confirmer » s’il reste un doute, avec les autres possibilités à un geste), et
     une citation introuvable en ligne donne quand même son entrée (auteur, année), marquée « à compléter ». */
  for(const x of items){ if(x.choix.length) await ajouterChoix(x, x.verdict !== "sure"); else ajouterProvisoire(x); }
  post({role: "a", kind: "propositions", items, auto: true});
}
async function ajouterChoix(x, doute){
  const s = {...x.choix[x.pick], id: "s" + Math.random().toString(36).slice(2, 10), file: x.file};
  if(s.type === "book"){ s.year = annee(x.cite); if(!s.city || !s.publisher) await completerEdition(s, s.year); }
  ["_olKey", "_src", "_notoriete", "_score", "_oaId", "_lien"].forEach(k => delete s[k]);
  if(doute) s.aConfirmer = true;
  addSources([s]); x.etat = "ajoutee"; x.id = (state.sources.find(o => sameRef(o, s)) || s).id;
}
function ajouterProvisoire(x){
  const s = blank(); s.type = "book"; s.authors = [{family: x.cite.family, given: ""}]; s.year = annee(x.cite); s.file = x.file;
  s.origin = "Citation du texte"; s.aCompleter = true;
  addSources([s]); x.etat = "ajoutee"; x.provisoire = true; x.id = (state.sources.find(o => o.id === s.id) || s).id;
}
function retirerSource(id){ const i = state.sources.findIndex(s => s.id === id); if(i >= 0) state.sources.splice(i, 1); }
async function actionProposition(a){
  const m = (state.thread || []).find(x => x.id === a.m); if(!m) return;
  const x = m.items[a.i];
  if(a.t === "prop-ok") await ajouterChoix(x, false);
  else if(a.t === "prop-all"){ for(const y of m.items) if(y.etat === "attente" && y.verdict === "sure" && y.choix.length) await ajouterChoix(y, false); }
  else if(a.t === "prop-next"){ x.pick = (x.pick + 1) % x.choix.length; }
  // l’œuvre ajoutée n’est pas la bonne : on la remplace par la suivante
  else if(a.t === "prop-swap"){ retirerSource(x.id); x.pick = (x.pick + 1) % x.choix.length; await ajouterChoix(x, true); }
  else if(a.t === "prop-keep"){ const s = state.sources.find(o => o.id === x.id); if(s) delete s.aConfirmer; x.verdict = "sure"; }
  else if(a.t === "prop-del"){ retirerSource(x.id); x.etat = "ecartee"; }
  else if(a.t === "prop-no") x.etat = "ecartee";
  else if(a.t === "prop-man"){ const s = x.id && state.sources.find(o => o.id === x.id); if(s){ openForm(s, "title"); } else { const n = blank(); n.authors = [{family: x.cite.family, given: ""}]; n.year = annee(x.cite); n.file = x.file; x.etat = "main"; openForm(n, "title"); } }
  save(); renderAll(); renderThread(false);
}
function propCarte(m, x, i){
  const ajoutee = x.etat === "ajoutee" && state.sources.find(o => o.id === x.id);
  const s = ajoutee || x.choix[x.pick];
  const tag = x.etat === "ecartee" ? `<span class="tag">Écartée</span>` : x.etat === "main" ? `<span class="tag">Saisie à la main</span>`
    : x.provisoire ? `<span class="tag proof">À compléter</span>` : (ajoutee && !ajoutee.aConfirmer) || x.verdict === "sure" ? `<span class="tag ok">Trouvée</span>` : x.choix.length ? `<span class="tag brass">À confirmer</span>` : `<span class="tag proof">Introuvable</span>`;
  const act = (label, t, cls) => chip(label, {t, m: m.id, i}, cls);
  let chips = "";
  if(ajoutee) chips = x.provisoire ? `${act("Compléter", "prop-man", "pri")}${act("Retirer", "prop-del")}`
    : `${ajoutee.aConfirmer ? act("C’est la bonne", "prop-keep", "pri") : ""}${x.choix.length > 1 ? act(`Autre œuvre (${x.pick + 1}/${x.choix.length})`, "prop-swap") : ""}${act("Corriger", "prop-man")}${act("Retirer", "prop-del")}`;
  else if(x.etat === "attente") chips = s ? `${act("Ajouter", "prop-ok", "pri")}${x.choix.length > 1 ? act(`Autre œuvre (${x.pick + 1}/${x.choix.length})`, "prop-next") : ""}${act("Saisir à la main", "prop-man")}${act("Écarter", "prop-no")}` : `${act("Saisir à la main", "prop-man", "pri")}${act("Écarter", "prop-no")}`;
  return `<div class="prop ${x.etat}"><div class="pcite"><span>Citée${NB}: <b data-notr="1">${esc(x.cite.raw)}</b></span>${tag}</div>
    ${s && x.etat !== "ecartee" && x.etat !== "main" ? `<div class="ref">${bibFor(s)}</div>` : ""}
    ${x.provisoire ? `<p class="legend">Aucune œuvre de cet auteur pour cette année dans les bases ouvertes, fréquent pour les ouvrages publiés en Afrique : l’entrée est créée avec l’auteur et l’année, complète le titre et l’éditeur.</p>` : ""}
    ${chips ? `<div class="chips">${chips}</div>` : ""}
  </div>`;
}
/* ================= PLAN ET LECTURES =================
   Un modèle de plan (moteur : MODELES_PLAN) que le chercheur réécrit avec ses propres intitulés, puis, pour
   chaque partie, des lectures trouvées dans OpenAlex et HAL. SCIENTUS ne rédige rien : il propose une
   structure et des sources à lire. Seuls le sujet et les intitulés partent en ligne, jamais le texte. */
const plan = () => state.plan || (state.plan = planVide());
const docAvecPlan = () => ui.files.find(f => f.text && f.text.length > 300);
// plusieurs parties génériques donnent la même requête : une seule interrogation par adresse et par session
const memoLectures = new Map();
const getMemo = url => { if(!memoLectures.has(url)) memoLectures.set(url, getJSON(url).then(r => { if(!r.data) memoLectures.delete(url); return r; })); return memoLectures.get(url); };
async function chercherLectures(sujet, titre){
  const {mots, requetes} = requetesLectures(sujet, titre);
  if(!requetes.length) return {etat: "vague", L: [], requetes};
  // OpenAlex par l’autocomplétion, gratuite (fiches provisoires, complétées plus bas) ; HAL, sans limite
  const R = await Promise.all([...requetes.map(q => oaAutocomplete(q)),
    ...requetes.map(q => getMemo(`https://api.archives-ouvertes.fr/search/?q=${encodeURIComponent(q)}&rows=8&fl=title_s,authFullName_s,producedDateY_i,docType_s,uri_s,journalTitle_s,bookTitle_s,publisher_s,volume_s,issue_s,page_s,doiId_s,authorityInstitution_s&wt=json`))]);
  const oa = R.slice(0, requetes.length), hal = R.slice(requetes.length);
  if(oa.every(r => !r.L) && hal.every(r => !r.data)) return {etat: "erreur"};
  const cands = oa.flatMap(r => r.L || []);
  hal.forEach(r => (((r.data || {}).response || {}).docs || []).forEach(d => { const s = fromHal(d); s._lien = s.url; s.url = ""; cands.push(s); }));
  return {etat: "ok", L: classerLectures(mots, cands), requetes};
}
// fiches OpenAlex provisoires → fiches complètes (année, revue, pages), une lecture gratuite par œuvre
async function completerLectures(L){
  const W = await Promise.all(L.map(s => s._oaId ? oaOeuvre(s._oaId) : null));
  return L.map((s, i) => {
    if(!s._oaId) return s;
    const w = W[i]; if(!w) return null;
    const f = fromOpenAlex(w); f._lien = (w.open_access && w.open_access.oa_url) || (f.doi ? "https://doi.org/" + f.doi : ""); return f;
  }).filter(Boolean);
}
async function lecturesPour(items){
  if(!exiger("plan")) return;
  const P = plan(), R = new Array(items.length);
  items.forEach(it => it.lect = {etat: "cherche"}); renderPlan();
  let k = 0;
  const travail = async () => { while(k < items.length){ const i = k++; R[i] = await chercherLectures(P.sujet, items[i].t); } };
  await Promise.all([travail(), travail()]);
  // des parties génériques (« Conclusion », « Chapitre 5 : [titre] ») posent la même question : dans l’ordre du plan,
  // chacune reçoit les lectures suivantes, et quand il n’y en a plus, on l’invite à préciser son intitulé
  const rang = {};
  items.forEach((it, i) => {
    const r = R[i];
    if(r.L){ const cle = r.requetes.join("|"), d = rang[cle] || 0; rang[cle] = d + 6; r.L = r.L.slice(d, d + 6); if(d && !r.L.length) r.etat = "memes"; }
  });
  for(const r of R) if(r.L) r.L = await completerLectures(r.L); // partie par partie : OpenAlex limite à 10 appels par seconde
  items.forEach((it, i) => it.lect = R[i]);
  save(); renderPlan();
  if(items.every(it => it.lect.etat === "erreur")) toast("Je n’arrive pas à joindre OpenAlex ni HAL. Vérifie ta connexion Internet.");
}
function ajouterLecture(it, j){
  const s = {...it.lect.L[j], id: "s" + Math.random().toString(36).slice(2, 10), file: ""};
  ["_lien", "_src", "_notoriete", "_olKey", "_score", "_oaId"].forEach(k => delete s[k]);
  addSources([s]); renderPlan(); toast("Ajoutée à ta bibliographie, à relire");
}
function remplacerPlan(items, msg){
  const P = plan(), avant = P.items;
  P.items = items.map(x => ({n: x.n, t: x.t, r: x.r || "", sans: !!x.sans}));
  save(); renderPlan();
  if(avant.length) toast(msg, "Annuler", () => { P.items = avant; save(); renderPlan(); });
}
function lecturesHtml(it){
  const L = it.lect;
  if(!L) return `<div class="chips"><button class="chip" data-pa="lect">Lectures pour cette partie</button></div>`;
  if(L.etat === "cherche") return `<p class="legend">Recherche dans OpenAlex et HAL…</p>`;
  if(L.etat === "erreur") return `<p class="legend">Je n’arrive pas à joindre OpenAlex ni HAL. Vérifie ta connexion, puis réessaie.</p><div class="chips"><button class="chip" data-pa="lect">Réessayer</button></div>`;
  if(L.etat === "memes") return `<p class="legend">Cet intitulé cherche les mêmes mots que les parties plus haut : leurs lectures valent aussi pour celle-ci. Écris un intitulé plus précis pour en avoir d’autres.</p><div class="chips"><button class="chip" data-pa="lect">Chercher à nouveau</button></div>`;
  if(L.etat === "vague") return `<p class="legend">Cet intitulé est trop général pour chercher des lectures. Écris le sujet de ton travail en haut, ou un intitulé plus précis.</p><div class="chips"><button class="chip" data-pa="lect">Réessayer</button></div>`;
  if(!L.L.length) return `<p class="legend">Aucune lecture trouvée pour cet intitulé. Essaie un mot plus précis.</p><div class="chips"><button class="chip" data-pa="lect">Chercher à nouveau</button></div>`;
  return `<ol class="lects">${L.L.map((s, j) => `<li><div class="ref">${bibFor(s)}</div><div class="lmeta"><span>${esc(s._src || "")}</span>${s._notoriete ? `<span>Citée ${s._notoriete} fois</span>` : ""}${s._lien ? `<a href="${esc(s._lien)}" target="_blank" rel="noopener">Lire en ligne</a>` : ""}${state.sources.some(o => sameRef(o, s)) ? `<span class="tag ok">Dans ta bibliographie</span>` : `<button class="chip" data-pa="add" data-j="${j}">Ajouter à ma bibliographie</button>`}</div></li>`).join("")}</ol>
    <p class="legend">Lis chaque source avant de la citer. Mots recherchés : <span data-notr="1">${esc(L.requetes.join(" · "))}</span></p><div class="chips"><button class="chip" data-pa="lect">Chercher à nouveau</button></div>`;
}
function renderPlan(){
  const box = $("#planListe"); if(!box) return;
  const P = plan(), sel = $("#planModele");
  if(!sel.options.length) sel.innerHTML = Object.entries(MODELES_PLAN).map(([k, m]) => `<option value="${k}">${esc(m.nom)}</option>`).join("");
  sel.value = MODELES_PLAN[P.modele] ? P.modele : "article_theorique";
  if(document.activeElement !== $("#planSujet")) $("#planSujet").value = P.sujet || "";
  $("#planSource").textContent = `Modèle établi d’après : ${MODELES_PLAN[sel.value].source}. Remplace les intitulés entre crochets par les tiens.`;
  $("#planDoc").hidden = !docAvecPlan();
  $("#planActions").hidden = !P.items.length;
  box.innerHTML = P.items.length ? P.items.map((it, i) => `<div class="ppart n${it.n}" data-i="${i}">
    <div class="ph2"><input class="pt2" value="${esc(it.t)}" aria-label="Intitulé"><div class="pbt">
      <button data-pa="up" title="Monter" ${i ? "" : "disabled"}>↑</button><button data-pa="down" title="Descendre" ${i < P.items.length - 1 ? "" : "disabled"}>↓</button><button data-pa="niv" title="${it.n > 1 ? "Remonter d’un niveau" : "Faire une sous-partie"}">${it.n > 1 ? "⇤" : "⇥"}</button><button data-pa="del" title="Supprimer">✕</button></div></div>
    ${it.r ? `<p class="legend">${esc(it.r)}</p>` : ""}${it.sans ? "" : lecturesHtml(it)}</div>`).join("")
    : `<p class="legend">Choisis un modèle et touche « Proposer ce modèle »${docAvecPlan() ? ", ou reprends le plan de ton document" : ""}.</p>`;
}
$("#planBack").onclick = () => setView("biblio");
$("#planSujet").onchange = e => { plan().sujet = e.target.value.trim(); save(); };
$("#planModele").onchange = e => { plan().modele = e.target.value; save(); renderPlan(); };
$("#planAppliquer").onclick = () => { const P = plan(); P.modele = $("#planModele").value; remplacerPlan(MODELES_PLAN[P.modele].items, "Modèle proposé"); };
$("#planDoc").onclick = () => {
  const f = docAvecPlan(), items = f ? planDepuisTexte(f.text, f.headings) : [];
  if(!items.length){ toast("Je ne trouve pas de titres dans ton document : utilise un modèle."); return; }
  remplacerPlan(items, `Plan repris de « ${f.name} »`);
};
$("#planAjout").onclick = () => { plan().items.push({n: 1, t: "Nouvelle partie", r: ""}); save(); renderPlan(); const L = document.querySelectorAll("#planListe .pt2"); const i = L[L.length - 1]; if(i){ i.focus(); i.select(); } };
$("#planToutes").onclick = () => lecturesPour(plan().items.filter(it => !it.sans));
$("#planCopier").onclick = async () => {
  const txt = plan().items.map(it => "    ".repeat(it.n - 1) + it.t).join("\n");
  try{ await navigator.clipboard.writeText(txt); toast("Plan copié. Colle-le dans Word."); }catch(e){ toast("Copie impossible sur cet appareil"); }
};
$("#planListe").addEventListener("change", e => { if(!e.target.classList.contains("pt2")) return; const it = plan().items[+e.target.closest(".ppart").dataset.i]; if(it){ it.t = e.target.value.trim() || it.t; delete it.lect; save(); renderPlan(); } });
$("#planListe").addEventListener("click", e => {
  const b = e.target.closest("[data-pa]"); if(!b) return;
  const P = plan(), i = +b.closest(".ppart").dataset.i, it = P.items[i]; if(!it) return;
  const a = b.dataset.pa;
  if(a === "lect"){ lecturesPour([it]); return; }
  if(a === "add"){ ajouterLecture(it, +b.dataset.j); return; }
  if(a === "up" && i > 0) P.items.splice(i - 1, 2, P.items[i], P.items[i - 1]);
  else if(a === "down" && i < P.items.length - 1) P.items.splice(i, 2, P.items[i + 1], P.items[i]);
  else if(a === "niv") it.n = it.n > 1 ? 1 : 2;
  else if(a === "del"){ P.items.splice(i, 1); toast("Partie supprimée", "Annuler", () => { P.items.splice(i, 0, it); save(); renderPlan(); }); }
  save(); renderPlan();
});
function enrich(id){
  const s = state.sources.find(x => x.id === id), e = existFor(s); if(!e || !e.best) return;
  let n = 0;
  ["doi","container","volume","issue","pages","city","publisher","genre"].forEach(k => { if(!s[k] && e.best[k]){ s[k] = String(e.best[k]); n++; } });
  if(s.doi) e.stamp = norm(s.title) + "|" + s.year + "|" + norm(s.doi);
  save(); renderAll(); toast(n ? `${n} champ${n > 1 ? "s" : ""} complété${n > 1 ? "s" : ""} depuis ${e.best.src}` : "Rien à compléter : la fiche est déjà plus détaillée");
}
function existHint(s, e){
  if(e.v === "none") return s.type === "article" && langOf(s.title) === "en" ? "Introuvable pour un article en anglais : inhabituel, à vérifier." : "Introuvable dans les bases ouvertes. C’est fréquent pour les ouvrages, thèses et revues publiés en Afrique : vérifie auprès de la bibliothèque.";
  if(e.v === "close") return `Une publication proche existe : « ${e.best.title} » (${e.best.year || "s.d."}). Vérifie le titre ou l’année.`;
  if(e.v === "suspect") return e.reason;
  if(e.best.year && s.year && Math.abs(+e.best.year - +s.year) > 1) return `Trouvée dans ${e.best.src}, mais datée de ${e.best.year}. Vérifie l’édition que tu cites.`;
  return `Trouvée dans ${e.best.src}${e.best.year ? ` (${e.best.year})` : ""}.`;
}
function renderExist(){
  const box = $("#existBox"); if(!box) return;
  const L = labeled();
  const res = L.map(s => ({s, e: existFor(s)}));
  const c = {found:0, close:0, none:0, suspect:0}; res.forEach(x => { if(x.e) c[x.e.v]++; });
  const pending = res.filter(x => !x.e).length;
  let head;
  if(net.blocked) head = `<p class="note">La vérification interroge OpenAlex, CrossRef et HAL, trois bases ouvertes et gratuites. Cette page ne peut pas les joindre : la vérification fonctionne sur la version de SCIENTUS installée sur ton propre site (GitHub Pages ou Cloudflare Pages, gratuits).</p>`;
  else if(net.running) head = `<p class="legend"><span class="busy"></span> Vérification en cours : ${net.done} sur ${net.total}…</p>`;
  else head = `<dl class="kv"><div><dt>Trouvées</dt><dd>${c.found}</dd></div><div><dt>Suspectes</dt><dd>${c.suspect}</dd></div><div><dt>Proches</dt><dd>${c.close}</dd></div><div><dt>Introuvables</dt><dd>${c.none}</dd></div></dl>`;
  box.innerHTML = head + (L.length ? `<div class="row" style="margin:10px 0 4px"><button class="btn small primary" id="existRun" ${net.running ? "disabled" : ""}>${pending ? `Vérifier ${pending} référence${pending > 1 ? "s" : ""}` : "Tout revérifier"}</button></div>` : `<p class="legend">Ajoute des références pour vérifier qu’elles existent.</p>`) +
    res.filter(x => x.e).sort((a,b) => ["suspect","close","none","found"].indexOf(a.e.v) - ["suspect","close","none","found"].indexOf(b.e.v)).map(({s, e}) => `<div class="card"><div><h5>${esc(s.title)}</h5>
      <div class="meta">${esc(s.authors.map(a => a.family).join(", ") || "Auteur inconnu")}, ${esc(s.year || "s.d.")}</div>
      <span class="tag ${e.v === "suspect" ? "proof" : e.v === "found" ? "ok" : e.v === "close" ? "brass" : ""}">${EXIST_LABEL[e.v]}</span>
      <p class="legend" style="margin:6px 0 0">${esc(existHint(s, e))}${e.best && e.best.url ? ` <a href="${esc(e.best.url)}" target="_blank" rel="noopener">Voir la notice</a>` : ""}</p></div>
      <div class="cact">${e.v === "found" ? `<button data-enrich="${s.id}">Compléter</button>` : `<button data-edit2="${s.id}">Corriger</button>`}</div></div>`).join("");
  const run = $("#existRun"); if(run) run.onclick = () => { if(!pending) Object.keys(state.exist).forEach(k => delete state.exist[k]); net.blocked = false; runExistence(true); };
  box.querySelectorAll("[data-enrich]").forEach(b => b.onclick = () => enrich(b.dataset.enrich));
  box.querySelectorAll("[data-edit2]").forEach(b => b.onclick = () => openForm(state.sources.find(x => x.id === b.dataset.edit2)));
}

async function crossref(doi){
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000);
  try{
    const r = await fetch("https://api.crossref.org/works/" + encodeURIComponent(doi), {signal: ctl.signal});
    if(r.status === 404) return {notFound:true};
    if(!r.ok) throw new Error("http");
    return {source: fromCrossref((await r.json()).message)};
  }catch(e){ return {blocked:true}; } finally { clearTimeout(t); }
}

/* ---------- coller des références ---------- */
function detect(v){
  v = v.trim(); if(!v) return {kind:"none"};
  const lines = splitReferences(v);
  if(lines.length > 1) return {kind:"many", lines};
  if(/^(https?:\/\/(dx\.)?doi\.org\/)?10\.\d{4,9}\/\S+$/i.test(v) || /^doi:\s*10\./i.test(v)) return {kind:"doi", doi: v.match(/10\.\d{4,9}\/[^\s"<>]+/)[0].replace(/[).,;]+$/, "")};
  if(/^https?:\/\/\S+$/.test(v)) return {kind:"url", url:v};
  return {kind:"ref", text:v};
}
$("#smart").addEventListener("input", e => {
  const d = detect(e.target.value); const has = d.kind !== "none";
  $("#addBtn").classList.toggle("send", has); $("#addBtn").setAttribute("aria-label", has ? "Ajouter" : "Rédiger en parlant");
  e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, window.innerHeight * .34) + "px";
  $("#hint").innerHTML = {none:"", doi:"<b>DOI reconnu.</b> Je cherche la notice chez CrossRef.", url:"<b>Adresse web.</b> Je prépare une fiche de page web à compléter.", ref:"<b>Une référence.</b> Je la découpe en champs.", many:`<b>${d.lines ? d.lines.length : 0} références.</b> Je les ajoute toutes.`}[d.kind];
});
$("#smart").addEventListener("keydown", e => { if(e.key === "Enter" && !e.shiftKey && window.innerWidth >= 700){ e.preventDefault(); $("#addBtn").click(); } });
$("#addBtn").onclick = async () => {
  if(!$("#smart").value.trim()){ setView("redac"); return; }
  const raw = $("#smart").value.trim(); const it = intent(raw);
  if(it){ $("#smart").value = ""; $("#smart").dispatchEvent(new Event("input")); await runIntent(it, raw); return; }
  if(!exiger("biblio")) return;
  post({role: "u", kind: "text", text: raw.length > 600 ? raw.slice(0, 600) + "…" : raw});
  const before = new Set(state.sources.map(s => s.id));
  const d = detect($("#smart").value); const btn = $("#addBtn"); btn.disabled = true; btn.innerHTML = `<span class="busy"></span>`;
  try{
    if(d.kind === "doi"){
      const r = await crossref(d.doi);
      if(r.source){ addSources([r.source]); $("#smart").value = ""; post({role: "a", kind: "added", ids: state.sources.filter(s => !before.has(s.id)).map(s => s.id)}); }
      else if(r.notFound) post({role: "a", kind: "error", text: "CrossRef ne connaît pas ce DOI. Vérifie-le ou colle la référence complète."});
      else { const s = blank(); s.doi = d.doi; post({role: "a", kind: "info", text: "CrossRef ne répond pas depuis cette page : je t’ouvre une fiche avec le DOI, complète-la."}); openForm(s); $("#smart").value = ""; }
    } else if(d.kind === "url"){
      const s = blank(); s.type = "webpage"; s.url = d.url; try{ s.container = new URL(d.url).hostname.replace(/^www\./, ""); }catch(e){}
      s.accessed = new Date().toLocaleDateString(state.uiLang === "en" ? "en-GB" : "fr-FR", {day:"numeric", month:"long", year:"numeric"}); openForm(s, "title"); $("#smart").value = "";
      post({role: "a", kind: "info", text: "Je prépare une fiche de page web : complète son titre et son auteur."});
    } else {
      const refs = d.kind === "many" ? d.lines : [d.text]; think(true);
      const list = await parseMany(refs, {status:""});
      think(false); const k = addSources(list); $("#smart").value = "";
      post({role: "a", kind: "added", ids: state.sources.filter(s => !before.has(s.id)).map(s => s.id), dup: list.length - k});
    }
  } finally { btn.innerHTML = BTN_GO; btn.disabled = false; $("#smart").dispatchEvent(new Event("input")); }
};
const BTN_GO = $("#addBtn").innerHTML;
$("#manualBtn").onclick = () => openForm(null);
/* bouton + : tout ce qu’on peut ajouter */
function sheet(html){ const d = $("#dlg"); d.classList.add("sheetmenu"); d.innerHTML = html; const off = () => { d.classList.remove("sheetmenu"); d.removeEventListener("close", off); }; d.addEventListener("close", off); d.onclick = e => { if(e.target === d) d.close(); }; d.returnValue = ""; d.showModal(); return d; }
const OI = p => `<span class="oi"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">${p}</svg></span>`;
$("#pickBtn").onclick = () => {
  const d = sheet(`<div class="dhead"><h2>Ajouter</h2><button class="iconbtn" id="xClose">Fermer</button></div>
    <button class="opt" data-a="file">${OI('<path d="M7 3h7l5 5v13H7z M14 3v5h5" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linejoin="round"/>')}<span><b>Un document Word ou PDF</b><small>Ton mémoire, ta thèse, ou un article à citer</small></span></button>
    <button class="opt" data-a="bib">${OI('<path d="M5 6h14M5 12h14M5 18h9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>')}<span><b>Un export Zotero, Mendeley ou EndNote</b><small>Fichier BibTeX (.bib) ou RIS (.ris)</small></span></button>
    <button class="opt" data-a="manual">${OI('<path d="M5 19l4-1 9-9-3-3-9 9z" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linejoin="round"/>')}<span><b>Une référence à la main</b><small>Formulaire guidé selon le type de document</small></span></button>
    <button class="opt" data-a="review">${OI('<path d="M4 6h16v10H8l-4 4z" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linejoin="round"/>')}<span><b>Un dossier ou des commentaires d’encadreur</b><small>Fichier .bibliocard reçu par WhatsApp ou e-mail</small></span></button>
    <button class="opt" data-a="demo">${OI('<circle cx="12" cy="12" r="7" stroke="currentColor" stroke-width="1.7" fill="none"/><path d="M10.5 9l4 3-4 3z" fill="currentColor"/>')}<span><b>Le mémoire d’exemple</b><small>Pour découvrir l’outil ou faire une démonstration</small></span></button>`);
  d.querySelector("#xClose").onclick = () => d.close();
  d.querySelectorAll("[data-a]").forEach(b => b.onclick = () => { const a = b.dataset.a; d.close();
    if(a === "file"){ $("#fileIn").accept = ".docx,.pdf,.txt"; $("#fileIn").click(); }
    else if(a === "bib"){ $("#fileIn").accept = ".bib,.ris"; $("#fileIn").click(); }
    else if(a === "review"){ $("#fileIn").accept = ".bibliocard,.json"; $("#fileIn").click(); }
    else if(a === "manual") openForm(null);
    else $("#demoBtn").click();
  });
};
// zone de dépôt de l’accueil : même chemin que « + › Un document Word ou PDF » ; le glisser-déposer passe par la fenêtre
$("#dropZone").onclick = () => { $("#fileIn").accept = ".docx,.pdf,.txt"; $("#fileIn").click(); };
/* pastille : choisir la norme comme on choisit un modèle */
$("#normChange").onclick = () => {
  const d = sheet(`<div class="dhead"><h2>Norme</h2><button class="iconbtn" id="xClose">Fermer</button></div>
    ${Object.entries(STYLES).map(([k, v]) => `<button class="opt" data-st="${k}"><span><b>${esc(v.name)}</b><small>${esc(NOTES[k])}</small></span>${k === state.style ? `<span class="ck" aria-label="choisie">✓</span>` : ""}</button>`).join("")}
    <button class="opt" data-more="1" style="color:var(--brass);font-weight:600">Profils de revues et langue…</button>`);
  d.querySelector("#xClose").onclick = () => d.close();
  d.querySelectorAll("[data-st]").forEach(b => b.onclick = () => { d.close(); if(b.dataset.st === state.style) return; const name = STYLES[b.dataset.st].full; if(state.sources.length) runIntent({t: "style", v: b.dataset.st}, `Mettre en forme en ${name}`); else { state.style = b.dataset.st; save(); renderAll(); } });
  d.querySelector("[data-more]").onclick = () => { d.close(); openDash("norme"); };
};
/* micro de la barre : dicter une référence */
let cRec = null;
$("#cmic").onclick = () => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(cRec){ cRec.stop(); return; }
  if(!SR){ toast("Ce navigateur ne propose pas la dictée en direct. Utilise Chrome, Edge ou Safari, ou choisis Whisper."); return; }
  const r = new SR(); r.lang = (typeof red !== "undefined" && red.lang) || "fr-FR"; r.interimResults = false; r.continuous = false;
  r.onresult = e => { const t = applyVoice(e.results[0][0].transcript); const ta = $("#smart"); ta.value = (ta.value ? ta.value.trimEnd() + " " : "") + t; ta.dispatchEvent(new Event("input")); };
  r.onerror = () => toast("Accès au micro refusé. Autorise le micro pour cette page.");
  r.onend = () => { cRec = null; $("#cmic").classList.remove("on"); };
  try{ r.start(); cRec = r; $("#cmic").classList.add("on"); }catch(err){ cRec = null; }
};
$("#filter").oninput = e => { ui.filter = e.target.value; renderCards(); };
/* ---------- profils de revues ---------- */
const PROF_SAMPLE = [
  Object.assign(blank(), {type:"book", authors:[{family:"Amin", given:"Samir"}], title:"Les Défis de la mondialisation", year:"1996", city:"Paris", publisher:"L’Harmattan", _label:"1996"}),
  Object.assign(blank(), {type:"article", authors:[{family:"Diagne", given:"Souleymane Bachir"}], title:"Islam et philosophie. Leçons d’une rencontre", container:"Diogène", issue:"202", pages:"145-151", year:"2003", _label:"2003"}),
];
function renderProfiles(){
  const sel = $("#profSel"); const all = {...CAMES_PROFILES, ...state.profiles};
  sel.innerHTML = Object.entries(all).map(([k,v]) => `<option value="${k}" ${k === state.profile ? "selected" : ""}>${esc(v.name)}${state.profiles[k] ? " (personnalisé)" : ""}</option>`).join("") + `<option value="__new">Créer un profil…</option>`;
  sel.onchange = () => { if(sel.value === "__new"){ newProfile(); return; } state.profile = sel.value; save(); renderAll(); };
  const P = curProfile(); const custom = !!state.profiles[state.profile];
  const preview = PROF_SAMPLE.map(x => `<p class="ref" style="font-family:var(--serif);font-size:14px;padding-left:1.6em;text-indent:-1.6em;margin:4px 0">${camesBib(x, P)}</p>`).join("");
  const opt = (k, label) => `<label><input type="checkbox" data-po="${k}" ${P[k] ? "checked" : ""} ${custom ? "" : "disabled"}> ${label}</label>`;
  const pick = (k, label, choices) => `<label class="f"><span>${label}</span><select data-pv="${k}" ${custom ? "" : "disabled"}>${choices.map(([v,t]) => `<option value="${esc(v)}" ${P[k] === v ? "selected" : ""}>${t}</option>`).join("")}</select></label>`;
  $("#profBody").innerHTML = `${custom ? `<label class="f full"><span>Nom du profil</span><input data-pname value="${esc(P.name)}"></label>` : `<p class="legend">Source : ${esc(P.src)}.</p>`}
    <div class="opts">${opt("upper","Nom en majuscules")}${opt("nameComma","Virgule entre nom et prénom")}${opt("yearParen","Année entre parenthèses")}${opt("inJournal","« in » devant la revue")}</div>
    <div class="dbody" style="padding:10px 0 0">${pick("headSep","Après l’auteur et l’année",[[", ","une virgule"],[". ","un point"]])}${pick("placeSep","Entre ville et éditeur",[[", ","une virgule"],[`${NB}: `,"deux-points espacés"],[": ","deux-points"]])}${pick("pagesPrefix","Pages",[["p.","p."],["pp.","pp."]])}${pick("quotes","Guillemets du titre d’article",[["fr","« français »"],["en","“anglais”"]])}</div>
    <p class="legend" style="margin:12px 0 2px">Aperçu</p><div class="sheet" style="padding:14px 16px">${preview}</div>
    <div class="row" style="margin-top:10px">${custom ? `<button class="btn small" id="profDel">Supprimer ce profil</button>` : `<button class="btn small" id="profDup">Dupliquer pour l’adapter</button>`}</div>`;
  $("#profBody").querySelectorAll("[data-po]").forEach(c => c.onchange = () => { P[c.dataset.po] = c.checked; save(); renderAll(); });
  $("#profBody").querySelectorAll("[data-pv]").forEach(c => c.onchange = () => { P[c.dataset.pv] = c.value; save(); renderAll(); });
  const nm = $("#profBody [data-pname]"); if(nm) nm.onchange = () => { P.name = nm.value.trim() || "Profil sans nom"; save(); renderAll(); };
  const dup = $("#profDup"); if(dup) dup.onclick = () => newProfile(P);
  const del = $("#profDel"); if(del) del.onclick = () => { const k = state.profile, old = state.profiles[k]; delete state.profiles[k]; state.profile = "norcames"; save(); renderAll(); toast("Profil supprimé", "Annuler", () => { state.profiles[k] = old; state.profile = k; save(); renderAll(); }); };
}
function newProfile(base){
  const id = "p" + Math.random().toString(36).slice(2,8);
  state.profiles[id] = {...(base || CAMES_PROFILES.norcames), name: base ? base.name + " (adapté)" : "Mon école doctorale", src: "Profil personnalisé"};
  state.profile = id; save(); renderAll(); toast("Profil créé : règle-le ci-dessous");
}

/* ---------- formulaire ---------- */
const FIELDS = {
  article: [["container","Revue"],["volume","Volume"],["issue","Numéro"],["pages","Pages (ex. 145-151)"],["city","Lieu (facultatif)"],["doi","DOI"],["url","URL"]],
  book:    [["city","Ville d’édition"],["publisher","Éditeur"],["edition","Édition (ex. 2nde éd.)"],["translator","Traducteur"],["isbn","ISBN"],["doi","DOI"]],
  chapter: [["container","Titre de l’ouvrage"],["editors","Sous la direction de"],["city","Ville d’édition"],["publisher","Éditeur"],["pages","Pages du chapitre"],["doi","DOI"]],
  thesis:  [["genre","Diplôme (ex. Thèse de doctorat)"],["publisher","Université"],["city","Ville"],["url","URL"]],
  report:  [["publisher","Organisme"],["city","Ville"],["url","URL"]],
  webpage: [["container","Nom du site"],["url","URL"],["accessed","Consulté le (ex. 21 octobre 2026)"]],
};
function openForm(src, focusField){
  const isNew = !src || !state.sources.some(x => x.id === src.id); const s = src ? JSON.parse(JSON.stringify(src)) : blank(); const dlg = $("#dlg");
  const draw = () => {
    dlg.innerHTML = `<form method="dialog" id="srcForm">
      <div class="dhead"><h2>${isNew ? "Nouvelle fiche" : "Compléter la fiche"}</h2><button class="iconbtn" value="cancel" formnovalidate>Fermer</button></div>
      <div class="dbody">
        <label class="f full"><span>Type de document</span><select name="type">${Object.entries(TYPE_LABEL).map(([k,v]) => `<option value="${k}" ${k === s.type ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        <label class="f full"><span>Auteurs</span><textarea name="authors" rows="2">${esc(s.authors.map(authorToInput).join("\n"))}</textarea><small>Un auteur par ligne : Prénom Nom. Pour un nom composé : Nom, Prénom.</small></label>
        <label class="f full"><span>Titre</span><textarea name="title" rows="2">${esc(s.title)}</textarea></label>
        <label class="f"><span>Année</span><input name="year" inputmode="numeric" value="${esc(s.year)}"></label>
        ${FIELDS[s.type].map(([k,lab]) => `<label class="f"><span>${lab}</span><input name="${k}" value="${esc(s[k])}"></label>`).join("")}
      </div>
      <div class="dfoot"><button class="btn" value="cancel" formnovalidate>Annuler</button><button class="btn primary" value="save">${isNew ? "Ajouter la fiche" : "Enregistrer"}</button></div></form>`;
    dlg.querySelector("[name=type]").onchange = e => { collect(); s.type = e.target.value; draw(); };
  };
  const collect = () => { const fd = new FormData(dlg.querySelector("#srcForm")); for(const [k,v] of fd.entries()){ if(k === "authors") s.authors = String(v).split(/\n|;/).map(parseAuthor).filter(Boolean); else if(k !== "type") s[k] = String(v).trim(); } };
  draw();
  dlg.onclose = () => {
    if(dlg.returnValue !== "save") return; collect();
    if(!s.title){ toast("Ajoute au moins un titre"); return; }
    delete s.aConfirmer; delete s.aCompleter; // relue et enregistrée par le chercheur
    if(isNew){ if(!s.origin || s.origin === "Saisie manuelle" || isAuto(s)) s.origin = "Saisie manuelle"; addSources([s]) ? toast("Fiche ajoutée") : toast("Cette référence est déjà dans ta bibliographie"); }
    else { setTimeout(() => { if(state.catalogShare) shareVerified(true); }, 800); const i = state.sources.findIndex(x => x.id === s.id); if(isAuto(s)){ s._method = s._method || s.origin; s.origin = "Vérifiée"; s._validated = Date.now(); } state.sources[i] = s; save(); renderAll(); toast("Fiche enregistrée"); }
  };
  dlg.returnValue = ""; dlg.showModal();
  const ff = focusField && dlg.querySelector(`[name="${focusField}"]`); if(ff) setTimeout(() => ff.focus(), 50);
}

/* ---------- vérification d’un texte collé ---------- */
$("#vBtn").onclick = () => {
  const t = $("#vText").value; if(!t.trim()) return;
  const r = verifyAny(t, labeled());
  $("#vRes").innerHTML = `<p class="legend">${r.total} citation${r.total > 1 ? "s" : ""} repérée${r.total > 1 ? "s" : ""}. ${r.missing.length} sans référence, ${r.yearOff.length} avec une année différente.</p>` +
    (r.missing.length ? `<ul>${r.missing.map(x => `<li>${esc(citeVue(x.c))}</li>`).join("")}</ul>` : "") + (r.yearOff.length ? `<ul>${r.yearOff.map(x => `<li>${esc(citeVue(x.c))} : la référence indique ${esc(x.s._label)}</li>`).join("")}</ul>` : "");
};

/* ---------- copie et export ---------- */
async function copyRich(html){
  const text = stripHtml(html).replace(/\u00A0/g, " ");
  const full = `<div style="font-family:'Times New Roman',serif;font-size:12pt">${html}</div>`;
  try{ await navigator.clipboard.write([new ClipboardItem({"text/html": new Blob([full], {type:"text/html"}), "text/plain": new Blob([text], {type:"text/plain"})})]); toast("Copié, avec l’italique. Colle dans Word."); }
  catch(e){
    const div = document.createElement("div"); div.contentEditable = "true"; div.innerHTML = full; div.style.cssText = "position:fixed;left:-9999px;top:0"; document.body.appendChild(div);
    const r = document.createRange(); r.selectNodeContents(div); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
    const ok = document.execCommand("copy"); sel.removeAllRanges(); div.remove(); toast(ok ? "Copié, avec l’italique. Colle dans Word." : "Ton navigateur a bloqué la copie. Utilise « Télécharger en Word ».");
  }
}
const paras = () => labeled().map(s => `<p style="margin:0 0 6pt 1.25cm;text-indent:-1.25cm">${bibFor(s)}</p>`).join("");
async function download(filename, data, type){
  const dl = await cap("downloads");
  if(dl){ try{ await dl.save({filename, data}); }catch(e){ if(e && e.code && !/declin|cancel/i.test(e.code)) toast("Le téléchargement n’a pas abouti"); } return; }
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([data], {type})); a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function downloadWord(){
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>Références bibliographiques</title></head><body style="font-family:'Times New Roman',serif;font-size:12pt"><p style="font-size:14pt;font-weight:bold;margin-bottom:12pt">Références bibliographiques</p>${paras()}</body></html>`;
  saveWord(`bibliographie-${STYLES[state.style].name.replace(/\s+/g, "-")}`, html);
}
["#docBtn","#dDoc","#dockDl"].forEach(id => $(id).onclick = downloadWord);
["#copyBtn","#dCopy"].forEach(id => $(id).onclick = () => copyRich(paras()));
$("#bibBtn").onclick = () => download("bibliographie.bib", toBibtex(sortSources(state.sources)), "text/plain");
$("#risBtn").onclick = () => download("bibliographie.ris", toRis(sortSources(state.sources)), "text/plain");

/* ---------- sauvegarde ---------- */
$("#bkOut").onclick = () => { syncCurrent(); download("bibliocard-copie.json", JSON.stringify({app:"BiblioCard", version:5, projects: state.projects, profiles: state.profiles, sources: state.sources}, null, 1), "application/json"); };
$("#bkIn").onclick = () => $("#fileIn").click();

/* ---------- mémoire d’exemple, pour une démonstration en direct ---------- */
const DEMO = `Université Félix Houphouët-Boigny
Mémoire de master en sciences du langage

Introduction

La question de la mondialisation traverse les sciences humaines africaines. Comme l’écrit S. Amin (1996, p. 12), elle constitue d’abord un défi politique. S. B. Diagne (2003, p. 147) montre que la rencontre entre traditions intellectuelles est féconde, tandis que d’autres travaux insistent sur la gouvernance des biens communs (E. Ostrom, 1990, p. 30).

Dans le champ des médias, (A. Koné, 2020, p. 45) souligne le rôle de la presse dans l’alternance politique. Selon (M. Traoré, 2022, p. 14), le numérique transforme déjà les universités africaines. M. Ascher (1998, p. 223) propose enfin d’élargir l’histoire des savoirs à une perspective multiculturelle, ce que confirme (S. Diakité, 1985, p. 105).

Bibliographie

AMIN Samir, 1996, ⟦Les Défis de la mondialisation⟧, Paris, L’Harmattan.

BERGER Gaston, 1967, ⟦L’Homme moderne et son éducation⟧, Paris, PUF.

DIAGNE Souleymane Bachir, 2003, « Islam et philosophie. Leçons d’une rencontre », ⟦Diogène⟧, n° 202, p. 145-151.

DIAKITE Sidiki, 1985, ⟦Violence technologique et développement. La question africaine du développement⟧, L’Harmattan.

KONÉ Aminata, 2021, ⟦Discours médiatique et alternance politique en Côte d’Ivoire⟧, Thèse de doctorat, Abidjan, Université Félix Houphouët-Boigny.

Ostrom, E. (1990). ⟦Governing the commons: The evolution of institutions for collective action⟧. Cambridge University Press.

TRAORÉ Moussa, 2022, « L’intelligence artificielle dans les universités africaines », ⟦Revue africaine du numérique⟧, vol. 4, n° 2, p. 12-30, https://doi.org/10.9999/ran.2022.004.

Annexes

Annexe 1 : grille d’analyse du corpus, 2023.`;
$("#demoBtn").onclick = async () => {
  const f = {id: "f" + Math.random().toString(36).slice(2,8), name: "Exemple de mémoire.docx", ext: "DOCX", status: "Lecture…", busy: true, demo: true, text: DEMO};
  ui.files.push(f); post({role: "u", kind: "file", name: f.name, ext: "DOCX", fid: f.id}); Object.assign(f, decide(DEMO)); await runFile(f);

};

/* ---------- rapport de contrôle ---------- */
function downloadReport(){
  const L = labeled(), st = STYLES[state.style], c = conformity(state.sources, state.style), a = analyze(state.sources);
  const date = new Date().toLocaleDateString(state.uiLang === "en" ? "en-GB" : "fr-FR", {day:"numeric", month:"long", year:"numeric"});
  const h = (t) => `<p style="font-size:13pt;font-weight:bold;margin:16pt 0 6pt">${t}</p>`;
  const li = arr => arr.length ? `<ul>${arr.map(x => `<li>${x}</li>`).join("")}</ul>` : `<p>Rien à signaler.</p>`;
  const docs = ui.files.filter(f => f.body && f.body.trim().length > 200 && (f.mode === "biblio" || f.mode === "texte"));
  const reports = docs.map(f => { const r = verifyAny(stripMarks(f.body), L); return `<p><b>${esc(f.name)}</b> : ${r.total} citations dans le texte, ${r.missing.length} sans référence, ${r.yearOff.length} avec une année différente, ${r.unused.length} référence(s) jamais citée(s).</p>` +
    (r.missing.length ? `<p>Citées sans référence :</p>${li(r.missing.map(x => esc(citeVue(x.c))))}` : "") + (r.yearOff.length ? `<p>Années différentes :</p>${li(r.yearOff.map(x => `${esc(citeVue(x.c))} (bibliographie : ${esc(x.s._label)})`))}` : "") +
    (r.unused.length ? `<p>Jamais citées :</p>${li(r.unused.map(s => esc(stripHtml(st.cite(s, "", "parenthese")))))}` : ""); }).join("");
  const incomplete = L.map(s => ({s, m: checks(s, state.style, state.sources)})).filter(x => x.m.length).map(x => `${esc(stripHtml(st.cite(x.s, "", "parenthese")))} : ${esc(x.m.map(y => y.t).join(", "))}`);
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>Rapport de contrôle bibliographique</title></head>
  <body style="font-family:'Times New Roman',serif;font-size:12pt;line-height:1.4">
  <p style="font-size:18pt;font-weight:bold;margin:0">Rapport de contrôle bibliographique</p>
  <p style="color:#555;margin:2pt 0 14pt">Établi le ${date} avec SCIENTUS, norme ${esc(st.full)}</p>
  ${h("1. Synthèse")}
  <table style="border-collapse:collapse" cellpadding="6"><tr><td style="border:1px solid #999">Indicateur de conformité</td><td style="border:1px solid #999"><b>${c.score} %</b></td></tr>
  <tr><td style="border:1px solid #999">Références</td><td style="border:1px solid #999">${a.n} (dont ${c.complete} entièrement conformes)</td></tr>
  <tr><td style="border:1px solid #999">Période couverte</td><td style="border:1px solid #999">${a.min ? `${a.min}–${a.max}, médiane ${a.median}` : "non datée"}</td></tr>
  <tr><td style="border:1px solid #999">Références de moins de dix ans</td><td style="border:1px solid #999">${a.dated ? Math.round(100 * a.recent / a.dated) + " %" : "—"}</td></tr>
  <tr><td style="border:1px solid #999">Types</td><td style="border:1px solid #999">${Object.entries(a.byType).map(([k,v]) => `${TYPE_LABEL[k]} : ${v}`).join(", ")}</td></tr></table>
  ${a.notes.length ? `<p>Observations :</p>${li(a.notes.map(esc))}` : ""}
  ${h("2. Cohérence entre le texte et la bibliographie")}${reports || "<p>Aucun texte de document n’a été contrôlé.</p>"}
  ${h("3. Références incomplètes pour la norme")}${li(incomplete)}
  ${h("4. Existence des références")}${(() => { const ex = L.map(s => ({s, e: existFor(s)})).filter(x => x.e); if(!ex.length) return "<p>Vérification non effectuée.</p>"; const c = v => ex.filter(x => x.e.v === v); return `<p>Recherche dans OpenAlex, HAL et CrossRef : ${c("found").length} trouvée(s), ${c("suspect").length} suspecte(s), ${c("close").length} proche(s), ${c("none").length} introuvable(s) sur ${L.length}.</p>` + (c("suspect").length ? `<p>Références suspectes :</p>${li(c("suspect").map(x => `${esc(stripHtml(st.cite(x.s, "", "parenthese")))} : ${esc(x.e.reason)}`))}` : ""); })()}
  ${typeof red !== "undefined" && red.sim ? `${h("5. Similitudes de la rédaction")}<p>${Math.round(100 * red.sim.pct)} % du texte retrouvé dans d’autres documents, ${red.sim.unflagged} passage(s) repris sans guillemets ni citation, ${red.sim.reps} répétition(s) internes.${red.sim.online ? "" : " Comparaison limitée aux documents de l’utilisateur."}</p>` : ""}
  ${h("6. Bibliographie mise en forme")}${paras()}
  <p style="color:#777;font-size:10pt;margin-top:18pt">Indicateur de conformité : 70 % complétude des champs exigés par type de document, 30 % part de références entièrement conformes. Les références analysées automatiquement doivent être relues.</p>
  </body></html>`;
  saveWord(`${state.uiLang === "en" ? "check-report" : "rapport-controle"}-${st.name.replace(/\s+/g, "-")}`, state.uiLang === "en" ? translateHtml(html) : html);
}
$("#dReport").onclick = downloadReport;

/* ---------- installation et hors connexion ---------- */
let installEvt = null;
/* installation sur le téléphone ou le PC (application web installable) : le navigateur propose lui-même
   l’installation quand il le peut (Chrome, Edge, Android) ; sinon on explique les gestes, iPhone compris */
const estInstallee = () => (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
function boutonsInstaller(){ ["#installBtn", "#anInstall", "#welInstall"].forEach(s => { const b = $(s); if(b) b.hidden = estInstallee(); }); }
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; boutonsInstaller(); });
window.addEventListener("appinstalled", () => { installEvt = null; boutonsInstaller(); toast("SCIENTUS est installée"); });
async function installer(){
  if(installEvt){ installEvt.prompt(); const r = await installEvt.userChoice; installEvt = null; if(r && r.outcome === "accepted") toast("SCIENTUS est installée"); boutonsInstaller(); return; }
  const ua = navigator.userAgent, ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1), android = /Android/i.test(ua);
  const etapes = ios ? ["Ouvre cette page dans <b>Safari</b>.", "Touche le bouton <b>Partager</b> (le carré avec une flèche vers le haut).", "Choisis <b>Sur l’écran d’accueil</b>, puis <b>Ajouter</b>."]
    : android ? ["Ouvre cette page dans <b>Chrome</b>.", "Touche le menu <b>⋮</b> en haut à droite.", "Choisis <b>Installer l’application</b> (ou <b>Ajouter à l’écran d’accueil</b>)."]
    : ["Ouvre cette page dans <b>Chrome</b> ou <b>Edge</b>.", "Clique sur l’icône d’installation à droite de la barre d’adresse, ou ouvre le menu <b>⋮</b> › <b>Installer SCIENTUS</b>.", "SCIENTUS s’ouvre alors dans sa propre fenêtre, avec son icône sur le bureau."];
  const d = $("#dlg"); d.innerHTML = `<div class="dhead"><h2>Installer SCIENTUS</h2><button class="iconbtn" id="xClose">Fermer</button></div>
    <div class="instal"><p class="legend" style="margin:0 0 12px">${ios ? "Sur iPhone et iPad" : android ? "Sur téléphone Android" : "Sur ordinateur"}, l’installation est gratuite, ne passe par aucune boutique et ne prend que quelques secondes.</p>
    <ol>${etapes.map(e => `<li>${e}</li>`).join("")}</ol>
    <p class="legend">Une fois installée, SCIENTUS s’ouvre comme une application et fonctionne même sans connexion pour la mise en forme.</p></div>`;
  d.querySelector("#xClose").onclick = () => d.close(); d.showModal();
}
$("#installBtn").onclick = installer;
$("#anInstall").onclick = installer;
$("#welInstall").onclick = installer;
boutonsInstaller();
if(location.hash === "#installer") setTimeout(installer, 600);
window.addEventListener("offline", () => { setStatus("Hors connexion : tout fonctionne sauf la vérification en ligne"); });
window.addEventListener("online", () => { setStatus("De nouveau en ligne"); if(net.blocked){ net.blocked = false; } });

/* traduit un rapport généré, sans toucher aux références bibliographiques */
function translateHtml(html){
  const doc = new DOMParser().parseFromString(html, "text/html");
  const walk = n => { if(n.nodeType === 3){ const p = n.parentElement && n.parentElement.closest("p"); if(p && /text-indent:\s*-/.test(p.getAttribute("style") || "")) return; n.nodeValue = tr(n.nodeValue); } else n.childNodes.forEach(walk); };
  walk(doc.body); doc.title = tr(doc.title);
  return "<html><head><meta charset=\"utf-8\"><title>" + esc(doc.title) + "</title></head>" + doc.body.outerHTML + "</html>";
}
/* ================= export Word natif (.docx, format Office Open XML) ================= */
const xesc = t => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function runsOf(node, fmt = {}, out = []){
  node.childNodes.forEach(n => {
    if(n.nodeType === 3){ if(n.nodeValue) out.push({t: n.nodeValue, i: !!fmt.i, b: !!fmt.b}); }
    else if(n.nodeType === 1){ const tag = n.tagName.toLowerCase(); if(tag === "br"){ out.push({br: true}); return; }
      runsOf(n, {i: fmt.i || tag === "i" || tag === "em", b: fmt.b || tag === "b" || tag === "strong" || /bold/.test(n.getAttribute("style") || "")}, out); }
  });
  return out;
}
function htmlToBlocks(html){
  const doc = new DOMParser().parseFromString(html, "text/html");
  return [...doc.body.querySelectorAll("p, li, tr")].map(el => {
    const st = el.getAttribute("style") || "", tag = el.tagName.toLowerCase();
    let kind = "p";
    if(/font-size:\s*(1[6-9]|2\d)pt/.test(st)) kind = "title"; else if(/font-size:\s*1[34]pt/.test(st) && /bold/.test(st)) kind = "h"; else if(/text-indent:\s*-/.test(st)) kind = "ref"; else if(tag === "li") kind = "li";
    let runs;
    if(tag === "tr"){ runs = []; [...el.children].forEach((td, i) => { if(i) runs.push({t: state.uiLang === "en" ? ": " : `${NB}: `}); runs.push(...runsOf(td)); }); }
    else runs = runsOf(el);
    return {kind, runs, justify: /justify/.test(st)};
  }).filter(b => b.runs.some(r => r.t && r.t.trim()));
}
function paraXml(b){ return docxXml([b], true); }
function docxXml(blocks, bare){
  const para = b => {
    const pPr = (b.kind === "title" ? `<w:pStyle w:val="Title"/>` : b.kind === "h" ? `<w:pStyle w:val="Heading1"/>` : "") +
      (b.kind === "ref" ? `<w:ind w:left="709" w:hanging="709"/>` : b.kind === "li" ? `<w:ind w:left="567" w:hanging="284"/>` : "") +
      (b.justify ? `<w:jc w:val="both"/>` : "") + `<w:spacing w:after="${b.kind === "ref" ? 100 : 140}" w:line="${b.kind === "ref" ? 240 : 300}" w:lineRule="auto"/>`;
    const runs = (b.kind === "li" ? [{t: "•\t"}] : []).concat(b.runs).map(r => r.br ? `<w:r><w:br/></w:r>` : `<w:r><w:rPr>${r.i ? "<w:i/>" : ""}${r.b ? "<w:b/>" : ""}</w:rPr><w:t xml:space="preserve">${xesc(r.t.replace(/\u00A0/g, "\u00A0"))}</w:t></w:r>`).join("");
    return `<w:p><w:pPr>${pPr}</w:pPr>${runs}</w:p>`;
  };
  if(bare) return blocks.map(para).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${blocks.map(para).join("")}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1417" w:bottom="1417" w:left="1417" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;
}
const DOCX_STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="fr-FR"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="280" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style></w:styles>`;
async function saveWord(base, html){
  const JSZip = window.JSZip || await waitFor("JSZip");
  if(!JSZip){ download(base + ".doc", "\ufeff" + html, "application/msword"); return; }
  const z = new JSZip();
  z.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`);
  z.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`);
  z.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  z.file("docProps/core.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xesc(base)}</dc:title><dc:creator>SCIENTUS</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().slice(0,19)}Z</dcterms:created></cp:coreProperties>`);
  z.file("word/styles.xml", DOCX_STYLES);
  z.file("word/document.xml", docxXml(htmlToBlocks(html)));
  const MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const blob = new Blob([await z.generateAsync({type: "uint8array", compression: "DEFLATE"})], {type: MIME});
  download(base + ".docx", blob, blob.type);
}

/* ================= PROJETS ================= */
function renderProjBtn(){
  const p = state.projects[state.current];
  $("#projBtn").innerHTML = `<span class="pn" data-notr="1">${esc(p ? p.name : "")}</span><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const list = Object.values(state.projects).sort((a, b) => b.updatedAt - a.updatedAt);
  const pl = $("#projList"); if(pl){ pl.innerHTML = list.slice(0, 12).map(x => `<button data-pj="${x.id}" class="${x.id === state.current ? "cur" : ""}"><span data-notr="1" style="margin:0;color:inherit;font-size:inherit">${esc(x.name)}</span><span>${x.id === state.current ? state.sources.length : x.sources.length}</span></button>`).join("") + `<button class="manage" id="projManage">Gérer les projets</button>`;
    pl.querySelectorAll("[data-pj]").forEach(b => b.onclick = () => { $("#dash").close(); switchProject(b.dataset.pj); });
    $("#projManage").onclick = () => { $("#dash").close(); projectDialog(); }; }
}
function switchProject(pid){
  if(pid === state.current) return;
  syncCurrent(); ui.filesBy = ui.filesBy || {}; ui.filesBy[state.current] = ui.files;
  loadProject(pid); ui.files = ui.filesBy[pid] || []; ui.dismissed = new Set(); if(typeof red !== "undefined") red.sim = null;
  refreshDraftUi(); save(); renderAll(); toast(`Projet ouvert : ${state.projects[pid].name}`);
}
function projectDialog(){
  syncCurrent();
  const dlg = $("#dlg"); const list = Object.values(state.projects).sort((a, b) => b.updatedAt - a.updatedAt);
  dlg.innerHTML = `<div class="dhead"><h2>Mes projets</h2><button class="iconbtn" id="xClose">Fermer</button></div>
    <div class="plist">${list.map(p => `<div class="pitem"><div><h5>${esc(p.name)} ${p.id === state.current ? `<span class="tag ok">ouvert</span>` : ""}</h5><div class="meta">${esc(KINDS[p.kind] || "")}, ${p.sources.length} référence${p.sources.length > 1 ? "s" : ""}${p.draft && p.draft.text ? `, ${wordsOf(p.draft.text).length} mots rédigés` : ""}</div></div>
      <div class="cact">${p.id !== state.current ? `<button data-open="${p.id}">Ouvrir</button>` : ""}<button data-ren="${p.id}">Renommer</button>${list.length > 1 ? `<button data-delp="${p.id}">Supprimer</button>` : ""}</div></div>`).join("")}</div>
    <form class="dbody" id="newProj" style="border-top:1px solid var(--line)">
      <label class="f"><span>Nouveau projet</span><input name="name" placeholder="ex. Thèse, chapitre 2" required></label>
      <label class="f"><span>Type</span><select name="kind">${Object.entries(KINDS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></label>
      <div class="f full"><button class="btn primary">Créer et ouvrir</button></div>
    </form>`;
  dlg.querySelector("#xClose").onclick = () => dlg.close();
  dlg.querySelectorAll("[data-open]").forEach(b => b.onclick = () => { dlg.close(); switchProject(b.dataset.open); });
  dlg.querySelectorAll("[data-ren]").forEach(b => b.onclick = () => {
    const p = state.projects[b.dataset.ren]; const box = b.closest(".pitem").firstElementChild;
    box.innerHTML = `<input class="filter" value="${esc(p.name)}" aria-label="Nouveau nom" style="margin:0"><div class="row" style="margin-top:6px"><button class="btn small primary" data-ok>Enregistrer</button></div>`;
    const inp = box.querySelector("input"); inp.focus(); inp.select();
    const done = () => { if(inp.value.trim()){ p.name = inp.value.trim(); save(); renderProjBtn(); } projectDialog(); };
    box.querySelector("[data-ok]").onclick = done; inp.onkeydown = e => { if(e.key === "Enter"){ e.preventDefault(); done(); } };
  });
  dlg.querySelectorAll("[data-delp]").forEach(b => b.onclick = () => {
    const p = state.projects[b.dataset.delp];
    if(b.dataset.armed !== "1"){ b.dataset.armed = "1"; b.textContent = `Confirmer (${p.sources.length} réf.)`; b.style.color = "var(--proof)"; return; }
    delete state.projects[p.id]; if(dbH) dbH.projs.doc(p.id).delete().catch(() => {});
    if(p.id === state.current){ loadProject(Object.keys(state.projects)[0]); ui.files = []; refreshDraftUi(); }
    save(); renderAll(); projectDialog(); toast("Projet supprimé");
  });
  dlg.querySelector("#newProj").onsubmit = e => {
    e.preventDefault(); const fd = new FormData(e.target); const p = blankProject(String(fd.get("name")).trim() || "Nouveau projet", fd.get("kind"));
    p.style = state.style; p.profile = state.profile; state.projects[p.id] = p; dlg.close(); switchProject(p.id);
  };
  if(!dlg.open) dlg.showModal();
}
$("#projBtn").onclick = projectDialog;

/* ================= SYNCHRONISATION ENTRE APPAREILS ================= */
const LSS = "bibliocard.session";
const sync = { session: null, busy: false,
  get on(){ return !dbH && !!(state.catalogCfg && state.catalogCfg.url && state.catalogCfg.key); },
  url(path){ return state.catalogCfg.url.replace(/\/$/, "") + path; },
  head(tok){ return {apikey: state.catalogCfg.key, Authorization: "Bearer " + (tok || state.catalogCfg.key), "Content-Type": "application/json"}; },
  load(){ try{ this.session = JSON.parse(localStorage.getItem(LSS) || "null"); }catch(e){ this.session = null; } },
  keep(){ try{ this.session ? localStorage.setItem(LSS, JSON.stringify(this.session)) : localStorage.removeItem(LSS); }catch(e){} },
  fromHash(){
    const h = new URLSearchParams(location.hash.replace(/^#/, "")); const at = h.get("access_token"); if(!at) return false;
    let user = {}; try{ user = JSON.parse(atob(at.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))); }catch(e){}
    this.session = {access_token: at, refresh_token: h.get("refresh_token"), expires_at: Date.now() + (+h.get("expires_in") || 3600) * 1000, uid: user.sub, email: user.email};
    this.keep(); try{ history.replaceState(null, "", location.pathname + location.search); }catch(e){} return true;
  },
  async token(){
    if(!this.session) return null;
    if(this.session.expires_at - Date.now() > 60000) return this.session.access_token;
    try{ const r = await fetch(this.url("/auth/v1/token?grant_type=refresh_token"), {method: "POST", headers: this.head(), body: JSON.stringify({refresh_token: this.session.refresh_token})}); if(!r.ok) throw 0; const d = await r.json(); Object.assign(this.session, {access_token: d.access_token, refresh_token: d.refresh_token, expires_at: Date.now() + d.expires_in * 1000}); this.keep(); return d.access_token; }
    catch(e){ return null; }
  },
  async signIn(email){
    const r = await fetch(this.url("/auth/v1/otp?redirect_to=" + encodeURIComponent(location.href.split("#")[0])), {method: "POST", headers: this.head(), body: JSON.stringify({email, create_user: true})});
    return r.ok;
  },
  async push(){
    if(!this.on || !this.session) return; const tok = await this.token(); if(!tok) return;
    try{ await fetch(this.url("/rest/v1/bibliotheques?on_conflict=user_id"), {method: "POST", headers: {...this.head(tok), Prefer: "resolution=merge-duplicates,return=minimal"}, body: JSON.stringify([{user_id: this.session.uid, json: JSON.stringify(state), updated_at: state.updatedAt}])}); this.last = Date.now(); }catch(e){}
  },
  async pull(){
    if(!this.on || !this.session) return; const tok = await this.token(); if(!tok) return;
    try{ const r = await fetch(this.url(`/rest/v1/bibliotheques?select=json,updated_at&user_id=eq.${this.session.uid}`), {headers: this.head(tok)}); if(!r.ok) return; const rows = await r.json();
      if(rows[0] && rows[0].updated_at > (state.updatedAt || 0)){ const d = JSON.parse(rows[0].json); Object.keys(state).forEach(k => { if(d[k] !== undefined) state[k] = d[k]; }); ensureProjects(); refreshDraftUi(); renderAll(); toast("Bibliothèque synchronisée depuis tes autres appareils"); }
      else if(!rows[0]) this.push();
    }catch(e){}
  },
};
function renderSync(){
  const box = $("#syncBox"); if(!box) return;
  $("#syncBlk").hidden = !!dbH || (window.BIBLIOCARD_CONFIG || {}).serveur === false; // autonome : la copie de secours remplace la synchronisation
  if(compte.payant && !sync.session){ box.innerHTML = `<p class="legend">Retrouve ta bibliothèque sur ton téléphone et ton ordinateur : connecte-toi avec le même compte Google sur chaque appareil.</p><button class="btn gbtn" id="syncG">${G_ICON}Continuer avec Google</button>`; $("#syncG").onclick = () => compte.connecter(); return; }
  if(!sync.on){ box.innerHTML = `<p class="legend">Sur ton propre site, la synchronisation utilise la même base gratuite que le catalogue partagé. Connecte d’abord le catalogue (Références et catalogue), puis reviens ici.</p>`; return; }
  if(sync.session){ box.innerHTML = `<p class="legend">Connecté avec <b data-notr="1">${esc(sync.session.email || "")}</b>. Ta bibliothèque se synchronise à chaque modification.</p><div class="row"><button class="btn small" id="syncNow">Synchroniser maintenant</button><button class="btn small" id="syncOut">Se déconnecter</button></div>`;
    $("#syncNow").onclick = async () => { await sync.push(); toast("Synchronisé"); }; $("#syncOut").onclick = () => { compte.deconnecter(); toast("Déconnecté"); }; return; }
  box.innerHTML = `<p class="legend">Retrouve ta bibliothèque sur ton téléphone et ton ordinateur. Indique ton e-mail : tu recevras un lien de connexion, sans mot de passe.</p><div class="row"><input class="filter" id="syncMail" type="email" placeholder="ton.email@exemple.com" style="flex:1;margin:0"><button class="btn small primary" id="syncGo">Recevoir le lien</button></div>`;
  $("#syncGo").onclick = async () => { const m = $("#syncMail").value.trim(); if(!/^\S+@\S+\.\S+$/.test(m)){ toast("Adresse e-mail invalide"); return; } try{ const ok = await sync.signIn(m); toast(ok ? "Lien envoyé : ouvre ton e-mail sur cet appareil" : "L’envoi du lien a échoué"); }catch(e){ toast("Le service de synchronisation est injoignable"); } };
}
sync.load(); sync.fromHash();

/* ================= COMPTE ET ABONNEMENT =================
   Actif seulement quand js/config.js donne le projet Supabase de SCIENTUS (version en ligne payante).
   Sans configuration (tests, démonstration dans Claude, copie locale), toutes les fonctions restent ouvertes.
   La connexion se fait avec Google ; l’essai, la formule et les dates viennent du serveur (fonction mon_acces).
   Les documents de l’utilisateur ne quittent jamais l’appareil : seuls son e-mail et son abonnement sont en ligne. */
const CFG = window.BIBLIOCARD_CONFIG || {};
if(CFG.supabaseUrl && CFG.supabaseKey) state.catalogCfg = {url: CFG.supabaseUrl, key: CFG.supabaseKey};
const LSA = "bibliocard.acces";
const compte = { acces: null,
  get payant(){ return !!(CFG.supabaseUrl && CFG.supabaseKey && CFG.payant !== false); },
  formule(){ return !this.payant ? 3 : sync.session ? formuleEnVigueur(this.acces, Date.now()) : 0; },
  init(){
    // après la lecture des réglages enregistrés : le serveur officiel l’emporte sur une ancienne configuration
    if(CFG.supabaseUrl && CFG.supabaseKey){ state.catalogCfg = {url: CFG.supabaseUrl, key: CFG.supabaseKey}; catalog.init(); }
    // application autonome : on oublie un serveur enregistré par une version précédente (rien ne part en ligne)
    else if(CFG.serveur === false && state.catalogCfg && state.catalogCfg.url){ state.catalogCfg = {url: "", key: ""}; save(); }
    try{ this.acces = sync.session ? JSON.parse(localStorage.getItem(LSA) || "null") : null; }catch(e){ this.acces = null; }
    const retour = new URLSearchParams(location.search).get("paiement");
    if(retour){ try{ history.replaceState(null, "", location.pathname + location.hash); }catch(e){} }
    this.rafraichir().then(() => {
      if(retour === "retour") this.attendrePaiement();
      else if(retour === "annule") toast("Paiement annulé : rien n’a été débité");
    });
  },
  // relit les droits sur le serveur ; hors connexion, on garde la dernière lecture
  async rafraichir(){
    if(this.payant && sync.session){
      const tok = await sync.token();
      if(tok) try{
        const r = await fetch(sync.url("/rest/v1/rpc/mon_acces"), {method: "POST", headers: sync.head(tok), body: "{}"});
        if(r.ok){ const a = await r.json(); if(a){ a.decalage = Date.parse(a.maintenant) - Date.now(); this.acces = a; try{ localStorage.setItem(LSA, JSON.stringify(a)); }catch(e){} } }
      }catch(e){}
    }
    renderCompte();
  },
  connecter(){ location.href = sync.url("/auth/v1/authorize?provider=google&redirect_to=" + encodeURIComponent(location.origin + location.pathname)); },
  deconnecter(){ sync.session = null; sync.keep(); this.acces = null; try{ localStorage.removeItem(LSA); }catch(e){} renderCompte(); renderSync(); },
  async payer(n, btn){
    const tok = await sync.token();
    if(!tok){ this.deconnecter(); compteDialog("Ta session a expiré : reconnecte-toi."); return; }
    if(btn){ btn.disabled = true; btn.innerHTML = `<span class="busy"></span>`; }
    try{
      const r = await fetch(sync.url("/functions/v1/payer-abonnement"), {method: "POST", headers: sync.head(tok), body: JSON.stringify({formule: n})});
      const d = await r.json().catch(() => ({}));
      if(d.ok && d.url){ location.href = d.url; return; }
      toast(d.error || "Le paiement n’a pas pu démarrer");
    }catch(e){ toast("Paiement injoignable : vérifie ta connexion"); }
    compteDialog();
  },
  // retour de PayDunya : la confirmation arrive au serveur en quelques secondes
  async attendrePaiement(){
    const avant = this.acces && this.acces.fin;
    for(let i = 0; i < 10; i++){
      await this.rafraichir();
      if(this.acces && this.acces.fin && this.acces.fin !== avant){ toast(`Paiement reçu : formule ${this.acces.formule_payee} active jusqu’au ${dateCourte(this.acces.fin)}`); return; }
      await new Promise(r => setTimeout(r, 4000));
    }
    toast("Paiement en cours de confirmation : ton accès s’ouvrira dans quelques minutes");
  },
};
const dateCourte = d => new Date(d).toLocaleDateString(state.uiLang === "en" ? "en-GB" : "fr-FR", {day: "numeric", month: "long", year: "numeric"});
function etatCompte(){
  const a = compte.acces, now = Date.now() + ((a && a.decalage) || 0);
  if(!sync.session) return {cle: "aucun", texte: "Essai gratuit de 3 jours"};
  if(!a) return {cle: "inconnu", texte: "Vérification de ton abonnement…"};
  if(a.fin && Date.parse(a.fin) > now) return {cle: "paye", texte: `Formule ${a.formule_payee} active jusqu’au ${dateCourte(a.fin)}`};
  if(a.essai_fin && Date.parse(a.essai_fin) > now){
    const h = Math.max(1, Math.ceil((Date.parse(a.essai_fin) - now) / 3600000)), j = Math.floor(h / 24), r = h % 24;
    return {cle: "essai", texte: `Essai gratuit : il te reste ${j ? `${j} jour${j > 1 ? "s" : ""}${r ? ` et ${r} h` : ""}` : `${h} h`}`};
  }
  return {cle: "fini", texte: a.fin ? `Ton abonnement a pris fin le ${dateCourte(a.fin)}` : "Ton essai gratuit est terminé"};
}
// Une fonction réservée : vrai si la formule en vigueur la couvre, sinon on explique et on propose la suite
function exiger(fonction){
  if(!compte.payant) return true;
  const besoin = BESOIN[fonction] || 1;
  if(compte.formule() >= besoin) return true;
  const e = etatCompte();
  compteDialog(e.cle === "aucun" ? "Connecte-toi pour commencer ton essai gratuit de 3 jours." :
    e.cle === "fini" ? `${e.texte} : choisis une formule pour continuer.` :
    e.cle === "inconnu" ? "Connecte-toi à Internet une fois pour vérifier ton abonnement." :
    `Cette fonction fait partie de la formule ${besoin}.`);
  return false;
}
const G_ICON = `<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`;
function compteDialog(message){
  const dlg = $("#dlg"), e = etatCompte(), on = !!sync.session;
  const payee = compte.acces && compte.acces.fin && e.cle === "paye" ? +compte.acces.formule_payee : 0;
  dlg.innerHTML = `<div class="dhead"><h2>${on ? "Mon abonnement" : "Ton compte SCIENTUS"}</h2><button class="iconbtn" id="xClose">Fermer</button></div>
    <div class="dbody acctdlg">
      ${message && !(on && message.startsWith(e.texte)) ? `<p class="note">${esc(message)}</p>` : ""}
      ${on ? `<p class="acctstate ${e.cle}"><b>${esc(message && message.startsWith(e.texte) ? message : e.texte)}</b><span data-notr="1">${esc(sync.session.email || "")}</span></p>`
        : `<h3>3 jours gratuits, toutes les fonctions</h3><p class="legend">Sans carte bancaire. Ensuite, tu choisis ta formule mensuelle, payable par Mobile Money ou par carte.</p>
           <button class="btn gbtn" id="gLogin">${G_ICON}Continuer avec Google</button>`}
      <div class="plans">${FORMULES.map(p => `<div class="plan${p.n === 3 ? " best" : ""}">
        <div class="ph"><b>Formule ${p.n}</b>${p.n === 3 ? `<span class="tag brass">la plus complète</span>` : ""}${payee === p.n ? `<span class="tag ok">ta formule</span>` : ""}</div>
        <div class="pt">${esc(p.titre)}</div>
        <div class="pp"><b>${p.prix.toLocaleString("fr-FR").replace(/\s/g, NB)}${NB}F</b> par mois</div>
        <ul>${p.inclus.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
        ${on ? `<button class="btn ${p.n === 3 ? "primary" : ""} small" data-pay="${p.n}">${payee === p.n ? "Prolonger de 30 jours" : `Choisir la formule ${p.n}`}</button>` : ""}
      </div>`).join("")}</div>
      ${payee ? `<p class="note">Choisir une autre formule la fait commencer le jour du paiement, pour 30 jours : les jours restants de ta formule actuelle ne sont pas reportés. Repayer ta formule actuelle ajoute 30 jours à sa date de fin.</p>` : ""}
      <p class="legend">Paiement sécurisé par PayDunya : Orange Money, MTN, Moov, Wave ou carte bancaire. Chaque paiement ouvre 30 jours d’accès ; rien n’est prélevé automatiquement.</p>
      <p class="legend">Tes documents restent sur ton appareil. En ligne, nous gardons seulement ton compte, ton abonnement et, si tu synchronises tes appareils, ta bibliothèque.</p>
      <p class="legend">${on ? "En payant" : "En continuant"}, tu acceptes nos conditions et notre politique de confidentialité${NB}: <a href="cgu.html" target="_blank" rel="noopener">Conditions d’utilisation</a> · <a href="cgv.html" target="_blank" rel="noopener">Conditions de vente</a> · <a href="confidentialite.html" target="_blank" rel="noopener">Confidentialité</a></p>
      ${on ? `<div class="row"><button class="btn small" id="acctOut">Se déconnecter</button></div>` : ""}
    </div>`;
  dlg.querySelector("#xClose").onclick = () => dlg.close();
  const g = dlg.querySelector("#gLogin"); if(g) g.onclick = () => compte.connecter();
  dlg.querySelectorAll("[data-pay]").forEach(b => b.onclick = () => compte.payer(+b.dataset.pay, b));
  const o = dlg.querySelector("#acctOut"); if(o) o.onclick = () => { compte.deconnecter(); dlg.close(); toast("Déconnecté"); };
  if(!dlg.open) dlg.showModal();
}
function renderCompte(){
  const btn = $("#acctBtn"), line = $("#acctLine");
  if(!compte.payant){ if(btn) btn.hidden = true; if(line) line.hidden = true; return; }
  const e = etatCompte();
  if(btn){ btn.hidden = false; btn.className = "acct " + e.cle; btn.innerHTML = `<b>${sync.session ? esc(e.texte) : "Commencer l’essai gratuit"}</b><span>${sync.session ? "Voir les formules" : "3 jours, toutes les fonctions, sans carte bancaire"}</span>`; }
  if(line){ line.hidden = false; line.innerHTML = sync.session ? `<button class="link" id="acctLink">${esc(e.texte)}</button>` : `<button class="btn gbtn or" id="acctLink">Commencer l’essai gratuit de 3 jours</button>`; line.querySelector("#acctLink").onclick = () => compteDialog(); }
}

/* ================= CATALOGUE PARTAGÉ ================= */
const catKey = s => norm(s.title).slice(0, 120) + "|" + (s.year || "");
const catHash = k => { let h = 5381; for(let i = 0; i < k.length; i++) h = ((h << 5) + h + k.charCodeAt(i)) >>> 0; return "r" + h.toString(36) + k.length.toString(36); };
const CAT_FIELDS = ["type","title","year","container","volume","issue","pages","city","publisher","editors","genre","doi","isbn","url"];
const catRef = s => { const r = {authors: s.authors.map(a => ({family: a.family, given: a.given}))}; CAT_FIELDS.forEach(k => { if(s[k]) r[k] = s[k]; }); return r; };
const shareable = s => !isAuto(s) && s.title && s.year && s.authors.length && !/^Exemple/.test(s.origin || "") && !/^Exemple/.test(s.file || "") && s.origin !== "Catalogue SCIENTUS" && !(existFor(s) && existFor(s).v === "suspect");
// une entrée est masquée quand au moins deux personnes la signalent et qu’elle a autant de signalements que de confirmations
const catHidden = x => x.flags >= 2 && x.flags >= x.n;
const catalog = { owner: false, kind: null, db: null, uid: null, recent: [], status: "", busy: false,
  async init(){
    const [db, user] = await Promise.all([cap("db"), cap("user")]);
    if(db && user){ this.kind = "claude"; this.db = db; try{ this.uid = await user.id(); }catch(e){} }
    else if(state.catalogCfg && state.catalogCfg.url && state.catalogCfg.key) this.kind = "supabase";
    renderCatalog();
  },
  sb(path, opt = {}){ const c = state.catalogCfg; return fetch(c.url.replace(/\/$/, "") + "/rest/v1/" + path, {...opt, headers: {apikey: c.key, Authorization: "Bearer " + c.key, "Content-Type": "application/json", ...(opt.headers || {})}}); },
  async find(s){
    const k = catKey(s);
    try{
      if(this.kind === "claude"){ const d = await this.db.doc("catalogue/" + catHash(k)).get(); if(d.exists){ const v = d.data(); const x = {ref: v.ref, n: (v.by || []).length || 1, flags: (v.flags || []).length}; return catHidden(x) ? null : x; } return null; }
      if(this.kind === "supabase"){ const r = await this.sb(`catalogue?tkey=eq.${encodeURIComponent(k)}&select=ref,contributor`); if(!r.ok) return null; const rows = await r.json(); if(!rows.length) return null; const fl = await this.sb(`signalements?tkey=eq.${encodeURIComponent(k)}&select=contributor`); const flags = fl.ok ? (await fl.json()).length : 0; const x = {ref: rows[0].ref, n: new Set(rows.map(y => y.contributor)).size, flags}; return catHidden(x) ? null : x; }
    }catch(e){} return null;
  },
  async contribute(list){
    let ok = 0, err = "";
    for(const s of list){
      const k = catKey(s);
      try{
        if(this.kind === "claude"){
          const ref = this.db.doc("catalogue/" + catHash(k)); const cur = await ref.get(); const who = this.uid || state.anonId;
          if(cur.exists){ const v = cur.data(); const by = Array.isArray(v.by) ? v.by.slice() : []; if(!by.includes(who)){ by.push(who); await ref.set({...v, by, n: by.length, updatedAt: Date.now()}); } }
          else await ref.set({tkey: k, ref: catRef(s), by: [who], n: 1, createdAt: Date.now(), updatedAt: Date.now()});
          ok++;
        } else if(this.kind === "supabase"){
          const r = await this.sb("catalogue?on_conflict=tkey,contributor", {method: "POST", headers: {Prefer: "resolution=ignore-duplicates,return=minimal"}, body: JSON.stringify([{tkey: k, ref: catRef(s), contributor: state.anonId}])});
          if(r.ok) ok++; else { err = "Le catalogue a refusé l’envoi (vérifie l’adresse et la clé)."; break; }
        }
      }catch(e){ err = this.kind === "claude" ? "Tu n’as pas le droit d’écrire dans le catalogue de cette page. Le propriétaire doit t’inviter comme contributeur." : "Le catalogue est injoignable."; break; }
    }
    return {ok, err};
  },
  async flag(x){
    try{
      if(this.kind === "claude"){ const ref = this.db.doc("catalogue/" + x.id); const cur = await ref.get(); if(!cur.exists) return false; const v = cur.data(); const who = this.uid || state.anonId; const flags = Array.isArray(v.flags) ? v.flags.slice() : []; if(!flags.includes(who)) flags.push(who); await ref.set({...v, flags, updatedAt: Date.now()}); return true; }
      if(this.kind === "supabase"){ const r = await this.sb("signalements?on_conflict=tkey,contributor", {method: "POST", headers: {Prefer: "resolution=ignore-duplicates,return=minimal"}, body: JSON.stringify([{tkey: x.key, contributor: state.anonId}])}); return r.ok; }
    }catch(e){} return false;
  },
  async remove(x){ try{ if(this.kind === "claude"){ await this.db.doc("catalogue/" + x.id).delete(); return true; } }catch(e){} return false; },
  async loadRecent(){
    try{
      if(this.kind === "claude"){ const q = await this.db.collection("catalogue").limit(400).get(); this.recent = q.docs.map(d => ({id: d.id, v: d.data()})).filter(x => x.v && x.v.ref).map(x => ({id: x.id, key: x.v.tkey, ref: x.v.ref, n: (x.v.by || []).length || 1, flags: (x.v.flags || []).length, mine: (x.v.flags || []).includes(this.uid || state.anonId)})); }
      else if(this.kind === "supabase"){ const r = await this.sb("catalogue?select=tkey,ref,contributor&order=created_at.desc&limit=1000"); const rows = r.ok ? await r.json() : []; const fr = await this.sb("signalements?select=tkey,contributor&limit=2000"); const fl = fr.ok ? await fr.json() : []; const g = {}; rows.forEach(x => { (g[x.tkey] = g[x.tkey] || {key: x.tkey, ref: x.ref, who: new Set(), fl: new Set()}).who.add(x.contributor); }); fl.forEach(x => { if(g[x.tkey]) g[x.tkey].fl.add(x.contributor); }); this.recent = Object.values(g).map(v => ({key: v.key, ref: v.ref, n: v.who.size, flags: v.fl.size, mine: v.fl.has(state.anonId)})); }
      if(this.kind === "claude" && !this.owner){ try{ const u = await cap("user"); this.owner = u ? await u.isOwner() : false; }catch(e){ this.owner = false; } }
    }catch(e){ this.recent = []; this.status = "Le catalogue est injoignable pour l’instant."; }
  },
};
function renderCatalog(){
  const box = $("#catBox"); if(!box) return;
  const mine = state.sources.filter(shareable);
  if(!catalog.kind && (window.BIBLIOCARD_CONFIG || {}).serveur === false){
    box.innerHTML = `<p class="note">Le catalogue partagé ouvrira avec les comptes SCIENTUS. En attendant, tes références restent dans ta bibliothèque, sur ton appareil.</p>`;
    return;
  }
  if(!catalog.kind){
    box.innerHTML = `<p class="note">Sur ton propre site, le catalogue s’appuie sur une base gratuite que tu crées une fois (Supabase, offre gratuite). Le mode d’emploi est dans le fichier LISEZ-MOI. Renseigne ensuite ici son adresse et sa clé publique.</p>
      <div class="dbody" style="padding:4px 0"><label class="f full"><span>Adresse du catalogue</span><input id="catUrl" placeholder="https://xxxx.supabase.co" value="${esc(state.catalogCfg.url)}"></label><label class="f full"><span>Clé publique (anon)</span><input id="catKey" value="${esc(state.catalogCfg.key)}"></label></div>
      <button class="btn small" id="catSave">Connecter le catalogue</button>`;
    $("#catSave").onclick = () => { state.catalogCfg = {url: $("#catUrl").value.trim(), key: $("#catKey").value.trim()}; save(); catalog.init(); toast("Catalogue configuré"); };
    return;
  }
  const f = norm(ui.catFilter || "");
  const masked = catalog.recent.filter(catHidden).length;
  const list = catalog.recent.filter(x => (catalog.owner || !catHidden(x)) && (!f || norm([x.ref.title, x.ref.container, x.ref.year, ...(x.ref.authors || []).map(a => a.family)].join(" ")).includes(f))).sort((a, b) => b.n - a.n).slice(0, 30);
  box.innerHTML = `<dl class="kv"><div><dt>Références dans le catalogue</dt><dd>${catalog.recent.length || "—"}</dd></div><div><dt>Partageables dans ce projet</dt><dd>${mine.length}</dd></div></dl>
    <label class="f" style="flex-direction:row;gap:8px;align-items:center;margin:10px 0"><input type="checkbox" id="catAuto" ${state.catalogShare ? "checked" : ""}> Partager automatiquement mes références vérifiées</label>
    <div class="row"><button class="btn small primary" id="catShare" ${mine.length && !catalog.busy ? "" : "disabled"}>Partager ${mine.length} référence${mine.length > 1 ? "s" : ""} vérifiée${mine.length > 1 ? "s" : ""}</button><button class="btn small" id="catLoad">Parcourir le catalogue</button></div>
    <p class="legend" style="margin-top:8px">Seules les données bibliographiques publiques sont partagées, de façon anonyme : jamais tes documents, ton texte ni ton nom. Les références analysées automatiquement et non relues ne sont jamais partagées.</p>
    ${catalog.status ? `<p class="note">${esc(catalog.status)}</p>` : ""}
    ${catalog.recent.length ? `<input class="filter" id="catFilter" type="search" placeholder="Chercher un auteur, un titre, une revue" value="${esc(ui.catFilter || "")}" style="margin-top:10px">${list.map((x, i) => `<div class="card"><div><h5>${esc(x.ref.title)}</h5><div class="meta">${esc((x.ref.authors || []).map(a => a.family).join(", "))}, ${esc(x.ref.year || "s.d.")}${x.ref.city ? `, ${esc(x.ref.city)}` : ""}${x.ref.publisher ? `, ${esc(x.ref.publisher)}` : ""}</div><span class="tag ok">confirmée par ${x.n}</span>${x.flags ? `<span class="tag proof">signalée par ${x.flags}</span>` : ""}${catHidden(x) ? `<span class="tag proof">masquée</span>` : ""}</div><div class="cact"><button data-catadd="${i}">Ajouter</button>${x.mine ? "" : `<button data-catflag="${i}">Signaler une erreur</button>`}${catalog.owner ? `<button data-catdel="${i}">Supprimer</button>` : ""}</div></div>`).join("")}${masked ? `<p class="legend">${masked} entrée${masked > 1 ? "s" : ""} masquée${masked > 1 ? "s" : ""} après signalements.</p>` : ""}` : ""}`;
  $("#catAuto").onchange = e => { state.catalogShare = e.target.checked; save(); if(state.catalogShare) shareVerified(true); };
  $("#catShare").onclick = () => shareVerified(false);
  $("#catLoad").onclick = async () => { $("#catLoad").disabled = true; await catalog.loadRecent(); renderCatalog(); };
  const cf = $("#catFilter"); if(cf) cf.oninput = () => { ui.catFilter = cf.value; const pos = cf.selectionStart; renderCatalog(); const n = $("#catFilter"); n.focus(); n.setSelectionRange(pos, pos); };
  box.querySelectorAll("[data-catflag]").forEach(b => b.onclick = async () => { const ok = await catalog.flag(list[+b.dataset.catflag]); toast(ok ? "Merci : l’entrée est signalée. Elle sera masquée si d’autres utilisateurs confirment l’erreur." : "Le signalement n’a pas pu être envoyé"); await catalog.loadRecent(); renderCatalog(); });
  box.querySelectorAll("[data-catdel]").forEach(b => b.onclick = async () => { if(b.dataset.armed !== "1"){ b.dataset.armed = "1"; b.textContent = "Confirmer"; b.style.color = "var(--proof)"; return; } const ok = await catalog.remove(list[+b.dataset.catdel]); toast(ok ? "Entrée supprimée du catalogue" : "Suppression impossible"); await catalog.loadRecent(); renderCatalog(); });
  box.querySelectorAll("[data-catadd]").forEach(b => b.onclick = () => { const x = list[+b.dataset.catadd]; const src = Object.assign(blank(), x.ref, {authors: (x.ref.authors || []).map(a => ({...a})), origin: "Catalogue SCIENTUS"}); addSources([src]) ? toast("Référence ajoutée à ton projet") : toast("Déjà dans ton projet"); });
}
async function shareVerified(quiet){
  const list = state.sources.filter(shareable); if(!list.length || !catalog.kind) return;
  catalog.busy = true; renderCatalog();
  const r = await catalog.contribute(list); catalog.busy = false;
  if(r.err) toast(r.err); else if(!quiet || r.ok) toast(`${r.ok} référence${r.ok > 1 ? "s" : ""} partagée${r.ok > 1 ? "s" : ""} avec le catalogue. Merci !`);
  await catalog.loadRecent(); renderCatalog();
}
catalog.init();

/* ================= MODE ENCADREUR ================= */
const refKey = s => norm(s.title) + "|" + (s.year || "");
const review = { pkg: null, comments: [] };
function sendToSupervisor(){
  syncCurrent(); const p = state.projects[state.current]; const dlg = $("#dlg");
  dlg.innerHTML = `<form method="dialog" id="rvForm"><div class="dhead"><h2>Envoyer à mon encadreur</h2><button class="iconbtn" value="cancel" formnovalidate>Fermer</button></div>
    <div class="dbody"><label class="f full"><span>Ton nom</span><input name="who" value="${esc(state.studentName)}" placeholder="ex. VEHI Zoh Junior" required></label>
    <label class="f full" style="flex-direction:row;gap:8px;align-items:center"><input type="checkbox" name="text" ${p.draft && p.draft.text ? "checked" : "disabled"}> Joindre le texte rédigé dans Lian’Z${p.draft && p.draft.text ? ` (${wordsOf(p.draft.text).length} mots)` : " (aucun texte pour l’instant)"}</label>
    <p class="legend full" style="grid-column:1/-1">Tu obtiens un fichier « .bibliocard ». Envoie-le par WhatsApp ou e-mail : ton encadreur l’ouvre avec le bouton « Choisir des fichiers » de SCIENTUS, sans compte ni installation.</p></div>
    <div class="dfoot"><button class="btn" value="cancel" formnovalidate>Annuler</button><button class="btn primary" value="ok">Créer le dossier</button></div></form>`;
  dlg.onclose = () => {
    if(dlg.returnValue !== "ok") return;
    const fd = new FormData(dlg.querySelector("#rvForm")); state.studentName = String(fd.get("who") || "").trim(); save();
    const pkg = {app: "BiblioCard-relecture", version: 1, date: new Date().toISOString(), projectId: p.id, projectName: p.name, kind: p.kind, student: state.studentName,
      style: state.style, profile: curProfile(), sources: state.sources, exist: state.exist, draft: fd.get("text") ? state.draft : null, comments: state.comments || []};
    download(`relecture-${p.name.replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 40)}.bibliocard`, JSON.stringify(pkg), "application/json");
    toast("Dossier créé : envoie-le à ton encadreur");
  };
  dlg.returnValue = ""; dlg.showModal();
}
$("#dReview").onclick = sendToSupervisor;
function openReview(pkg){
  review.pkg = pkg; review.comments = [];
  try{ const prev = JSON.parse(localStorage.getItem("bibliocard.relecture." + pkg.projectId) || "null"); if(prev) review.comments = prev; }catch(e){}
  $("#revName").value = state.reviewerName || "";
  document.body.dataset.view = "review"; window.scrollTo({top: 0}); renderReview();
}
function bibOfPkg(s){ const st = STYLES[review.pkg.style] || STYLES.cames; return review.pkg.style === "cames" ? camesBib(s, review.pkg.profile) : st.bib(s); }
function cmtHtml(c){ return `<div class="cmt"><b>${esc(c.by || "Encadreur")}</b> : ${esc(c.text)}<button class="x2" data-delc="${c.id}">Retirer</button></div>`; }
function renderReview(){
  const P = review.pkg; const st = STYLES[P.style] || STYLES.cames;
  const L = withLabels(sortSources(P.sources), st.authorDate);
  $("#revTitle").textContent = `Relecture : ${P.projectName}`;
  $("#revMeta").textContent = `${KINDS[P.kind] || ""} de ${P.student || "l’étudiant"}, envoyé le ${new Date(P.date).toLocaleDateString(state.uiLang === "en" ? "en-GB" : "fr-FR", {day:"numeric", month:"long", year:"numeric"})}. Norme ${st.full}. Tes commentaires restent sur cet appareil jusqu’à ce que tu les renvoies.`;
  const c = conformity(P.sources, P.style), a = analyze(P.sources);
  const ex = Object.values(P.exist || {}); const sus = ex.filter(e => e.v === "suspect").length;
  $("#revRing").innerHTML = `${ringSvg(c.score)}<div><span class="v">${c.score}${NB}%</span><span class="l">conforme ${esc(st.name)}</span></div>`;
  $("#revFacts").innerHTML = `<div><dt>Références</dt><dd>${a.n}</dd></div><div><dt>Entièrement conformes</dt><dd>${c.complete}</dd></div><div><dt>Période couverte</dt><dd>${a.min ? `${a.min}–${a.max}` : "—"}</dd></div><div><dt>Moins de dix ans</dt><dd>${a.dated ? Math.round(100 * a.recent / a.dated) + NB + "%" : "—"}</dd></div><div><dt>Suspectes</dt><dd>${ex.length ? sus : "—"}</dd></div>`;
  $("#revBiblio").innerHTML = L.map(s => {
    const k = refKey(s); const mine = review.comments.filter(x => x.target === "ref" && x.refKey === k);
    const m = checks(s, P.style, P.sources); const e = (P.exist || {})[s.id];
    return `<li class="entry"><div><div class="ref">${bibOfPkg(s)}</div>${mine.map(cmtHtml).join("")}<div data-cf="ref|${esc(k)}"></div><button class="cbtn" data-c="ref|${esc(k)}">Commenter cette référence</button></div>
      <div class="marks">${m.map(x => `<span class="mark" style="cursor:default">${esc(x.t)}</span>`).join("")}${e && e.v === "suspect" ? `<span class="mark" style="cursor:default">Référence suspecte</span>` : ""}${!m.length && !(e && e.v === "suspect") ? `<span class="mark okm">Conforme</span>` : ""}</div></li>`;
  }).join("");
  const paras = P.draft && P.draft.text ? draftParas(P.draft.text) : [];
  $("#revTextH").hidden = !paras.length; $("#revText").hidden = !paras.length;
  $("#revText").innerHTML = (P.draft && P.draft.title ? `<h3 style="font-family:var(--serif);margin:0 0 10px">${esc(P.draft.title)}</h3>` : "") + paras.map((t, i) => {
    const mine = review.comments.filter(x => x.target === "para" && x.para === i);
    return `<div class="rpara">${esc(t)}${mine.map(cmtHtml).join("")}<div data-cf="para|${i}"></div><br><button class="cbtn" data-c="para|${i}">Commenter ce paragraphe</button></div>`;
  }).join("");
  const g = review.comments.find(x => x.target === "general"); if(document.activeElement !== $("#revGeneral")) $("#revGeneral").value = g ? g.text : "";
  const n = review.comments.filter(x => x.target !== "general").length + (g && g.text ? 1 : 0);
  $("#revCount").textContent = n ? `${n} commentaire${n > 1 ? "s" : ""} prêt${n > 1 ? "s" : ""} à renvoyer.` : "Aucun commentaire pour l’instant.";
  document.querySelectorAll("#viewReview [data-c]").forEach(b => b.onclick = () => {
    const [t, k] = b.dataset.c.split(/\|(.*)/s); const host = document.querySelector(`#viewReview [data-cf="${CSS.escape(b.dataset.c)}"]`);
    host.innerHTML = `<div class="cform"><textarea placeholder="Ton commentaire…"></textarea><button class="btn small primary">Ajouter</button></div>`; b.hidden = true;
    const ta = host.querySelector("textarea"); ta.focus();
    host.querySelector("button").onclick = () => {
      if(!ta.value.trim()){ renderReview(); return; }
      const src = t === "ref" ? L.find(s => refKey(s) === k) : null;
      review.comments.push({id: "c" + Math.random().toString(36).slice(2, 9), target: t, refKey: t === "ref" ? k : undefined, refLabel: src ? stripHtml(st.cite(src, "", "parenthese")) : undefined,
        para: t === "para" ? +k : undefined, excerpt: t === "para" ? paras[+k].slice(0, 160) : undefined, text: ta.value.trim(), by: $("#revName").value.trim(), at: Date.now()});
      keepReview(); renderReview();
    };
  });
  document.querySelectorAll("#viewReview [data-delc]").forEach(b => b.onclick = () => { review.comments = review.comments.filter(x => x.id !== b.dataset.delc); keepReview(); renderReview(); });
}
function keepReview(){ try{ localStorage.setItem("bibliocard.relecture." + review.pkg.projectId, JSON.stringify(review.comments)); }catch(e){} }
$("#revGeneral").oninput = () => { const t = $("#revGeneral").value; review.comments = review.comments.filter(x => x.target !== "general"); if(t.trim()) review.comments.push({id: "cg", target: "general", text: t.trim(), by: $("#revName").value.trim(), at: Date.now()}); keepReview(); const n = review.comments.length; $("#revCount").textContent = n ? `${n} commentaire${n > 1 ? "s" : ""} prêt${n > 1 ? "s" : ""} à renvoyer.` : ""; };
$("#revName").onchange = () => { state.reviewerName = $("#revName").value.trim(); review.comments.forEach(c => c.by = state.reviewerName); keepReview(); save(); renderReview(); };
$("#revSend").onclick = () => {
  if(!review.comments.length){ toast("Ajoute au moins un commentaire"); return; }
  const by = $("#revName").value.trim(); review.comments.forEach(c => c.by = c.by || by);
  const out = {app: "BiblioCard-commentaires", version: 1, date: new Date().toISOString(), projectId: review.pkg.projectId, projectName: review.pkg.projectName, reviewer: by, comments: review.comments};
  download(`commentaires-${review.pkg.projectName.replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 40)}.bibliocard`, JSON.stringify(out), "application/json");
  toast("Commentaires prêts : renvoie le fichier à l’étudiant");
};
$("#revQuit").onclick = () => { review.pkg = null; setView("biblio"); };
function importComments(d){
  const p = state.projects[d.projectId] || state.projects[state.current];
  if(p.id !== state.current) switchProject(p.id);
  const have = new Set((state.comments || []).map(c => c.id + (c.at || "")));
  const fresh = d.comments.filter(c => c && c.text && !have.has(c.id + (c.at || ""))).map(c => ({...c, by: c.by || d.reviewer, received: Date.now(), done: false}));
  state.comments = (state.comments || []).concat(fresh); save(); renderAll();
  post({role: "a", kind: "comments", n: fresh.length, who: d.reviewer});
}

/* ================= CONVERSATION ================= */
const AV = `<svg width="22" height="22" viewBox="0 0 26 26" aria-hidden="true"><rect x="2" y="5" width="22" height="16" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="13" cy="17" r="1.8" fill="var(--brass)"/><path d="M6 9h14M6 12h9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;
const plur = (n, a, b) => `${n} ${n > 1 ? b : a}`;
function post(m){ state.thread = (state.thread || []).concat({id: "m" + Date.now().toString(36) + Math.random().toString(36).slice(2,5), at: Date.now(), ...m}).slice(-100); save(); renderThread(true); }
let thinking = false;
function think(on){ thinking = on; renderThread(on); }
function previewIds(ids, max = 4){
  const L = labeled().filter(s => (ids || []).includes(s.id)); if(!L.length) return "";
  return `<ol class="prev">${L.slice(0, max).map(s => `<li class="ref">${bibFor(s)}</li>`).join("")}${L.length > max ? `<li class="more">et ${L.length - max} autre${L.length - max > 1 ? "s" : ""}</li>` : ""}</ol>`;
}
function chip(label, act, cls){ return `<button class="chip ${cls || ""}" data-act='${esc(JSON.stringify(act))}'>${esc(label)}</button>`; }
function appBody(m){
  const st = STYLES[state.style];
  const urgent = TASKS.filter(x => !x.info).length;
  const status = () => { const c = conformity(state.sources, state.style); return `<p>Conformité ${esc(st.name)} : <b>${c.score}${NB}%</b>. ${urgent ? `${plur(urgent, "point urgent", "points urgents")} à corriger.` : "Rien d’urgent à régler."}</p>`; };
  switch(m.kind){
    case "import":
      if(m.mode === "biblio" && m.gen){ const g = m.gen;
        return `<p>J’ai lu <b>${plur(g.citations, "citation", "citations")}</b> dans le texte de ${esc(m.file)} et généré la bibliographie de <b>${plur(g.retenues, "source utilisée", "sources utilisées")}</b>, en ${esc(st.full)}. Pour chacune, seuls l’auteur, l’année, le titre, la revue ou l’éditeur, le volume, le numéro et les pages sont repris.${m.ocr ? " Le document était scanné : relis attentivement." : ""}</p>
          ${g.aChercher ? `<p>${plur(g.aChercher, "œuvre citée manque", "œuvres citées manquent")} à la liste de ton document : je les cherche en ligne.</p>` : ""}
          ${g.nonCitees ? `<p>${plur(g.nonCitees, "référence de ta liste n’est citée", "références de ta liste ne sont citées")} nulle part dans le texte : je ne l${g.nonCitees > 1 ? "es" : "’"}ai pas reprise${g.nonCitees > 1 ? "s" : ""}.</p>` : ""}
          ${status()}${previewIds(m.ids)}<div class="chips">${chip("Voir la bibliographie", {t:"side", v:"biblio"}, "pri")}${g.nonCitees ? chip("Ajouter quand même les non citées", {t:"noncitees", v:m.file}) : ""}${chip("Télécharger en Word", {t:"dl"})}</div>`;
      }
      if(m.mode === "biblio"){ const f = ui.files.find(x => x.name === m.file), manque = f && f.body ? verify(stripMarks(f.body), labeled()).missing.length : 0;
        return `<p>J’ai trouvé <b>${plur(m.ids.length, "référence", "références")}</b> dans la bibliographie de ${esc(m.file)}, mises en forme en ${esc(st.full)}.${m.ocr ? " Le document était scanné : relis-les attentivement." : ""}</p>${status()}${previewIds(m.ids)}<div class="chips">${chip("Voir la bibliographie", {t:"side", v:"biblio"}, "pri")}${manque ? chip(manque > 1 ? `Chercher les ${manque} références manquantes` : "Chercher la référence manquante", {t:"build", v:m.file}) : ""}${m.docx ? chip("Corriger mon document Word", {t:"fix", v:m.file}) : ""}${urgent ? chip("Voir ce qu’il reste à régler", {t:"side", v:"todo"}, "warn") : ""}${chip("Télécharger en Word", {t:"dl"})}</div>`;
      }
      if(m.mode === "source") return `<p>J’ai ajouté la source tirée de ${esc(m.file)}.</p>${previewIds(m.ids)}<div class="chips">${m.ids[0] ? chip("Vérifier la fiche", {t:"edit", v:m.ids[0]}) : ""}${chip("Voir la bibliographie", {t:"side", v:"biblio"})}</div>`;
      return `<p>${esc(m.file)} ne contient pas de liste de références : j’ai repéré ${plur(m.cites || 0, "citation", "citations")} dans le texte. Je génère ta bibliographie à partir d’elles : chaque œuvre citée est cherchée en ligne, puis rédigée selon ta norme.</p><div class="chips">${chip("Construire ma bibliographie", {t:"build", v:m.file}, "pri")}${chip("Voir le contrôle", {t:"side", v:"controle"})}</div>`;
    case "propositions": {
      const n = v => m.items.filter(x => x.verdict === v).length, sures = m.items.filter(x => x.etat === "attente" && x.verdict === "sure" && x.choix.length).length;
      if(m.auto){ const prov = m.items.filter(x => x.provisoire).length, doute = m.items.filter(x => !x.provisoire && x.verdict !== "sure").length, ok = m.items.length - prov - doute;
        return `<p>${plur(m.items.length, "œuvre citée manquait", "œuvres citées manquaient")} à ta liste : chacune a maintenant son entrée dans la bibliographie. <b>${ok}</b> retrouvée${ok > 1 ? "s" : ""} en ligne, <b>${doute}</b> à confirmer (la plus probable est ajoutée, tu peux en choisir une autre), <b>${prov}</b> introuvable${prov > 1 ? "s" : ""} en ligne (ajoutée${prov > 1 ? "s" : ""} avec l’auteur et l’année, à compléter).</p>
          <div class="props">${m.items.map((x, i) => propCarte(m, x, i)).join("")}</div>
          <div class="chips">${chip("Voir la bibliographie", {t:"side", v:"biblio"}, "pri")}${chip("Télécharger en Word", {t:"dl"})}</div>`; }
      return `<p>${plur(m.items.length, "œuvre citée cherchée", "œuvres citées cherchées")}${NB}: <b>${n("sure")}</b> trouvée${n("sure") > 1 ? "s" : ""}, <b>${n("choisir")}</b> à confirmer, ${n("rien")} introuvable${n("rien") > 1 ? "s" : ""}. Vérifie chaque proposition${NB}: rien n’est ajouté sans ton accord.</p>
        <div class="props">${m.items.map((x, i) => propCarte(m, x, i)).join("")}</div>
        ${sures ? `<div class="chips">${chip(sures > 1 ? `Ajouter les ${sures} références trouvées` : "Ajouter la référence trouvée", {t:"prop-all", m:m.id}, "pri")}</div>` : `<div class="chips">${chip("Voir la bibliographie", {t:"side", v:"biblio"})}</div>`}`;
    }
    case "added": return `<p>${m.ids.length ? `J’ai ajouté ${plur(m.ids.length, "référence", "références")}${m.dup ? `, ${plur(m.dup, "doublon écarté", "doublons écartés")}` : ""}.` : "Ces références sont déjà dans ta bibliographie."}</p>${previewIds(m.ids)}<div class="chips">${chip("Voir la bibliographie", {t:"side", v:"biblio"})}</div>`;
    case "restyle": return `<p>C’est fait : toute la bibliographie est en <b>${esc((STYLES[m.style] || st).full)}</b>.</p>${previewIds(labeled().map(s => s.id), 3)}<div class="chips">${chip("Voir la bibliographie", {t:"side", v:"biblio"})}${chip("Télécharger en Word", {t:"dl"})}</div>`;
    case "exist": return `<p>Vérification d’existence terminée : <b>${m.found}</b> trouvée${m.found > 1 ? "s" : ""}, <b>${m.suspect}</b> suspecte${m.suspect > 1 ? "s" : ""}, ${m.close || 0} proche${m.close > 1 ? "s" : ""}, ${m.none} introuvable${m.none > 1 ? "s" : ""}.</p>${m.suspect ? previewIds(m.sus || []) : ""}<div class="chips">${chip("Voir le détail", {t:"side", v:"existence"}, m.suspect ? "warn" : "")}</div>`;
    case "fixed": return `<p>Voici <b>${esc(m.file.replace(/\.docx$/i, ""))}-corrige.docx</b> : ta bibliographie y est remplacée par ${plur(m.n, "référence", "références")} en ${esc((STYLES[m.style] || st).full)}. Le reste du document n’a pas été modifié, y compris les citations dans le texte.</p><div class="chips">${chip("Voir ce qu’il reste à régler", {t:"side", v:"todo"})}</div>`;
    case "comments": return `<p>${esc(m.who || "Ton encadreur")} t’a envoyé ${plur(m.n, "commentaire", "commentaires")}.</p><div class="chips">${chip("Les voir", {t:"side", v:"todo"}, "pri")}</div>`;
    case "todo": return TASKS.length ? `<p>Il reste ${plur(TASKS.length, "point", "points")}, dont ${urgent} à corriger :</p><ul style="margin:4px 0 0;padding-left:20px">${TASKS.slice(0, 5).map(x => `<li>${esc(x.title)}</li>`).join("")}</ul><div class="chips">${chip("Tout voir", {t:"side", v:"todo"}, "pri")}</div>` : `<p>Rien à régler : ta bibliographie est en ordre pour la norme ${esc(st.name)}.</p>`;
    case "help": return `<p>Je peux :</p><ul style="margin:0;padding-left:20px"><li>lire ton mémoire ou ta thèse (Word, PDF, même scanné) et en tirer la bibliographie ;</li><li>mettre en forme en CAMES, APA, ISO 690, Chicago, MLA, Vancouver ou en notes ;</li><li>vérifier que tes références existent et que ton texte cite bien ta bibliographie ;</li><li>corriger directement ton fichier Word.</li></ul><p style="margin-top:8px">Essaie : « passe en APA », « vérifie les références », « corrige mon document », « qu’est-ce qui reste ? ».</p>`;
    case "info": return `<p>${esc(m.text)}</p>`;
    case "error": return `<p>${esc(m.text)}</p>`;
  }
  return "";
}
function renderThread(scroll){
  const box = $("#thread"); if(!box) return;
  const T = state.thread || []; document.body.classList.toggle("talk", T.length > 0 || thinking);
  box.innerHTML = T.map(m => m.role === "u"
    ? `<div class="msg u"><div class="bubble">${m.kind === "file" ? `<div class="fchip"><span class="ic">${esc(m.ext || "DOC")}</span><div><span data-notr="1">${esc(m.name)}</span>${(() => { const f = ui.files.find(x => x.id === m.fid); return f && f.busy ? `<small>${esc(f.status)}</small>` : ""; })()}</div></div>` : `<span data-notr="1">${esc(m.text)}</span>`}</div></div>`
    : `<div class="msg a"><div class="av">${AV}</div><div class="atext${m.kind === "error" ? " err" : ""}">${appBody(m)}</div></div>`).join("") +
    (thinking ? `<div class="msg a"><div class="av">${AV}</div><div class="atext typing" aria-label="Analyse en cours"><span></span><span></span><span></span></div></div>` : "");
  box.querySelectorAll("[data-act]").forEach(b => b.onclick = () => runAct(JSON.parse(b.dataset.act)));
  if(scroll) setTimeout(() => window.scrollTo({top: document.body.scrollHeight, behavior: "smooth"}), 30);
}
async function runAct(a){
  if(a.t === "side") openSide(a.v);
  else if(a.t === "dl") downloadWord();
  else if(a.t === "edit"){ const s = state.sources.find(x => x.id === a.v); if(s) openForm(s); }
  else if(a.t === "fix") await doFix(a.v);
  else if(a.t === "build") await construireBiblio(a.v);
  else if(a.t === "noncitees"){ const f = ui.files.find(x => x.name === a.v); const L = (f && f.nonCitees) || []; const before = new Set(state.sources.map(s => s.id)); const k = addSources(L.map(s => ({...s}))); if(f) f.nonCitees = []; post({role: "a", kind: "added", ids: state.sources.filter(s => !before.has(s.id)).map(s => s.id), dup: L.length - k}); }
  else if(String(a.t).startsWith("prop-")) await actionProposition(a);
}
async function doFix(name){
  const f = ui.files.find(x => x.name === name && x.buf) || ui.files.filter(x => x.buf).slice(-1)[0];
  post({role: "u", kind: "cmd", text: `Corriger mon document ${f ? f.name : ""}`.trim()});
  if(!f){ post({role: "a", kind: "error", text: "Je n’ai pas le fichier Word d’origine en mémoire : redépose-le avec le bouton +, puis demande-moi de le corriger."}); return; }
  try{ think(true); const n = await fixDocx(f); think(false); post({role: "a", kind: "fixed", file: f.name, n, style: state.style}); }
  catch(e){ think(false); post({role: "a", kind: "error", text: `Je n’ai pas pu corriger ce document : ${e.message}.`}); }
}
/* commandes en langage courant, tapées ou dictées dans la barre */
function intent(t){
  const x = norm(t); if(x.length > 90 || /\b(1[5-9]\d{2}|20\d{2})\b/.test(t) || /10\.\d{4,9}\//.test(t)) return null;
  const map = [["vancouver","vancouver"],["note de bas","notes"],["notes","notes"],["apa","apa"],["mla","mla"],["chicago","chicago"],["iso","iso"],["norcames","cames"],["cames","cames"]];
  if(/\b(norme|style|format|mets|met|passe|convertis|convertir|change|en)\b/.test(x)) for(const [k, v] of map) if(new RegExp("\\b" + k + "\\b").test(x)) return {t: "style", v};
  if(/(construi|genere|fabrique|cree|fais|faire|etabli|dresse|complete).*(biblio|references)/.test(x)) return {t: "build"};
  if(/\bplan\b|\blectures?\b|quoi lire/.test(x)) return {t: "plan"};
  if(/(corrig|remplac|repare).*(document|memoire|these|fichier|word)/.test(x)) return {t: "fix"};
  if(/(verifi|existe|inventee|fausses?|suspect)/.test(x)) return {t: "exist"};
  if(/(telecharg|exporte|export)/.test(x)) return {t: "dl"};
  if(/(reste|manque|a faire|probleme|regler)/.test(x)) return {t: "todo"};
  if(/^(aide|help|bonjour|bonsoir|salut|que (sais|peux)|comment ca marche)/.test(x)) return {t: "help"};
  return null;
}
async function runIntent(it, raw){
  post({role: "u", kind: "cmd", text: raw});
  if(it.t === "style"){ state.style = it.v; save(); renderAll(); post({role: "a", kind: "restyle", style: it.v}); }
  else if(it.t === "fix") await doFix(null);
  else if(it.t === "build") await construireBiblio(null, true);
  else if(it.t === "plan"){ post({role: "a", kind: "info", text: "J’ouvre « Plan et lectures » : choisis un modèle, mets tes intitulés, puis demande des lectures pour chaque partie."}); setView("plan"); }
  else if(it.t === "exist"){ if(!state.sources.length){ post({role: "a", kind: "info", text: "Ta bibliographie est vide : dépose d’abord un document avec le bouton +."}); return; } Object.keys(state.exist).forEach(k => delete state.exist[k]); net.blocked = false; await runExistence(true); }
  else if(it.t === "dl"){ if(state.sources.length){ downloadWord(); post({role: "a", kind: "info", text: `Je télécharge ta bibliographie en Word, norme ${STYLES[state.style].full}.`}); } else post({role: "a", kind: "info", text: "Il n’y a encore rien à télécharger : dépose d’abord un document."}); }
  else post({role: "a", kind: it.t});
}

/* ================= COLLECTE DE VOIX POUR LES LANGUES IVOIRIENNES ================= */
const VLANGS = ["Baoulé","Dioula","Bété","Sénoufo","Agni","Attié","Yacouba (Dan)","Abbey","Gouro","Wè (Guéré)","Koulango","Lobi","Abidji","Adioukrou","Ébrié","Nzima","Godié","Dida","Autre langue"];
const voix = { lang: VLANGS[0], sentences: [], i: 0, rec: null, chunks: [], last: null, consent: false, age: "", genre: "", speaker: "" };
async function renderVoix(){
  const box = $("#voixBox"); if(!box) return;
  const all = await IDB.all("voix"); const mine = all.filter(x => x.lang === voix.lang);
  if(!voix.speaker) voix.speaker = "loc-" + (state.anonId || "x").slice(-6);
  const cur = voix.sentences[voix.i];
  box.innerHTML = `<p>Whisper reconnaît mal le baoulé, le dioula ou le bété : il manque des enregistrements. Lis des phrases à voix haute dans ta langue : elles restent sur ton appareil, puis tu exportes un corpus prêt à servir à l’entraînement d’un modèle de dictée, au format des grands corpus de parole libres.</p>
    <div class="dbody" style="padding:4px 0">
      <label class="f"><span>Langue</span><select id="vLang">${VLANGS.map(l => `<option ${l === voix.lang ? "selected" : ""}>${l}</option>`).join("")}</select></label>
      <label class="f"><span>Tranche d’âge (facultatif)</span><select id="vAge">${["","18-29","30-44","45-59","60 et plus"].map(a => `<option ${a === voix.age ? "selected" : ""} value="${a}">${a || "Non précisé"}</option>`).join("")}</select></label>
      <label class="f full"><span>Phrases à lire, une par ligne</span><textarea id="vSent" rows="4" placeholder="Écris ou colle des phrases dans la langue choisie, de préférence relues par un locuteur.">${esc(voix.sentences.join("\n"))}</textarea></label>
    </div>
    <label class="f" style="flex-direction:row;gap:8px;align-items:flex-start;margin:6px 0 10px"><input type="checkbox" id="vOk" ${voix.consent ? "checked" : ""}> <span>J’accepte que ma voix, enregistrée anonymement, serve à créer un corpus ouvert pour la reconnaissance de la parole dans cette langue. Je peux supprimer mes enregistrements avant l’export.</span></label>
    ${cur ? `<div class="sheet" style="padding:16px 18px;margin:8px 0"><p class="legend" style="margin:0 0 6px">Phrase ${voix.i + 1} sur ${voix.sentences.length}</p><p style="font-family:var(--serif);font-size:19px;margin:0" data-notr="1">${esc(cur)}</p></div>
    <div class="row"><button class="btn small primary" id="vRec" ${voix.consent ? "" : "disabled"}>${voix.rec ? "Arrêter" : "Enregistrer"}</button><button class="btn small" id="vPlay" ${voix.last ? "" : "disabled"}>Réécouter</button><button class="btn small" id="vKeep" ${voix.last ? "" : "disabled"}>Valider et suivante</button><button class="btn small" id="vSkip">Passer</button></div>` : `<p class="legend">Ajoute des phrases ci-dessus pour commencer.</p>`}
    <div class="blk"><dl class="kv"><div><dt>Enregistrements en ${esc(voix.lang)}</dt><dd>${mine.length}</dd></div><div><dt>Durée totale</dt><dd>${Math.round(mine.reduce((a, x) => a + (x.duree || 0), 0) / 60)} min</dd></div></dl>
    <div class="row" style="margin-top:10px"><button class="btn small" id="vExport" ${all.length ? "" : "disabled"}>Exporter le corpus (.zip)</button><button class="btn small" id="vClear" ${mine.length ? "" : "disabled"}>Supprimer mes enregistrements en ${esc(voix.lang)}</button></div></div>`;
  $("#vLang").onchange = e => { voix.lang = e.target.value; renderVoix(); };
  $("#vAge").onchange = e => { voix.age = e.target.value; };
  $("#vSent").onchange = e => { voix.sentences = e.target.value.split(/\n+/).map(x => x.trim()).filter(Boolean); voix.i = 0; voix.last = null; renderVoix(); };
  $("#vOk").onchange = e => { voix.consent = e.target.checked; renderVoix(); };
  const b = id => document.getElementById(id);
  if(b("vRec")) b("vRec").onclick = async () => {
    if(voix.rec){ voix.rec.stop(); return; }
    try{ const st = await navigator.mediaDevices.getUserMedia({audio: true}); voix.chunks = []; const r = new MediaRecorder(st); const t0 = Date.now();
      r.ondataavailable = e => voix.chunks.push(e.data);
      r.onstop = () => { st.getTracks().forEach(t => t.stop()); voix.last = {blob: new Blob(voix.chunks, {type: r.mimeType || "audio/webm"}), duree: (Date.now() - t0) / 1000}; voix.rec = null; renderVoix(); };
      r.start(); voix.rec = r; renderVoix();
    }catch(e){ toast("Accès au micro refusé. Autorise le micro pour cette page."); }
  };
  if(b("vPlay")) b("vPlay").onclick = () => { if(voix.last){ const a = new Audio(URL.createObjectURL(voix.last.blob)); a.play().catch(() => {}); } };
  if(b("vKeep")) b("vKeep").onclick = async () => { if(!voix.last) return; await IDB.putIn("voix", {id: "v" + Date.now().toString(36) + Math.random().toString(36).slice(2,5), lang: voix.lang, sentence: voix.sentences[voix.i], blob: voix.last.blob, duree: voix.last.duree, age: voix.age, speaker: voix.speaker, at: Date.now()}); voix.last = null; voix.i = Math.min(voix.i + 1, voix.sentences.length); renderVoix(); };
  if(b("vSkip")) b("vSkip").onclick = () => { voix.last = null; voix.i = Math.min(voix.i + 1, voix.sentences.length); renderVoix(); };
  b("vClear").onclick = async () => { for(const x of mine) await IDB.del("voix", x.id); toast("Enregistrements supprimés"); renderVoix(); };
  b("vExport").onclick = exportVoix;
}
async function exportVoix(){
  const JSZip = window.JSZip || await waitFor("JSZip"); if(!JSZip){ toast("Le module d’archive n’a pas pu se charger"); return; }
  const all = await IDB.all("voix"); if(!all.length) return;
  const z = new JSZip(); const rows = [["path","sentence","language","client_id","age","duration","date"]];
  for(const x of all){ const ext = /ogg/.test(x.blob.type) ? "ogg" : /mp4|aac/.test(x.blob.type) ? "m4a" : "webm"; const path = `clips/${x.id}.${ext}`; z.file(path, x.blob); rows.push([path, x.sentence.replace(/\t|\n/g, " "), x.lang, x.speaker, x.age || "", x.duree.toFixed(1), new Date(x.at).toISOString().slice(0, 10)]); }
  z.file("validated.tsv", rows.map(r => r.join("\t")).join("\n"));
  z.file("LISEZ-MOI.txt", `Corpus de parole collecté avec SCIENTUS (Lian’Z).\nChaque enregistrement a été fait avec le consentement explicite du locuteur, de façon anonyme (identifiant ${"client_id"}).\nFormat inspiré de Mozilla Common Voice : validated.tsv (chemin, phrase, langue, locuteur, âge, durée, date) et dossier clips/.\nLangues : ${[...new Set(all.map(x => x.lang))].join(", ")}. Enregistrements : ${all.length}.\n`);
  const blob = new Blob([await z.generateAsync({type: "uint8array"})], {type: "application/zip"});
  download(`corpus-voix-${new Date().toISOString().slice(0, 10)}.zip`, blob, "application/zip");
}
$("#voixPanel").addEventListener("toggle", () => { if($("#voixPanel").open) renderVoix(); });

/* ================= CORRIGER LE DOCUMENT WORD LUI-MÊME ================= */
const WNS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const BIB_HEAD = /^\s*(?:[IVX\d]+[.)-]?\s*)?(r[ée]f[ée]rences bibliographiques|r[ée]f[ée]rences|bibliograp{1,2}h{1,2}ie(?:\s+(?:g[ée]n[ée]rale|s[ée]lective|indicative))?|sources et bibliographie|ouvrages cit[ée]s|works cited|references|bibliograp{1,2}h{1,2}y|webographie)\s*:?\s*$/i;
const END_HEAD = /^\s*(?:[IVX\d]+[.)-]?\s*)?(annexes?|table des mati[èe]res|index|glossaire|appendix|appendices|liste des (?:tableaux|figures|sigles))\b.{0,40}$/i;
async function fixDocx(f){
  const JSZip = window.JSZip || await waitFor("JSZip");
  if(!JSZip || !f.buf) throw new Error(f.buf ? "le module Word n’a pas pu se charger" : "redépose le fichier Word pour le corriger");
  const zip = await JSZip.loadAsync(f.buf);
  const xml = await zip.file("word/document.xml").async("string");
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const body = doc.getElementsByTagNameNS(WNS, "body")[0];
  const kids = [...body.childNodes].filter(n => n.nodeType === 1);
  const textOf = n => [...n.getElementsByTagNameNS(WNS, "t")].map(t => t.textContent).join("");
  let head = -1; kids.forEach((n, i) => { if(n.localName === "p" && BIB_HEAD.test(textOf(n))) head = i; });
  if(head < 0) throw new Error("aucun titre « Bibliographie » ou « Références » trouvé dans le document");
  let end = kids.length; for(let i = head + 1; i < kids.length; i++){ const n = kids[i]; if(n.localName === "sectPr" || (n.localName === "p" && END_HEAD.test(textOf(n)))){ end = i; break; } }
  for(let i = head + 1; i < end; i++) if(kids[i].localName === "p" || kids[i].localName === "tbl") body.removeChild(kids[i]);
  // la bibliographie de CE document, dans la norme choisie
  const L = labeled().filter(s => s.file === f.name);
  const html = L.map(s => `<p style="text-indent:-1.25cm">${bibFor(s)}</p>`).join("");
  const frag = new DOMParser().parseFromString(`<w:root xmlns:w="${WNS}">${htmlToBlocks(html).map(paraXml).join("")}</w:root>`, "application/xml");
  const anchor = kids[end] && kids[end].parentNode === body ? kids[end] : body.getElementsByTagNameNS(WNS, "sectPr")[0] || null;
  [...frag.documentElement.childNodes].forEach(n => body.insertBefore(doc.importNode(n, true), anchor));
  zip.file("word/document.xml", new XMLSerializer().serializeToString(doc));
  const blob = new Blob([await zip.generateAsync({type: "uint8array", compression: "DEFLATE"})], {type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
  download(f.name.replace(/\.docx$/i, "") + "-corrige.docx", blob, blob.type);
  return L.length;
}

/* ================= LIAN’Z ================= */
const LANGS = [["fr-FR","french","Français"],["en-US","english","Anglais"],["es-ES","spanish","Espagnol"],["pt-PT","portuguese","Portugais"],["ar-SA","arabic","Arabe"],["sw-KE","swahili","Swahili"],["ha","hausa","Haoussa (Whisper)"],["yo","yoruba","Yoruba (Whisper)"],["ln","lingala","Lingala (Whisper)"],["de-DE","german","Allemand"]];
const LSD = "bibliocard.redaction";
const red = { listening:false, engine:"live", lang:"fr-FR", rec:null, lastIns:null, asr:null, stream:null, sim:null };
function setView(v){
  document.body.dataset.view = v; if(v !== "biblio" && window.innerWidth < 1100) closeSide();
  document.querySelectorAll("#modeSeg button").forEach(b => b.setAttribute("aria-pressed", b.dataset.view === v ? "true" : "false"));
  try{ localStorage.setItem("bibliocard.view", v); }catch(e){}
  if(v === "redac") updateCount();
  if(v === "plan") renderPlan();
  marquerNav();
}
document.querySelectorAll("#modeSeg button").forEach(b => b.onclick = () => setView(b.dataset.view));
$("#langSel").innerHTML = LANGS.map(([c,, n]) => `<option value="${c}">${n}</option>`).join("");
$("#engSel").onchange = e => { red.engine = e.target.value; stopDictation(); micUi(); };
$("#langSel").onchange = e => { red.lang = e.target.value; if(red.listening){ stopDictation(); startDictation(); } };
function micUi(msg){
  const on = red.listening; $("#micBtn").classList.toggle("on", on); $("#micBtn").setAttribute("aria-label", on ? "Arrêter la dictée" : "Commencer la dictée");
  $("#micTitle").textContent = on ? "À l’écoute… touche pour arrêter" : "Touche le micro pour dicter";
  $("#micSub").textContent = msg || (red.engine === "live" ? "Transcription en direct. Le son passe par le service de reconnaissance du navigateur." : "Whisper tourne sur ton appareil : précis sur les accents, rien n’est envoyé. Premier usage : téléchargement du modèle.");
}
/* insertion fidèle à l’endroit du curseur */
function insertSpoken(raw){
  const ta = $("#draft"); let txt = raw;
  const del = /\b(efface ça|efface ca|supprime ça|annule ça)\b/i.test(raw);
  if(del){ undoLast(); return; }
  const cm = raw.match(/\bcitation\s+([\p{L}'’-]+)(?:\s+(\d{4}))?/iu);
  if(cm){ const s = findRef(cm[1], cm[2]); txt = raw.replace(cm[0], s ? stripHtml(STYLES[state.style].cite(s, "", "parenthese")) : cm[0]); if(!s) toast(`Aucune référence de ${cm[1]} dans ta bibliographie`); }
  let ins = applyVoice(txt); if(!ins) return;
  const pos = ta.selectionStart ?? ta.value.length, before = ta.value.slice(0, pos), after = ta.value.slice(pos);
  const prev = before.replace(/[ \t]+$/, "");
  if(/^[\p{L}\d«(]/u.test(ins) && prev && !/[\s(«\n]$/.test(before)) ins = " " + ins;
  if(prev && !/[.!?…]\s*$|\n\s*$/.test(prev) && /^\s?\p{Lu}/u.test(ins) && !/^\s?\p{Lu}{2}/u.test(ins)) ins = ins.replace(/^(\s?)(\p{Lu})/u, (m, a, b) => a + b.toLocaleLowerCase("fr"));
  ta.value = before + ins + after; const np = pos + ins.length; ta.setSelectionRange(np, np);
  red.lastIns = {pos, len: ins.length}; saveDraft(); updateCount();
}
function undoLast(){ const ta = $("#draft"); if(!red.lastIns) return; const {pos, len} = red.lastIns; ta.value = ta.value.slice(0, pos) + ta.value.slice(pos + len); ta.setSelectionRange(pos, pos); red.lastIns = null; saveDraft(); updateCount(); toast("Dernière dictée supprimée"); }
function findRef(name, year){ const n = norm(name); const L = labeled(); return L.find(s => s.authors.some(a => norm(a.family) === n) && (!year || s.year === year)) || L.find(s => s.authors.some(a => norm(a.family).startsWith(n))); }

/* moteur 1 : reconnaissance du navigateur, en direct */
function startLive(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){ micUi("Ce navigateur ne propose pas la dictée en direct. Utilise Chrome, Edge ou Safari, ou choisis Whisper."); return false; }
  const rec = new SR(); rec.lang = red.lang; rec.continuous = true; rec.interimResults = true;
  rec.onresult = e => { let interim = ""; for(let i = e.resultIndex; i < e.results.length; i++){ const r = e.results[i]; if(r.isFinal) insertSpoken(r[0].transcript); else interim += r[0].transcript; } $("#interim").textContent = interim; };
  rec.onerror = e => { if(e.error === "not-allowed" || e.error === "service-not-allowed"){ red.listening = false; micUi("Accès au micro refusé. Autorise le micro pour cette page, ou ouvre la version installée sur ton site."); } else if(e.error === "network"){ red.listening = false; micUi("La dictée en direct a besoin d’Internet. Hors connexion, choisis Whisper."); } };
  rec.onend = () => { if(red.listening) try{ rec.start(); }catch(_){} else $("#interim").textContent = ""; };
  try{ rec.start(); }catch(e){ return false; }
  red.rec = rec; return true;
}
/* moteur 2 : Whisper sur l’appareil (libre, gratuit, multilingue) */
async function loadWhisper(){
  if(red.asr) return red.asr;
  micUi("Chargement de Whisper (environ 80 Mo, une seule fois)…");
  const T = await withTimeout(import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2"), 30000);
  T.env.allowLocalModels = false;
  red.asr = await withTimeout(T.pipeline("automatic-speech-recognition", "Xenova/whisper-base", {progress_callback: p => { if(p.status === "progress" && p.total) micUi(`Téléchargement de Whisper : ${Math.round(100 * p.loaded / p.total)} %`); }}), 600000);
  return red.asr;
}
async function startWhisper(){
  try{ await loadWhisper(); }catch(e){ micUi("Whisper ne peut pas se charger ici. Il fonctionne sur la version installée sur ton site."); return false; }
  try{ red.stream = await navigator.mediaDevices.getUserMedia({audio:true}); }catch(e){ micUi("Accès au micro refusé. Autorise le micro pour cette page."); return false; }
  const ctx = new (window.AudioContext || window.webkitAudioContext)(); const srcN = ctx.createMediaStreamSource(red.stream); const an = ctx.createAnalyser(); an.fftSize = 2048; srcN.connect(an);
  const buf = new Float32Array(an.fftSize); let rec = null, chunks = [], speaking = false, lastVoice = 0, segStart = 0;
  const queue = []; let busy = false;
  const transcribe = async () => {
    if(busy || !queue.length) return; busy = true;
    while(queue.length){
      const blob = queue.shift(); $("#interim").textContent = "Transcription…";
      try{
        const ac = new (window.AudioContext || window.webkitAudioContext)({sampleRate:16000});
        const audio = await ac.decodeAudioData(await blob.arrayBuffer()); const data = audio.getChannelData(0); ac.close();
        const wl = (LANGS.find(l => l[0] === red.lang) || LANGS[0])[1];
        const out = await red.asr(data, {language: wl, task: "transcribe", chunk_length_s: 30});
        const txt = (out && out.text || "").trim(); if(txt && !/^\[.*\]$/.test(txt)) insertSpoken(txt);
      }catch(e){ toast("Un passage n’a pas pu être transcrit"); }
    }
    $("#interim").textContent = ""; busy = false;
  };
  const newRec = () => { chunks = []; rec = new MediaRecorder(red.stream); rec.ondataavailable = e => chunks.push(e.data); rec.onstop = () => { const b = new Blob(chunks, {type: rec.mimeType}); if(b.size > 2000) { queue.push(b); transcribe(); } }; rec.start(); segStart = Date.now(); };
  newRec();
  red.vad = setInterval(() => {
    an.getFloatTimeDomainData(buf); let sum = 0; for(const v of buf) sum += v * v; const rms = Math.sqrt(sum / buf.length);
    const now = Date.now(); if(rms > 0.015){ speaking = true; lastVoice = now; }
    if(speaking && (now - lastVoice > 1100 || now - segStart > 25000)){ speaking = false; rec.stop(); newRec(); }
    else if(!speaking && now - segStart > 8000){ rec.onstop = null; rec.stop(); newRec(); } // silence : on jette
  }, 120);
  red.stopWhisper = () => { clearInterval(red.vad); try{ rec.stop(); }catch(_){} red.stream.getTracks().forEach(t => t.stop()); ctx.close(); };
  return true;
}
async function startDictation(){ red.listening = true; micUi(); const ok = red.engine === "live" ? startLive() : await startWhisper(); if(!ok){ red.listening = false; $("#micBtn").classList.remove("on"); $("#micTitle").textContent = "Touche le micro pour dicter"; } else micUi(); }
function stopDictation(){ red.listening = false; if(red.rec){ try{ red.rec.stop(); }catch(_){} red.rec = null; } if(red.stopWhisper){ red.stopWhisper(); red.stopWhisper = null; } $("#interim").textContent = ""; micUi(); }
$("#micBtn").onclick = () => red.listening ? stopDictation() : exiger("dictee") && startDictation();
$("#undoSeg").onclick = undoLast;

/* brouillon : enregistré avec le projet */
function saveDraft(){ state.draft = {title: $("#draftTitle").value, text: $("#draft").value, updatedAt: Date.now()}; save(); }
function refreshDraftUi(){ $("#draftTitle").value = (state.draft && state.draft.title) || ""; $("#draft").value = (state.draft && state.draft.text) || ""; updateCount(); }
function updateCount(){ const n = wordsOf($("#draft").value).length; $("#wcount").textContent = `${n} mot${n > 1 ? "s" : ""}`; }
let draftTimer;
$("#draft").addEventListener("input", () => { clearTimeout(draftTimer); draftTimer = setTimeout(saveDraft, 500); updateCount(); });
$("#draftTitle").addEventListener("input", () => { clearTimeout(draftTimer); draftTimer = setTimeout(saveDraft, 500); });

/* insérer une citation depuis la bibliographie */
$("#citeIns").onclick = () => {
  const L = labeled(); const dlg = $("#dlg");
  dlg.innerHTML = `<div class="dhead"><h2>Insérer une citation</h2><button class="iconbtn" id="xClose">Fermer</button></div>
    <div style="padding:12px 20px 0"><label class="f"><span>Page (facultatif)</span><input id="pickPg" placeholder="ex. 147"></label></div>
    <div class="pick">${L.length ? L.map(s => `<button data-id="${s.id}">${STYLES[state.style].cite(s, "", "parenthese")} <span class="legend">${esc(s.title.slice(0, 70))}</span></button>`).join("") : `<p class="legend">Ta bibliographie est vide : dépose d’abord tes documents dans l’onglet Bibliographie.</p>`}</div>`;
  dlg.querySelector("#xClose").onclick = () => dlg.close();
  dlg.querySelectorAll("[data-id]").forEach(b => b.onclick = () => { const s = L.find(x => x.id === b.dataset.id); const c = stripHtml(STYLES[state.style].cite(s, dlg.querySelector("#pickPg").value.trim(), "parenthese")).replace(/\u00A0/g, NB); dlg.close(); const ta = $("#draft"); ta.focus(); insertRaw(c); });
  dlg.showModal();
};
function insertRaw(c){ const ta = $("#draft"); const pos = ta.selectionStart ?? ta.value.length; const before = ta.value.slice(0, pos); const add = (before && !/\s$/.test(before) ? " " : "") + c; ta.value = before + add + ta.value.slice(pos); ta.setSelectionRange(pos + add.length, pos + add.length); saveDraft(); updateCount(); }

/* exports : le texte et, à la suite, la bibliographie de ce qu’il cite */
function citedRefs(text){ const r = verifyAny(text, labeled()); const ids = new Set(r.ok.map(x => x.s.id).concat(r.yearOff.map(x => x.s.id))); return labeled().filter(s => ids.has(s.id)); }
function draftParas(text){ return text.split(/\n{2,}|\n/).map(x => x.trim()).filter(Boolean); }
$("#wDoc").onclick = () => {
  const text = $("#draft").value; if(!text.trim()){ toast("Le texte est vide"); return; }
  const refs = citedRefs(text), title = $("#draftTitle").value.trim() || "Sans titre";
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${esc(title)}</title></head><body style="font-family:'Times New Roman',serif;font-size:12pt;line-height:1.5">
    <p style="font-size:16pt;font-weight:bold;margin-bottom:14pt">${esc(title)}</p>${draftParas(text).map(p => `<p style="text-align:justify;margin:0 0 8pt">${esc(p)}</p>`).join("")}
    ${refs.length ? `<p style="font-size:13pt;font-weight:bold;margin:18pt 0 8pt">Références bibliographiques</p>${refs.map(s => `<p style="margin:0 0 6pt 1.25cm;text-indent:-1.25cm">${bibFor(s)}</p>`).join("")}` : ""}</body></html>`;
  saveWord(title.replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 50) || "redaction", html);
  if(refs.length) toast(`Exporté avec ${refs.length} référence${refs.length > 1 ? "s" : ""} citée${refs.length > 1 ? "s" : ""}`);
};
$("#wPdf").onclick = () => {
  const text = $("#draft").value; if(!text.trim()){ toast("Le texte est vide"); return; }
  const refs = citedRefs(text);
  $("#printArea").innerHTML = `<h1>${esc($("#draftTitle").value.trim() || "Sans titre")}</h1>${draftParas(text).map(p => `<p>${esc(p)}</p>`).join("")}${refs.length ? `<h1 style="font-size:13pt;margin-top:18pt">Références bibliographiques</h1>${refs.map(s => `<p class="r">${bibFor(s)}</p>`).join("")}` : ""}`;
  try{ window.print(); }catch(e){ toast("L’impression est bloquée ici : utilise la version installée sur ton site, ou l’export Word"); }
};

/* documents de comparaison : gardés uniquement sur cet appareil */
const IDB = { db: null,
  open(){ return this.db ? Promise.resolve(this.db) : new Promise((res, rej) => { try{ const r = indexedDB.open("bibliocard", 2); r.onupgradeneeded = () => { const db = r.result; if(!db.objectStoreNames.contains("corpus")) db.createObjectStore("corpus", {keyPath: "name"}); if(!db.objectStoreNames.contains("voix")) db.createObjectStore("voix", {keyPath: "id"}); }; r.onsuccess = () => { this.db = r.result; res(this.db); }; r.onerror = () => rej(r.error); }catch(e){ rej(e); } }); },
  async put(doc){ try{ const db = await this.open(); db.transaction("corpus", "readwrite").objectStore("corpus").put(doc); }catch(e){} },
  async all(store = "corpus"){ try{ const db = await this.open(); return await new Promise(res => { const q = db.transaction(store).objectStore(store).getAll(); q.onsuccess = () => res(q.result || []); q.onerror = () => res([]); }); }catch(e){ return []; } },
  async putIn(store, doc){ try{ const db = await this.open(); await new Promise((res, rej) => { const t = db.transaction(store, "readwrite"); t.objectStore(store).put(doc); t.oncomplete = res; t.onerror = () => rej(t.error); }); return true; }catch(e){ return false; } },
  async del(store, key){ try{ const db = await this.open(); db.transaction(store, "readwrite").objectStore(store).delete(key); }catch(e){} },
};
$("#corpusBtn").onclick = () => exiger("plagiat") && $("#corpusIn").click();
$("#corpusIn").onchange = async e => {
  const files = [...e.target.files]; e.target.value = ""; let n = 0;
  for(const file of files){ try{ toast(`Lecture de ${file.name}…`); const t = stripMarks(await extract(file, {status:""})); if(t.trim()){ await IDB.put({name: file.name, text: t.slice(0, 3000000), at: Date.now()}); n++; } }catch(err){ toast(`${file.name} : ${err.message}`); } }
  if(n) toast(`${n} document${n > 1 ? "s" : ""} ajouté${n > 1 ? "s" : ""} pour la comparaison`);
};

/* contrôle des similitudes : répétitions internes, tes sources, puis Wikipédia et les résumés d’articles */
async function wikiProbe(probe, lang){
  const r = await getJSON(`https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent('"' + probe + '"')}&srlimit=2&format=json&origin=*`);
  if(r.error) return {error:true};
  return {titles: (((r.data || {}).query || {}).search || []).map(x => x.title)};
}
async function wikiText(title, lang){
  const r = await getJSON(`https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&titles=${encodeURIComponent(title)}&format=json&origin=*`);
  const pages = ((r.data || {}).query || {}).pages || {}; const pg = Object.values(pages)[0]; return pg && pg.extract || "";
}
async function runSimilarity(){
  const text = $("#draft").value; const box = $("#simRes"); $("#simPanel").hidden = false;
  if(wordsOf(text).length < 30){ box.innerHTML = `<p class="legend">Il faut au moins une trentaine de mots pour un contrôle utile.</p>`; return; }
  box.innerHTML = `<p class="legend"><span class="busy"></span> Comparaison avec tes documents…</p>`;
  const results = [];
  const corpus = await IDB.all(); ui.files.forEach(f => { if(f.text && !corpus.some(c => c.name === f.name)) corpus.push({name: f.name, text: stripMarks(f.text)}); });
  corpus.forEach(c => { const r = compareTexts(text, c.text, c.name); if(r.covered) results.push({...r, kind: "Tes documents"}); });
  let online = true, oaLimite = false; const seen = new Set();
  const probes = pickProbes(text, 10);
  for(let i = 0; i < probes.length && online; i++){
    box.innerHTML = `<p class="legend"><span class="busy"></span> Recherche en ligne : ${i + 1} sur ${probes.length}…</p>`;
    for(const lang of ["fr", "en"]){
      const w = await wikiProbe(probes[i], lang); if(w.error){ online = false; break; }
      for(const t of w.titles){ const key = lang + ":" + t; if(seen.has(key)) continue; seen.add(key); const body = await wikiText(t, lang); const r = compareTexts(text, body, `Wikipédia (${lang}) : ${t}`); if(r.covered) results.push({...r, kind: "Wikipédia", url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(t)}`}); }
    }
    if(!online) break;
    // recherche dans les résumés : payante pour OpenAlex, sautée quand le budget du jour est épuisé
    const oa = oaLimite ? {} : await oaJSON(`https://api.openalex.org/works?search=${encodeURIComponent(probes[i])}&per-page=3&select=id,display_name,abstract_inverted_index,doi`, true);
    if(oa.error){ online = false; break; }
    if(oa.bloque) oaLimite = true;
    ((oa.data || {}).results || []).forEach(wk => { if(seen.has(wk.id)) return; seen.add(wk.id); const ab = abstractFromIndex(wk.abstract_inverted_index); if(!ab) return; const r = compareTexts(text, ab, `Résumé d’article : ${wk.display_name}`); if(r.covered) results.push({...r, kind: "Articles scientifiques", url: wk.doi || wk.id}); });
  }
  const reps = internalRepeats(text), freq = frequentWords(text);
  // part totale du texte retrouvée ailleurs (sans double compte)
  const W = wordsOf(text); const all = new Array(W.length).fill(false); results.forEach(r => r.flags.forEach((f, i) => { if(f) all[i] = true; }));
  const pct = W.length ? all.filter(Boolean).length / W.length : 0;
  const unflagged = []; results.flatMap(r => r.passages.filter(p => !p.inQuotes && !p.cited).map(p => ({...p, src: r.label}))).sort((a, b) => b.words - a.words)
    .forEach(p => { const dup = unflagged.find(q => p.start < q.end && q.start < p.end); if(dup){ if(!dup.src.includes(p.src)) dup.src += ", " + p.src; } else unflagged.push(p); });
  red.sim = {pct, unflagged: unflagged.length, reps: reps.length, online, at: Date.now()};
  results.sort((a, b) => b.covered - a.covered);
  box.innerHTML = `<div class="simscore"><span class="big">${Math.round(100 * pct)}${NB}%</span><span class="legend" style="margin:0">du texte se retrouve dans d’autres documents.<br>${unflagged.length ? `<b style="color:var(--proof)">${unflagged.length} passage${unflagged.length > 1 ? "s" : ""} repris sans guillemets ni citation.</b>` : results.length ? "Tous les passages repris sont entre guillemets ou cités." : "Aucun passage repris n’a été trouvé."}</span></div>
    ${online ? "" : `<p class="note">Comparaison en ligne indisponible sur cette page : seuls tes documents ont été comparés. Sur la version installée sur ton site, Lian’Z compare aussi avec Wikipédia et les résumés d’articles scientifiques.</p>`}
    ${unflagged.length ? `<div class="blk"><h3>À corriger : passages repris sans guillemets ni citation</h3>${unflagged.slice(0, 20).map(p => `<div class="pass">${esc(p.text.length > 320 ? p.text.slice(0, 320) + "…" : p.text)}<small>${p.words} mots identiques à ${esc(p.src)}. Mets-les entre guillemets avec la référence, ou reformule et cite la source.</small></div>`).join("")}</div>` : ""}
    ${results.length ? `<div class="blk"><h3>Sources retrouvées</h3><div class="bars">${results.slice(0, 10).map(r => `<div class="b"><span title="${esc(r.label)}">${esc(r.label.length > 26 ? r.label.slice(0, 26) + "…" : r.label)}</span><span class="t"><i style="width:${Math.max(3, Math.round(100 * r.pct))}%"></i></span><span class="n">${Math.round(100 * r.pct)}</span></div>`).join("")}</div>
      ${results.filter(r => r.url).slice(0, 6).map(r => `<p class="legend" style="margin:4px 0"><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.label)}</a></p>`).join("")}</div>` : ""}
    ${reps.length ? `<div class="blk"><h3>Répétitions dans ton propre texte</h3>${reps.slice(0, 8).map(p => `<div class="pass rep">${esc(p.text.length > 240 ? p.text.slice(0, 240) + "…" : p.text)}<small>Passage de ${p.words} mots écrit deux fois.</small></div>`).join("")}</div>` : ""}
    ${freq.length ? `<div class="blk"><h3>Mots très répétés</h3><p class="legend">${freq.map(f => `« ${esc(f.word)} » ${f.n} fois (paragraphe ${f.para})`).join(", ")}.</p></div>` : ""}
    <p class="legend" style="margin-top:12px">Lian’Z compare ton texte à tes documents, à Wikipédia et aux résumés d’articles d’OpenAlex. Il ne remplace pas un logiciel institutionnel qui dispose des thèses déjà déposées : c’est un contrôle préalable, avant de rendre.</p>`;
  if(oaLimite) box.insertAdjacentHTML("beforeend", `<p class="note">Les résumés d’articles d’OpenAlex n’ont pas été comparés : la limite gratuite du jour est atteinte pour ta connexion Internet. Relance le contrôle demain pour les inclure.</p>`);
  renderTasks();
}
$("#simBtn").onclick = () => exiger("plagiat") && runSimilarity();

/* ================= INTERFACE BILINGUE ================= */
const I18N = window.I18N_EN || {exact: {}, re: [], frag: []};
const SKIP_DEEP = ".ref, .c, .card h5, .pitem h5, .nm, #revText h3, [data-notr], #printArea, textarea, script, style";
const SKIP_DIRECT = ".pass, .rpara, .cmt";
const normKey = t => t.replace(/[\u00A0\u202F]/g, " ").replace(/\s+/g, " ").trim();
function tr(text){ return state.uiLang === "en" ? trEn(text) : text; }
// traduction anglaise, quelle que soit la langue affichée (pour reconnaître un texte déjà traduit au retour en français)
function trEn(text){
  if(!text) return text;
  const k = normKey(text); if(!k || !/\p{L}/u.test(k)) return text;
  const lead = text.match(/^\s*/)[0], tail = text.match(/\s*$/)[0];
  if(I18N.exact[k] !== undefined) return lead + I18N.exact[k] + tail;
  for(const [re, rpl] of I18N.re){ if(re.test(k)) return lead + k.replace(re, rpl) + tail; }
  return text;
}
const ORIG = new WeakMap();
function trNode(n){
  if(n.nodeType === 3){
    const pe = n.parentElement; if(!pe || pe.closest(SKIP_DEEP) || pe.matches(SKIP_DIRECT)) return;
    let src = ORIG.get(n); if(src === undefined || (n.nodeValue !== src && n.nodeValue !== trEn(src))){ src = n.nodeValue; ORIG.set(n, src); }
    let out = state.uiLang === "en" ? tr(src) : src;
    if(state.uiLang === "en" && pe.closest(".meta")) I18N.frag.forEach(([a, b]) => out = out.split(a).join(b));
    if(n.nodeValue !== out) n.nodeValue = out;
  } else if(n.nodeType === 1){
    if(n.matches && n.matches("script, style, #printArea")) return;
    ["placeholder", "aria-label", "title"].forEach(at => { if(!n.hasAttribute || !n.hasAttribute(at)) return; const key = "data-fr-" + at; if(!n.hasAttribute(key)) n.setAttribute(key, n.getAttribute(at)); const v = state.uiLang === "en" ? tr(n.getAttribute(key)) : n.getAttribute(key); if(n.getAttribute(at) !== v) n.setAttribute(at, v); });
    if(n.matches && n.matches("textarea")) return;
    n.childNodes.forEach(trNode);
  }
}
function applyLang(){
  document.documentElement.lang = state.uiLang === "en" ? "en" : "fr";
  document.title = state.uiLang === "en" ? "SCIENTUS — your bibliography, from your documents" : "SCIENTUS";
  document.querySelectorAll("#uiLangSeg button").forEach(b => b.setAttribute("aria-pressed", b.dataset.l === state.uiLang ? "true" : "false"));
  trNode(document.body);
}
new MutationObserver(ms => { ms.forEach(m => {
    if(m.type === "characterData") trNode(m.target);
    else if(m.type === "childList") m.addedNodes.forEach(trNode);
    else if(m.type === "attributes"){ const n = m.target, at = m.attributeName, key = "data-fr-" + at, cur = n.getAttribute(at), orig = n.getAttribute(key);
      if(cur === null || (orig !== null && (cur === orig || cur === trEn(orig)))) return;
      n.setAttribute(key, cur); const v = tr(cur); if(v !== cur) n.setAttribute(at, v); }
  }); })
  .observe(document.body, {subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["placeholder","aria-label","title"]});
document.querySelectorAll("#uiLangSeg button").forEach(b => b.onclick = () => { state.uiLang = b.dataset.l; save(); applyLang(); renderAll(); });
try{ const langs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""]); if(!localStorage.getItem(LS) && /^en/i.test(langs[0] || "") && !langs.some(l => /^fr/i.test(l))) state.uiLang = "en"; }catch(e){}

/* ---------- démarrage ---------- */
document.body.classList.toggle("in-claude", !!(window.claude && window.claude.use)); // textes propres à la démonstration dans Claude
loadLocal(); compte.init(); refreshDraftUi(); renderAll(); applyLang(); setTimeout(() => sync.pull(), 400); setView((() => { try{ return localStorage.getItem("bibliocard.view") || "biblio"; }catch(e){ return "biblio"; } })()); micUi(); updateCount();
setStatus(state.sources.length ? "Enregistré sur cet appareil" : "Prêt");
