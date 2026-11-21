/* SCIENTUS — interface du module MA RÉDACTION (en haut de la page Rédaction).
   Les calculs sont dans js/ma-redaction.js (fonctions pures, testées) ; les textes dans textes/messages_fr.json
   (aucun texte codé en dur ici). Les données vivent dans le projet ouvert (state.maRedac) : elles sont donc
   enregistrées, rangées et sauvegardées en ligne avec lui. SCIENTUS n’écrit jamais le document : il organise,
   relance et mesure. */
(function(){
"use strict";
const MR = window.MaRedaction;
let T = null; // textes, chargés au démarrage
const ui = {onglet: "jour", formulaire: false, question: 0};

// ---------- outils ----------
const aujourdhui = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const nb = n => Math.round(+n || 0).toLocaleString("fr-FR");
const remplir = (t, v) => String(t || "").replace(/\{(\w+)\}/g, (m, k) => v[k] !== undefined ? v[k] : m);
const dateLongue = iso => iso ? new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", {day: "numeric", month: "long", year: "numeric"}) : "";
const id = () => "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const D = () => state.maRedac;
function donnees(){
  if(!state.maRedac) state.maRedac = {objectif: null, sous: [], journal: [], compteur: null, plans: [], sessions: [], interventions: [], refus: [], bilans: [], contexte: {}, soutien: false, session: null, reduction: {}};
  return state.maRedac;
}
const enregistrer = () => { save(); rendre(); };

// ---------- comptage automatique : les mots écrits aujourd’hui dans la Rédaction ----------
function compterRedaction(){
  const d = D(); if(!d || !d.objectif) return;
  const jour = aujourdhui(), total = MR.compterMots($("#draft").value);
  if(!d.compteur || d.compteur.date !== jour) d.compteur = {date: jour, base: total};
  if(total < d.compteur.base) d.compteur.base = total; // texte effacé : on ne compte pas de mots négatifs
  let e = d.journal.find(x => x.date === jour && x.source === "redaction");
  const mots = total - d.compteur.base;
  if(!e && mots > 0){ e = {id: id(), date: jour, mots_ecrits: 0, source: "redaction"}; d.journal.push(e); }
  if(e) e.mots_ecrits = Math.max(e.mots_ecrits, mots);
}
const motsDuJour = (d, jour) => d.journal.filter(x => x.date === jour && x.source !== "elan").reduce((s, x) => s + (+x.mots_ecrits || 0), 0);
const elanDuJour = (d, jour) => (d.journal.find(x => x.date === jour && x.source === "elan") || {}).elan || null;
const planActif = (d, jour) => d.plans.find(p => p.active && p.date_debut <= jour && jour <= p.date_fin) || null;

// ---------- intervention du jour : une seule recommandation, jamais répétée dans la journée ----------
function interventionDuJour(d, jour, ind){
  const esc = MR.escalade(ind, d.interventions, jour, d.soutien);
  if(esc){ d.interventions.push({id: id(), date: jour, niveau: esc.niveau, declencheurs: esc.declencheurs, reponse: "ignoree"}); save(); }
  return d.interventions.filter(x => x.date === jour && x.reponse === "ignoree").pop() || null;
}

// ---------- rendu ----------
function rendre(){
  const box = $("#maRedac"); if(!box || !MR) return;
  if(!T){ box.innerHTML = ""; return; }
  const d = donnees(), U = T.ui;
  if(ui.formulaire || !d.objectif){ box.innerHTML = d.objectif || ui.formulaire ? formulaire(d) : `<div class="mr-vide"><h2>${esc(U.titre_module)}</h2><p>${esc(U.sans_objectif)}</p><button class="btn primary" type="button" data-mr="definir">${esc(U.definir)}</button></div>`; lier(box); return; }
  compterRedaction();
  const onglets = Object.entries(U.onglets).map(([k, v]) => `<button type="button" role="tab" aria-selected="${ui.onglet === k}" data-mr-onglet="${k}">${esc(v)}</button>`).join("");
  const vue = {jour: vueJour, ensemble: vueEnsemble, calendrier: vueCalendrier, plans: vuePlans, blocage: vueBlocage}[ui.onglet] || vueJour;
  box.innerHTML = `<div class="mr-tete"><h2>${esc(U.titre_module)} <small data-notr="1">${esc(d.objectif.titre)}</small></h2><button class="link" type="button" data-mr="modifier">${esc(U.modifier)}</button></div>
    <div class="mr-onglets" role="tablist">${onglets}</div><div class="mr-corps">${vue(d)}</div><p class="mr-note">${esc(T.rappel_production)}</p>`;
  lier(box);
}

function vueJour(d){
  const U = T.ui.jour, jour = aujourdhui(), o = d.objectif, elan = elanDuJour(d, jour);
  if(d.soutien) return `<div class="mr-soutien"><p>${esc(T.interventions["5"])}</p><p>${esc(T.soutien.message)}</p><p>${esc(T.soutien.conseil)}</p><p class="legend">${esc(T.soutien.ressources)}</p><button class="btn small" type="button" data-mr="reprendre">${esc(U.reprendre)}</button></div>`;
  const c = MR.cibleDuJour(o, d.journal.filter(x => x.date < jour), jour, elan || 3);
  const plan = planActif(d, jour);
  let cible = c.cible; if(cible && (d.reduction[jour] || (plan && plan.strategie === "semaine_relance"))) cible = MR.cibleReduite(cible);
  const ecrits = motsDuJour(d, jour), auto = (d.journal.find(x => x.date === jour && x.source === "redaction") || {}).mots_ecrits || 0;
  const pct = cible ? Math.min(100, Math.round(100 * ecrits / cible)) : 0;
  const ind = MR.indicateurs(o, d.journal, jour, d.sessions), iv = interventionDuJour(d, jour, ind);
  const premiere = T.premieres_actions[(MR.versJour(jour)) % T.premieres_actions.length];
  const serie = MR.serie(o, d.journal, jour);
  let html = "";
  if(c.termine) html += `<p class="mr-ok">${esc(T.accueil.termine)}</p>`;
  else if(c.jour_ouvre) html += `<div class="mr-cible"><span class="mr-n">${nb(cible)}</span><span>${esc(T.ui.jour.cible_libelle)}</span></div>
      <div class="mr-barre" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
      <p class="legend">${nb(ecrits)} ${esc(U.ecrits)}${auto ? ` (${nb(auto)} ${esc(U.depuis_redaction)})` : ""} · ${esc(remplir(T.accueil.mots_restants, {restants: nb(c.mots_restants), jours: c.jours_restants}))}</p>`;
  else html += `<p>${esc(T.accueil.jour_de_repos)}</p>`;
  if(c.irrealisable && c.fin_proposee) html += `<p class="note">${esc(remplir(T.avertissements[c.jour_ouvre && c.plafonnee ? "plafond" : "irrealisable"], {plafond: nb(c.plafond), date: dateLongue(c.fin_proposee)}))} <button class="link" type="button" data-mr="adopter" data-date="${c.fin_proposee}">${esc(U.adopter_date)}</button></p>`;
  if(iv) html += carteIntervention(iv, cible, premiere);
  // élan, saisie manuelle, session
  html += `<div class="mr-ligne"><span>${esc(T.accueil.elan_question)}</span><span class="mr-elan" role="group">${[1, 2, 3, 4, 5].map(n => `<button type="button" aria-pressed="${elan === n}" data-mr-elan="${n}">${n}</button>`).join("")}</span></div>`;
  if(elan) html += `<p class="legend">${esc(T.energie[MR.tacheSelonElan(elan)])}</p>`;
  html += `<form class="mr-ligne" data-mr-form="mots"><label>${esc(U.ajouter)} <input type="number" min="1" max="20000" name="mots" inputmode="numeric" required> ${esc(U.mots)}</label><button class="btn small" type="submit">${esc(U.ajouter_bouton)}</button></form>`;
  html += `<p class="legend"><b>${esc(U.premiere_action)}</b> : ${esc(premiere)}</p>`;
  if(plan) html += `<p class="legend"><b>${esc(U.plan_actif)}</b> : ${esc(T.plans[plan.strategie].nom)}</p>`;
  html += d.session ? bilan(d) : `<button class="btn small primary" type="button" data-mr="commencer">${esc(U.commencer)}</button>`;
  if(serie.jours) html += `<p class="legend">${esc(remplir(T.serie.jours, {jours: serie.jours}))}${serie.en_suspens ? ` ${esc(T.serie.en_suspens)}` : ""}</p>`;
  const q = T.prompts_inspiration[ui.question % T.prompts_inspiration.length];
  html += `<div class="mr-question"><b>${esc(U.inspiration)}</b><p>${esc(q)}</p><button class="link" type="button" data-mr="question">${esc(U.autre_question)}</button></div>`;
  html += `<p><button class="link mr-discret" type="button" data-mr="difficulte">${esc(U.difficulte)}</button></p>`;
  return html;
}
function carteIntervention(iv, cible, premiere){
  const U = T.ui.jour, n = String(iv.niveau);
  const texte = remplir(T.interventions[n], {premiere_action: premiere, cible: nb(MR.cibleReduite(cible))});
  return `<div class="mr-iv mr-iv${n}" role="status"><p>${esc(texte)}</p><div class="row"><button class="btn small primary" type="button" data-mr-iv="acceptee" data-id="${iv.id}">${esc(U.accepter)}</button><button class="btn small" type="button" data-mr-iv="refusee" data-id="${iv.id}">${esc(U.refuser)}</button></div></div>`;
}
function bilan(d){
  const U = T.ui.bilan, B = T.bilan_session, ecrits = Math.max(0, motsDuJour(d, aujourdhui()) - (d.session.mots_depart || 0));
  return `<form class="mr-bilan" data-mr-form="bilan"><h3>${esc(U.titre)}</h3>
    <label>${esc(B.question_mots)} <input type="number" min="0" name="mots" value="${ecrits}" inputmode="numeric"></label>
    <label>${esc(B.question_elan_apres)} <select name="elan">${[1, 2, 3, 4, 5].map(n => `<option${n === 3 ? " selected" : ""}>${n}</option>`).join("")}</select></label>
    <label>${esc(B.question_reussite)} <input name="note" maxlength="200"></label>
    <button class="btn small primary" type="submit">${esc(U.enregistrer)}</button></form>`;
}

function vueEnsemble(d){
  const U = T.ui.ensemble, o = MR.normaliser(d.objectif), jour = aujourdhui(), b = MR.cibleBase(o);
  const ecrits = MR.motsEcritsJusqua(d.journal, jour), pct = b.mots_total ? Math.min(100, Math.round(100 * ecrits / b.mots_total)) : 0;
  const fin = MR.finProjetee(o, d.journal, jour), ec = MR.ecartSousObjectifs(o, d.sous);
  return `<div class="mr-barre grande"><i style="width:${pct}%"></i></div>
    <p><b>${pct} %</b> · ${nb(ecrits / o.mots_par_page)} ${esc(U.pages_ecrites)} · ${nb(Math.max(0, b.mots_total - ecrits) / o.mots_par_page)} ${esc(U.pages_restantes)}</p>
    <dl class="mr-dl"><div><dt>${esc(U.cible_semaine)}</dt><dd>${nb(b.cible_semaine)} ${esc(T.ui.jour.mots)}</dd></div>
      <div><dt>${esc(U.fin_prevue)}</dt><dd>${esc(dateLongue(o.date_fin))}</dd></div>
      <div><dt>${esc(U.fin_projetee)}</dt><dd>${fin.date ? esc(dateLongue(fin.date)) : esc(U.rythme_inconnu)}</dd></div>
      <div><dt>${esc(U.statut)}</dt><dd><select data-mr-statut>${Object.entries(U.statuts).map(([k, v]) => `<option value="${k}"${(d.objectif.statut || "actif") === k ? " selected" : ""}>${esc(v)}</option>`).join("")}</select></dd></div></dl>
    ${d.sous.some(x => x.pages_cibles) && ec.ecart ? `<p class="note">${esc(remplir(T.avertissements.sous_objectifs, ec))}</p>` : ""}
    ${d.sous.length ? `<ol class="mr-sous">${d.sous.map(s => `<li>${esc(s.titre)}${s.pages_cibles ? ` · ${s.pages_cibles} p.` : ""}</li>`).join("")}</ol>` : ""}`;
}

function vueCalendrier(d){
  const U = T.ui.calendrier, o = MR.normaliser(d.objectif), jour = aujourdhui();
  const prevu = new Map(MR.planInitial(o).map(x => [x.date, x.cible]));
  const mois = jour.slice(0, 7), j0 = MR.versJour(mois + "-01"), dernier = MR.versJour(MR.ajouterMois(mois + "-01", 1)) - 1;
  const vide = (j0 + 3) % 7; let cases = Array.from({length: vide}, () => `<span class="mr-c"></span>`).join("");
  for(let j = j0; j <= dernier; j++){
    const iso = MR.versIso(j), ouvre = prevu.has(iso), ecrit = motsDuJour(d, iso);
    const etat = !ouvre ? "repos" : iso > jour ? "a_venir" : ecrit >= prevu.get(iso) && ecrit > 0 ? "atteint" : ecrit > 0 ? "partiel" : iso === jour ? "a_venir" : "manque";
    cases += `<span class="mr-c ${etat}" title="${esc(dateLongue(iso))} : ${esc(U[etat])}${ecrit ? `, ${nb(ecrit)} ${esc(T.ui.jour.mots)}` : ""}">${+iso.slice(8)}</span>`;
  }
  return `<p class="mr-mois">${esc(new Date(mois + "-15").toLocaleDateString("fr-FR", {month: "long", year: "numeric"}))}</p>
    <div class="mr-cal">${T.ui.jours_semaine.map(x => `<span class="mr-c tete">${esc(x)}</span>`).join("")}${cases}</div>
    <p class="mr-legende">${["atteint", "partiel", "manque", "a_venir", "repos"].map(k => `<span><i class="mr-c ${k}"></i>${esc(U[k])}</span>`).join("")}</p>`;
}

function vuePlans(d){
  const U = T.ui.plans, jour = aujourdhui(), ind = MR.indicateurs(d.objectif, d.journal, jour, d.sessions);
  const propose = MR.proposerPlan(ind, d.contexte, d.refus, jour), actif = planActif(d, jour);
  const ctx = ["perfectionnisme", "blocage_introduction", "journee_chargee"].map(k => `<label class="mr-ctx"><input type="checkbox" data-mr-ctx="${k}"${d.contexte[k] ? " checked" : ""}> ${esc(U[k])}</label>`).join("");
  return `<fieldset class="mr-contexte"><legend>${esc(U.contexte)}</legend>${ctx}</fieldset>
    ${actif ? `<p class="note">${esc(T.plans[actif.strategie].nom)} · ${esc(U.actif)} ${esc(dateLongue(actif.date_fin))} <button class="link" type="button" data-mr="arreter">${esc(U.arreter)}</button></p>` : ""}
    <div class="mr-plans">${MR.STRATEGIES.map(s => { const p = T.plans[s];
      return `<article class="mr-plan${s === propose ? " propose" : ""}">${s === propose ? `<span class="tag ok">${esc(U.propose)}</span>` : ""}<h3>${esc(p.nom)}</h3>
        <p>${p.description.split("\n").map(esc).join("<br>")}</p><p class="legend">${esc(U.effort)} : ${esc(p.effort)}</p>
        <div class="row"><button class="btn small${s === propose ? " primary" : ""}" type="button" data-mr-plan="${s}">${esc(U.choisir)}</button>${s === propose ? `<button class="btn small" type="button" data-mr-refus="${s}">${esc(U.refuser)}</button>` : ""}</div></article>`; }).join("")}</div>`;
}

function vueBlocage(d){
  const U = T.ui.blocage, jour = aujourdhui(), ind = MR.indicateurs(d.objectif, d.journal, jour, d.sessions);
  const ligne = (t, v, alerte) => `<div class="${alerte ? "alerte" : ""}"><dt>${esc(t)}</dt><dd>${v}</dd></div>`;
  const iv = d.interventions.filter(x => x.date === jour).pop();
  return `<h3>${esc(U.titre)}</h3><dl class="mr-dl">
    ${ligne(U.jours_sans, ind.jours_sans_ecriture, ind.alertes.includes("jours_sans_ecriture"))}
    ${ligne(U.retard, ind.retard_jours.toFixed(1).replace(".", ","), ind.alertes.includes("retard"))}
    ${ligne(U.elan, ind.elan_moyen === null ? "—" : ind.elan_moyen.toFixed(1).replace(".", ","), ind.alertes.includes("elan_bas"))}
    ${ligne(U.plan, ind.sessions_non_demarrees, ind.alertes.includes("plan_non_suivi"))}</dl>
    ${ind.alertes.length && iv ? `<p><b>${esc(U.recommandation)}</b> : ${esc(remplir(T.interventions[String(iv.niveau)], {premiere_action: T.premieres_actions[0], cible: "…"}))}</p>` : `<p class="mr-ok">${esc(U.rien)}</p>`}`;
}

// ---------- formulaire d’objectif : gabarits, aperçu immédiat, validation ----------
function formulaire(d){
  const U = T.ui.form, o = d.objectif || {titre: (state.projects[state.current] || {}).name || "", type_document: "memoire_master", ...MR.depuisGabarit("memoire_master"), date_debut: aujourdhui()};
  const sous = d.objectif ? d.sous : MR.depuisGabarit(o.type_document).sous_objectifs;
  const jours = T.ui.jours_semaine.map((x, b) => `<label class="mr-j"><input type="checkbox" name="j${b}"${((o.jours_travail ?? MR.LUN_VEN) >> b) & 1 ? " checked" : ""}>${esc(x)}</label>`).join("");
  return `<form class="mr-form" data-mr-form="objectif" novalidate><h2>${esc(T.ui.titre_module)}</h2>
    <label class="f">${esc(U.titre)}<input name="titre" value="${esc(o.titre || "")}" required></label>
    <label class="f">${esc(U.type)}<select name="type_document">${Object.entries(MR.GABARITS).map(([k, g]) => `<option value="${k}"${o.type_document === k ? " selected" : ""}>${esc(g.nom)}</option>`).join("")}</select></label>
    <div class="mr-2"><label class="f">${esc(U.pages)}<input name="pages_cibles" type="number" min="1" max="1000" value="${o.pages_cibles || ""}"></label>
      <label class="f">${esc(U.mots_par_page)}<input name="mots_par_page" type="number" min="150" max="400" value="${o.mots_par_page || 250}"></label></div>
    <div class="mr-2"><label class="f">${esc(U.debut)}<input name="date_debut" type="date" value="${o.date_debut || aujourdhui()}"></label>
      <label class="f">${esc(U.fin)}<input name="date_fin" type="date" value="${d.objectif && !d.objectif.duree_mois ? (o.date_fin || "") : ""}"></label>
      <label class="f">${esc(U.duree)}<input name="duree_mois" type="number" min="1" max="60" step="0.5" value="${o.duree_mois || ""}"></label></div>
    <fieldset class="f"><legend>${esc(U.jours)}</legend><div class="mr-jours">${jours}</div></fieldset>
    <label class="f">${esc(U.exclus)}<input name="jours_exclus" value="${esc((o.jours_exclus || []).join(", "))}" placeholder="2027-08-07, 2027-12-25"></label>
    <label class="f">${esc(U.plafond)}<input name="plafond_jour" type="number" min="1" value="${o.plafond_jour || ""}"></label>
    <fieldset class="f"><legend>${esc(U.sous)}</legend><div class="mr-sous-f">${sous.map(s => `<div class="mr-2"><input name="sous_titre" value="${esc(s.titre)}" aria-label="${esc(U.sous_titre)}"><input name="sous_pages" type="number" min="0" value="${s.pages_cibles || ""}" aria-label="${esc(U.sous_pages)}" placeholder="${esc(U.sous_pages)}"></div>`).join("")}</div>
      <button class="link" type="button" data-mr="ajouter-sous">${esc(U.ajouter_sous)}</button></fieldset>
    <p class="mr-apercu" aria-live="polite"></p><p class="note mr-erreurs" hidden></p>
    <div class="row"><button class="btn primary" type="submit">${esc(U.enregistrer)}</button>${d.objectif ? `<button class="btn" type="button" data-mr="annuler">${esc(U.annuler)}</button>` : ""}</div></form>`;
}
function lireFormulaire(f){
  const v = n => f.querySelector(`[name=${n}]`).value.trim();
  let masque = 0; for(let b = 0; b < 7; b++) if(f.querySelector(`[name=j${b}]`).checked) masque |= 1 << b;
  const duree = v("duree_mois"), o = {titre: v("titre"), type_document: v("type_document"), pages_cibles: +v("pages_cibles"), mots_par_page: +v("mots_par_page"),
    date_debut: v("date_debut"), date_fin: duree ? null : (v("date_fin") || null), duree_mois: duree ? +duree : null, jours_travail: masque,
    jours_exclus: v("jours_exclus").split(/[\s,;]+/).filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x)), plafond_jour: v("plafond_jour") ? +v("plafond_jour") : null, statut: "actif"};
  const titres = [...f.querySelectorAll("[name=sous_titre]")], pages = [...f.querySelectorAll("[name=sous_pages]")];
  const sous = titres.map((t, i) => ({id: id(), titre: t.value.trim(), pages_cibles: pages[i].value ? +pages[i].value : null, ordre: i + 1})).filter(s => s.titre);
  return {o, sous};
}
function apercuFormulaire(f){
  const {o, sous} = lireFormulaire(f), r = MR.valider(o, aujourdhui()), err = f.querySelector(".mr-erreurs"), ap = f.querySelector(".mr-apercu");
  if(r.ok){ const a = MR.apercu(r.objectif); ap.textContent = remplir(T.apercu, {pages: a.pages, mots_total: nb(a.mots_total), par_jour: nb(a.par_jour), par_semaine: nb(a.par_semaine), par_mois: nb(a.par_mois_environ)});
    const ec = MR.ecartSousObjectifs(o, sous); err.hidden = !(sous.some(s => s.pages_cibles) && ec.ecart); err.textContent = err.hidden ? "" : remplir(T.avertissements.sous_objectifs, ec); }
  else { ap.textContent = ""; const msg = r.erreurs.map(e => T.avertissements[e]).filter(Boolean); err.hidden = !msg.length; err.textContent = msg.join(" "); }
  return r;
}

// ---------- actions ----------
function lier(box){
  box.querySelectorAll("[data-mr-onglet]").forEach(b => b.onclick = () => { ui.onglet = b.dataset.mrOnglet; rendre(); });
  box.querySelectorAll("[data-mr]").forEach(b => b.onclick = () => action(b.dataset.mr, b));
  box.querySelectorAll("[data-mr-elan]").forEach(b => b.onclick = () => { const d = donnees(), jour = aujourdhui(); let e = d.journal.find(x => x.date === jour && x.source === "elan"); if(!e){ e = {id: id(), date: jour, mots_ecrits: 0, source: "elan"}; d.journal.push(e); } e.elan = +b.dataset.mrElan; if(d.session && !d.session.elan_avant) d.session.elan_avant = e.elan; enregistrer(); });
  box.querySelectorAll("[data-mr-iv]").forEach(b => b.onclick = () => repondre(b.dataset.id, b.dataset.mrIv));
  box.querySelectorAll("[data-mr-plan]").forEach(b => b.onclick = () => choisirPlan(b.dataset.mrPlan));
  box.querySelectorAll("[data-mr-refus]").forEach(b => b.onclick = () => { donnees().refus.push({date: aujourdhui(), strategie: b.dataset.mrRefus}); enregistrer(); });
  box.querySelectorAll("[data-mr-ctx]").forEach(c => c.onchange = () => { donnees().contexte[c.dataset.mrCtx] = c.checked; enregistrer(); });
  const st = box.querySelector("[data-mr-statut]"); if(st) st.onchange = () => { donnees().objectif.statut = st.value; enregistrer(); };
  box.querySelectorAll("form[data-mr-form]").forEach(f => {
    if(f.dataset.mrForm === "objectif"){ f.oninput = () => apercuFormulaire(f); f.querySelector("[name=type_document]").onchange = () => { const g = MR.depuisGabarit(f.querySelector("[name=type_document]").value);
        if(g.pages_cibles) f.querySelector("[name=pages_cibles]").value = g.pages_cibles; if(g.duree_mois){ f.querySelector("[name=duree_mois]").value = g.duree_mois; f.querySelector("[name=date_fin]").value = ""; }
        f.querySelector(".mr-sous-f").innerHTML = g.sous_objectifs.map(s => `<div class="mr-2"><input name="sous_titre" value="${esc(s.titre)}"><input name="sous_pages" type="number" min="0" placeholder="${esc(T.ui.form.sous_pages)}"></div>`).join(""); apercuFormulaire(f); };
      apercuFormulaire(f); }
    f.onsubmit = e => { e.preventDefault(); soumettre(f); };
  });
}
function soumettre(f){
  const d = donnees(), type = f.dataset.mrForm;
  if(type === "objectif"){ const r = apercuFormulaire(f); if(!r.ok) return; const {o, sous} = lireFormulaire(f);
    d.objectif = {...o, date_fin: r.objectif.date_fin}; d.sous = sous; ui.formulaire = false; ui.onglet = "jour"; d.compteur = null; enregistrer(); return; }
  if(type === "mots"){ const n = +f.querySelector("[name=mots]").value; if(n > 0){ d.journal.push({id: id(), date: aujourdhui(), mots_ecrits: n, source: "manuel"}); verifierJalons(d, n); enregistrer(); } return; }
  if(type === "bilan"){ const s = d.session, jour = aujourdhui();
    d.bilans.push({id: id(), date: jour, debut: s.debut, fin: Date.now(), mots_ecrits: +f.querySelector("[name=mots]").value || 0, elan_avant: s.elan_avant || elanDuJour(d, jour), elan_apres: +f.querySelector("[name=elan]").value, note: f.querySelector("[name=note]").value.trim()});
    d.session = null; toast(T.ui.bilan.merci); enregistrer(); }
}
function verifierJalons(d, ajout){
  const total = MR.motsEcritsJusqua(d.journal, aujourdhui()), passes = MR.jalons(total - ajout, total);
  if(passes.length) toast(remplir(T.jalons.mots, {mots: nb(passes[passes.length - 1]), prochain: nb(passes[passes.length - 1] + 1000)}));
}
function action(a, b){
  const d = donnees(), jour = aujourdhui();
  if(a === "definir" || a === "modifier"){ ui.formulaire = true; rendre(); return; }
  if(a === "annuler"){ ui.formulaire = false; rendre(); return; }
  if(a === "ajouter-sous"){ const box = $("#maRedac .mr-sous-f"); box.insertAdjacentHTML("beforeend", `<div class="mr-2"><input name="sous_titre"><input name="sous_pages" type="number" min="0" placeholder="${esc(T.ui.form.sous_pages)}"></div>`); return; }
  if(a === "adopter"){ d.objectif.date_fin = b.dataset.date; d.objectif.duree_mois = null; enregistrer(); return; }
  if(a === "question"){ ui.question++; rendre(); return; }
  if(a === "difficulte"){ d.soutien = true; d.interventions.push({id: id(), date: jour, niveau: 5, declencheurs: ["detresse"], reponse: "acceptee"}); enregistrer(); return; }
  if(a === "reprendre"){ d.soutien = false; enregistrer(); return; }
  if(a === "commencer"){ d.session = {debut: Date.now(), elan_avant: elanDuJour(d, jour), mots_depart: motsDuJour(d, jour)};
    const s = d.sessions.find(x => x.date === jour); if(s) s.demarree = true; enregistrer(); return; }
  if(a === "arreter"){ const p = planActif(d, jour); if(p) p.active = false; enregistrer(); }
}
function choisirPlan(strategie){
  const d = donnees(), jour = aujourdhui(), o = MR.normaliser(d.objectif);
  d.plans.forEach(p => p.active = false);
  const jours = MR.joursOuvres(jour, MR.versIso(MR.versJour(jour) + 6), o.jours_travail, o.jours_exclus);
  d.plans.push({id: id(), objectif_id: "", strategie, date_debut: jour, date_fin: MR.versIso(MR.versJour(jour) + 6), active: true});
  // les sessions de la semaine : celles qui ne démarrent pas nourrissent l’indicateur « plan non suivi »
  jours.forEach(j => { if(!d.sessions.some(s => s.date === j)) d.sessions.push({date: j, demarree: false}); });
  ui.onglet = "jour"; enregistrer();
}
function repondre(ivId, reponse){
  const d = donnees(), iv = d.interventions.find(x => x.id === ivId); if(!iv) return;
  iv.reponse = reponse; const jour = aujourdhui();
  if(reponse === "acceptee"){
    if(iv.niveau === 2) d.reduction[jour] = true;
    if(iv.niveau === 3) choisirPlan("session_minimale");
    if(iv.niveau === 4){ ui.formulaire = true; }
  }
  enregistrer();
}

// ---------- démarrage ----------
async function charger(){
  try{ T = window.TEXTES_MA_REDACTION || await (await fetch("textes/messages_fr.json?v=58")).json(); }catch(e){ T = null; }
  if(!T || !T.ui || !T.plans || !T.interventions) T = null; // textes absents ou illisibles : le module reste masqué, rien ne casse
  rendre();
}
if($("#draft")){ let t; $("#draft").addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => { const d = D(); if(d && d.objectif){ compterRedaction(); save(); if(ui.onglet === "jour" && !ui.formulaire) rendre(); } }, 1200); }); }
window.renderMaRedac = rendre;
window.MaRedactionUI = {ui, rendre, compterRedaction, aujourdhui};
charger();
})();
