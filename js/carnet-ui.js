/* SCIENTUS : CARNET DE RECHERCHE, interface (2026-11-21). Moteur : js/carnet.js (window.Carnet).
   Le parcours : Plan → Lectures (planifiées avant la rédaction de chaque partie) → Fiches (rangées par partie et
   par thème) → Rédaction (le dossier de fiches de la partie, à insérer avec sa référence).
   Données du projet : state.carnet = {lectures: {idSource: {...}}, notes: [...], sessions: [...], reglages: {...}}.
   Les documents ouverts dans le lecteur restent en mémoire le temps de la lecture ; ils ne sont jamais enregistrés
   ni envoyés. SCIENTUS ne rédige rien : il range, relie et retrouve ce que le chercheur a lu et noté. */
(function(){
"use strict";
const C = window.Carnet; if(!C) return;
const box = document.getElementById("carnet"); if(!box) return;

// ---------- textes (validés par l’utilisateur le 2026-11-21 ; toute modification se fait avec son accord) ----------
const T = {
  titre: "Carnet de recherche",
  intro: "Lis, note, range : à la fin, chaque partie de ton plan a son dossier de fiches, prêt pour la rédaction. SCIENTUS range et retrouve tes notes ; il n’écrit rien à ta place.",
  onglets: {jour: "Aujourd’hui", lectures: "Lectures", fiches: "Fiches", themes: "Thèmes", redaction: "Vers la rédaction"},
  sans_plan: "Ton plan est vide. Le carnet marche sans plan, mais avec un plan, chaque lecture et chaque fiche trouvent leur place, et la rédaction suit.",
  faire_plan: "Établir mon plan",
  types: {citation: "Citation", paraphrase: "Paraphrase", resume: "Résumé", idee: "Idée", question: "Question", definition: "Définition", donnee: "Donnée"},
  aides_types: {citation: "Les mots exacts de l’auteur, entre guillemets, avec la page.", paraphrase: "L’idée de l’auteur, dans tes mots.", resume: "L’essentiel d’un texte ou d’un chapitre.", idee: "Ta propre réflexion.", question: "Ce qui reste à éclaircir.", definition: "Un concept et son sens.", donnee: "Un chiffre, une date, un fait."},
  saisie: {placeholder: "Note ici… « citation » p. 12, une idée, une question ? #thème — ou dicte", source: "Source", sans_source: "Sans source (mon idée)", page: "Page", partie: "Partie", a_classer: "À classer plus tard", noter: "Noter", dicter: "Dicter", arreter: "Arrêter", detecte: "Reconnu", rangee: "Rangée dans", proposee: "proposé", extraits: "Coller plusieurs extraits d’un coup", extraits_aide: "Un extrait par paragraphe (laisse une ligne vide entre deux). Chaque extrait devient une fiche de la source choisie.", extraits_bouton: "Créer les fiches", aide: "Astuces : « … » ou « citation » au début = citation · « p. 12 » à la fin = page · (Koné, 2016) = source · ? à la fin = question · #mot = thème."},
  jour: {lire: "À lire aujourd’hui", pages: "{pages} pages", rien_a_lire: "Rien à lire de prévu. Ajoute des lectures à ta liste.", lu_aujourdhui: "Lu aujourd’hui : {pages} pages · {serie} jours de lecture d’affilée", a_classer: "Fiches à classer", a_classer_aide: "Une touche pour ranger chaque fiche dans la partie proposée.", ranger: "Ranger ici", autre: "Autre partie…", preparation: "Préparation des parties", verifs: "À vérifier", lues_sans_fiche: "Lue sans aucune fiche : {source}", sans_source: "{n} fiches (citations, paraphrases, données) sans source : ajoute la source, sinon tu ne pourras pas les citer.", citees_sans_fiche: "Citée dans ta rédaction sans fiche : {source}", promenade: "Mode promenade", promenade_aide: "Note tes idées au vol, à la voix ou au clavier, même sans connexion. Tu les rangeras après."},
  lectures: {rythme: "Rythme : {pages} pages par jour de lecture · fin prévue le {fin}", alerte_trop: "Plus de 40 pages par jour : c’est beaucoup. Retire des lectures secondaires, ou décale le début de ta rédaction.", alerte_retard: "Des lectures sont en retard sur le calendrier de rédaction.", lire_avant: "à lire avant le {date}", rediger: "rédaction du {du} au {au}", sans_partie: "Lectures sans partie", ajouter: "Ajouter une lecture de ma bibliographie", choisir: "Choisir une source…", pour_partie: "Pour la partie", ajouter_bouton: "Ajouter", trouver: "Trouver des lectures pour mon plan", vide: "Ta liste de lecture est vide. Ajoute des sources de ta bibliographie, ou demande des lectures pour chaque partie de ton plan.", statuts: {a_lire: "À lire", en_cours: "En cours", lue: "Lue", abandonnee: "Écartée"}, page: "Page", sur: "sur", question: "Ce que je cherche dans ce texte", priorite: "Priorité", priorites: {1: "Essentielle", 2: "Utile", 3: "Secondaire"}, lire: "Lire", lire_en_ligne: "Lire en ligne", noter: "Noter", finie: "J’ai fini", retenu: "En une phrase, que retiens-tu de ce texte ?", retenu_enregistrer: "Enregistrer et terminer", fin_lecture: "Finir les lectures le", objectif_redaction: "Le calendrier suit ton objectif de rédaction ({du} → {au}).", sans_objectif: "Sans objectif de rédaction, les lectures sont réparties jusqu’à la date choisie.", fixer_objectif: "Fixer mon objectif de rédaction", estime: "estimé"},
  lecteur: {ouvrir: "Ouvrir le document (PDF, Word ou texte)", aide: "Le document reste sur ton appareil. Sélectionne un passage pour le citer ou noter une idée.", page: "Page", decalage: "Numéro imprimé = page du fichier", plus: "+", citer: "Citer ce passage", idee: "Noter une idée sur ce passage", fermer: "Fermer le lecteur", precedente: "Page précédente", suivante: "Page suivante", chargement: "Ouverture du document…", illisible: "Je n’arrive pas à lire ce document. S’il est scanné, ouvre-le dans ton lecteur PDF et colle les extraits."},
  fiches: {chercher: "Chercher dans mes fiches", chercher_aide: "Exemples : sondages · \"opinion publique\" · auteur:Koné · type:citation · #comparaison · -journaux", tous_types: "Tous les types", toutes_parties: "Toutes les parties", a_classer: "À classer", tous_themes: "Tous les thèmes", toutes_sources: "Toutes les sources", inutilisees: "Pas encore utilisées", n: "{n} fiches", aucune: "Aucune fiche ne correspond.", vide: "Pas encore de fiche. Note ta première idée ou ta première citation en haut.", modifier: "Modifier", ranger: "Ranger", voisines: "Fiches proches", aucune_voisine: "Pas de fiche proche.", epingler: "Épingler", desepingler: "Désépingler", supprimer: "Supprimer", supprimee: "Fiche supprimée", annuler: "Annuler", commentaire: "Mon commentaire", themes: "Thèmes (séparés par des virgules)", enregistrer: "Enregistrer", trop_proche: "Paraphrase trop proche de la citation (« {extrait} ») : reformule davantage pour éviter le plagiat.", doublon: "Tu as déjà une fiche presque identique pour cette source.", garder: "Garder quand même", utilisee: "Utilisée dans la rédaction", parties: "Parties", export_word: "Fiches en Word", export_excel: "Fiches en Excel"},
  themes: {intro: "Tes thèmes : ceux que tu as notés avec #, puis ceux que SCIENTUS repère dans tes fiches (mots qui reviennent dans plusieurs fiches).", vide: "Les thèmes apparaissent quand tu as quelques fiches.", perso: "Mon thème", auto: "Repéré", fiches: "{n} fiches", surtout: "surtout dans : {partie}", voir: "Voir les fiches"},
  redaction: {intro: "Ton plan relie tout : chaque partie se lit, puis se note, puis se rédige. Rédige d’abord le corps, puis la conclusion, et l’introduction en dernier : tu présenteras mieux ce que tu as déjà écrit.", ordre: "Ordre de rédaction conseillé", etats: {vide: "Rien encore", mince: "Peu de matière", en_cours: "En préparation", prete: "Prête à rédiger"}, resume: "{fiches} fiches · {sources} sources · {alire} à lire", manques: {sources: "Il faut plus de sources différentes.", appui: "Pas encore de citation ni de paraphrase pour appuyer tes idées.", cadrage: "Pas encore de définition ni de question pour cadrer le sujet."}, voir: "Voir les fiches", organiser: "Organiser le fil", rediger: "Rédiger cette partie", fil: "Fil de la partie : mets les fiches dans l’ordre de ton raisonnement.", fermer: "Fermer", caler: "Caler mes étapes de rédaction sur ce plan", calees: "Étapes de MA RÉDACTION calées sur ton plan.", fixer: "Fixe ton objectif de rédaction pour caler lectures et rédaction sur le même calendrier.", fixer_bouton: "Fixer mon objectif"},
  dossier: {titre: "Mes fiches pour cette partie", choisir: "Partie", inserer: "Insérer", inseree: "Insérée dans ton texte avec sa référence", vide: "Aucune fiche rangée dans cette partie.", ouvrir: "Ouvrir le carnet", utilisee: "déjà utilisée"},
  promenade: {titre: "Mode promenade", aide: "Une idée, une phrase entendue, une question : note-la tout de suite. Elle ira dans « À classer ».", noter: "Noter", terminer: "Terminer", notees: "{n} notes prises", sans_micro: "La dictée n’est pas disponible ici : utilise le micro de ton clavier."},
  chiffres: {titre: "Les chiffres du jour", aide: "Touche un chiffre pour voir le détail.", fiches: "Fiches dans ton carnet", a_classer: "Fiches à classer", pages: "Pages lues aujourd’hui", pretes: "Parties prêtes à rédiger"},
  bravo: {premiere: "Première fiche du jour. Bien lancé.", dix: "{n} fiches dans ton carnet. Ta matière s’accumule.", lue: "Lecture terminée. Une source de plus maîtrisée.", prete: "La partie « {partie} » est prête à rédiger.", rangees: "Toutes tes fiches sont rangées."},
  excel: {fichier: "carnet-de-recherche", fiches: "Fiches", lectures: "Lectures", parties: "Parties", oui: "oui", entetes_fiches: ["Type", "Fiche", "Source", "Page", "Parties", "Thèmes", "Commentaire", "Utilisée", "Date"], entetes_lectures: ["Source", "Statut", "Page atteinte", "Pages", "Parties", "Ce que je cherche", "Fiches"], entetes_parties: ["Partie", "Fiches", "Sources", "À lire", "État", "Fiches utilisées"]},
  word: {titre: "Fiches de lecture", a_classer: "Fiches à classer", page: "p."}
};
window.TEXTES_CARNET = T; // relecture des textes

// ---------- outils ----------
// accord : « 1 fiche », « 0 page » (le nom qui suit la valeur perd son s quand elle vaut 0 ou 1)
const singulier = x => { const n = +String(x).replace(/[\s  ]/g, "").replace(",", "."); return !isNaN(n) && Math.abs(n) < 2; };
const remplir = (t, v) => String(t || "").replace(/\{(\w+)\}( ([a-zéèàêîôû]+)s\b)?/g, (m, k, suite, nom) => v[k] === undefined ? m : v[k] + (suite ? " " + nom + (singulier(v[k]) ? "" : "s") : ""));
const auj = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const dateCourte = iso => iso ? new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", {day: "numeric", month: "long"}) : "";
const id = () => "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const sansBalises = h => { const d = document.createElement("div"); d.innerHTML = h; return d.textContent; };
const ui = {onglet: "jour", q: "", filtres: {}, edition: null, voisines: null, organiser: null, lecteur: null, promenade: false, partieDossier: null, retenu: null, rangerAutre: null};
function donnees(){
  const c = state.carnet || (state.carnet = {});
  c.lectures = c.lectures || {}; c.notes = c.notes || []; c.sessions = c.sessions || []; c.reglages = c.reglages || {};
  return c;
}
const enregistrer = () => { save(); };
const items = () => (typeof plan === "function" ? plan().items : (state.plan || {items: []}).items) || [];
const partiesU = () => C.partiesUtiles(items());
const titrePartie = pid => (items().find(it => it.id === pid) || {}).t || "";
const sourceDe = sid => state.sources.find(s => s.id === sid);
function nomCourt(s){
  if(!s) return "";
  const A = (s.authors || []).map(a => a.family).filter(Boolean);
  return `${A.length > 2 ? A[0] + " et al." : A.join(" et ") || (s.title || "").slice(0, 30)}, ${String(s.year || "s.d.").slice(0, 4)}`;
}
// appel de citation dans la norme du projet (même fonction que le panneau « Citer dans le texte »)
function appel(n){
  const s = sourceDe(n.source); if(!s) return "";
  try{ const st = STYLES[state.style]; if(st && !st.footnote) return sansBalises(st.cite(s, n.page || "", "parenthese")).trim(); }catch(e){}
  return `(${nomCourt(s)}${n.page ? ", p. " + n.page : ""})`;
}
const partiesValides = n => (n.parties || []).filter(p => items().some(it => it.id === p));
// icônes en médaillon (disque en dégradé, trait blanc), comme dans le reste de l’application
const ICONES = {
  fiches: '<path d="M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6z"/><path d="M6 3v18"/><path d="M3 7h3M3 12h3M3 17h3"/><path d="M10 8h6M10 12h6M10 16h3"/>',
  classer: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  lire: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
  pret: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  theme: '<path d="M20.59 13.41 13.42 20.6a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1.5"/>',
  calendrier: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  alerte: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>',
  promenade: '<circle cx="13" cy="4" r="2"/><path d="m9 20 3-6 3 3v4"/><path d="M6 12l3-4 4 1 3 3 3 1"/>',
  plan: '<path d="M21 12h-8M21 6H8M21 18h-8M3 6v4c0 1.1.9 2 2 2h3M3 10v6c0 1.1.9 2 2 2h3"/>',
  ajouter: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  plume: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  loupe: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'
};
const med = (ic, couleur, classe = "cmed") => `<span class="${classe} m-${couleur}" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONES[ic]}</svg></span>`;
const titreBloc = (ic, couleur, texte, extra = "") => `<h3>${med(ic, couleur)}<span>${esc(texte)}${extra}</span></h3>`;

// petit carillon (même réglage que MA RÉDACTION : « scientus.sons »)
let ctxSon = null;
function carillon(){
  try{ if(localStorage.getItem("scientus.sons") === "0") return; const AC = window.AudioContext || window.webkitAudioContext; if(!AC) return;
    ctxSon = ctxSon || new AC(); const t0 = ctxSon.currentTime;
    [784, 1047].forEach((f, i) => { const o = ctxSon.createOscillator(), g = ctxSon.createGain(); o.type = "sine"; o.frequency.value = f; g.gain.setValueAtTime(.0001, t0 + i * .12); g.gain.exponentialRampToValueAtTime(.12, t0 + i * .12 + .02); g.gain.exponentialRampToValueAtTime(.0001, t0 + i * .12 + .5); o.connect(g); g.connect(ctxSon.destination); o.start(t0 + i * .12); o.stop(t0 + i * .12 + .55); });
  }catch(e){}
}
const bravo = msg => { carillon(); toast(msg); };

// ---------- données : fiches, lectures ----------
function creerFiche(f){
  const c = donnees(), n = {id: id(), type: f.type || "idee", texte: f.texte, source: f.source || null, page: f.page || "", parties: f.parties || [], themes: f.themes || [], commentaire: f.commentaire || "", origine: f.origine || "saisie", cree: Date.now(), modifie: Date.now()};
  const avant = c.notes.filter(x => new Date(x.cree).toISOString().slice(0, 10) === auj()).length;
  c.notes.push(n);
  if(n.source && c.lectures[n.source] && c.lectures[n.source].statut === "a_lire") c.lectures[n.source].statut = "en_cours";
  const total = c.notes.length;
  if(!avant) setTimeout(() => bravo(T.bravo.premiere), 50); else if(total % 10 === 0) setTimeout(() => bravo(remplir(T.bravo.dix, {n: total})), 50);
  verifierPartiesPretes(n.parties);
  return n;
}
let pretesAvant = null;
function verifierPartiesPretes(){
  const cov = C.couverture(items(), donnees().notes, donnees().lectures), pretes = new Set(cov.filter(c => c.etat === "prete").map(c => c.id));
  if(pretesAvant) pretes.forEach(p => { if(!pretesAvant.has(p)) setTimeout(() => bravo(remplir(T.bravo.prete, {partie: titrePartie(p)})), 1200); });
  pretesAvant = pretes;
}
function ajouterALire(sid, pid, lien){
  const c = donnees(), l = c.lectures[sid] || (c.lectures[sid] = {statut: "a_lire", parties: [], priorite: 2, ajoute: auj()});
  if(pid && !l.parties.includes(pid)) l.parties.push(pid);
  if(lien) l.lien = lien;
  enregistrer();
}
function noterPages(sid, page){
  const c = donnees(), l = c.lectures[sid]; if(!l) return;
  const avant = +l.page || 0, apres = Math.max(0, Math.round(+page || 0));
  if(apres > avant) c.sessions.push({date: auj(), lecture: sid, pages: apres - avant});
  l.page = apres; if(apres > 0 && l.statut === "a_lire") l.statut = "en_cours";
}

// ---------- saisie rapide (en haut de « Aujourd’hui » et de « Fiches ») ----------
function optionsSources(sel){
  const S = state.sources.slice().sort((a, b) => nomCourt(a).localeCompare(nomCourt(b), "fr"));
  const lus = donnees().lectures;
  return `<option value="">${esc(T.saisie.sans_source)}</option>` + S.map(s => `<option value="${esc(s.id)}"${s.id === sel ? " selected" : ""}>${esc(nomCourt(s))} : ${esc((s.title || "").slice(0, 60))}${lus[s.id] ? " ·" : ""}</option>`).join("");
}
function optionsParties(sel, vide){
  return `<option value="">${esc(vide || T.saisie.a_classer)}</option>` + partiesU().map(it => `<option value="${esc(it.id)}"${it.id === sel ? " selected" : ""}>${it.n > 1 ? "  · " : ""}${esc(it.t)}</option>`).join("");
}
function saisieHtml(){
  const pre = ui.prefill || {};
  return `<form class="csaisie" data-c-form="saisie" autocomplete="off">
    <label class="sr" for="cTexte">${esc(T.saisie.placeholder)}</label>
    <textarea id="cTexte" rows="3" placeholder="${esc(T.saisie.placeholder)}">${esc(pre.texte || "")}</textarea>
    <div class="cdetect" id="cDetect" aria-live="polite"></div>
    <div class="cchamps">
      <label class="f">${esc(T.saisie.source)}<select id="cSource">${optionsSources(pre.source || "")}</select></label>
      <label class="f cpage">${esc(T.saisie.page)}<input id="cPage" inputmode="numeric" value="${esc(pre.page || "")}"></label>
      <label class="f">${esc(T.saisie.partie)}<select id="cPartie">${optionsParties(pre.partie || "")}</select></label>
    </div>
    <div class="row"><button class="btn small primary" type="submit">${esc(T.saisie.noter)}</button>${window.SpeechRecognition || window.webkitSpeechRecognition ? `<button class="btn small" type="button" data-c="dicter">${esc(T.saisie.dicter)}</button>` : ""}</div>
    <p class="legend">${esc(T.saisie.aide)}</p>
    <details class="cextraits"><summary>${esc(T.saisie.extraits)}</summary><p class="legend">${esc(T.saisie.extraits_aide)}</p><textarea id="cExtraits" rows="5"></textarea><button class="btn small" type="button" data-c="extraits">${esc(T.saisie.extraits_bouton)}</button></details>
  </form>`;
}
// analyse pendant la frappe : type reconnu, source reconnue, partie proposée (le chercheur garde la main)
let partieChoisieMain = false, sourceChoisieMain = false;
// partie proposée : d’après le contenu de la fiche ; à défaut, la partie pour laquelle on lit cette source
function partieProposee(texte, themes, sid){
  const s = C.suggererParties({id: "_", texte, themes}, items(), donnees().notes)[0];
  if(s && s.score >= .08) return s.id;
  const l = sid && donnees().lectures[sid];
  return l ? (l.parties || []).find(p => partiesU().some(it => it.id === p)) || "" : "";
}
function analyserSaisieEnDirect(){
  const ta = box.querySelector("#cTexte"); if(!ta) return;
  const a = C.analyserSaisie(ta.value), out = [];
  if(!ta.value.trim()){ box.querySelector("#cDetect").innerHTML = ""; return; }
  out.push(`<span class="ctype t-${a.type}">${esc(T.types[a.type])}</span>`);
  const sid = C.lierSource(a, state.sources);
  if(sid && !sourceChoisieMain){ box.querySelector("#cSource").value = sid; }
  if(a.page && !box.querySelector("#cPage").value) box.querySelector("#cPage").value = a.page;
  if(!partieChoisieMain && partiesU().length){
    const p = partieProposee(a.texte, a.themes, box.querySelector("#cSource").value);
    box.querySelector("#cPartie").value = p || "";
    if(p) out.push(`<span class="legend">${esc(T.saisie.rangee)} : <b>${esc(titrePartie(p))}</b> (${esc(T.saisie.proposee)})</span>`);
  }
  if(a.themes.length) out.push(a.themes.map(t => `<span class="cth">#${esc(t)}</span>`).join(" "));
  box.querySelector("#cDetect").innerHTML = out.join(" ");
}
function noterDepuisSaisie(){
  const ta = box.querySelector("#cTexte"); const brut = ta.value.trim(); if(!brut) return;
  const a = C.analyserSaisie(brut), src = box.querySelector("#cSource").value || C.lierSource(a, state.sources) || null;
  const pid = box.querySelector("#cPartie").value, page = box.querySelector("#cPage").value.trim() || a.page;
  const brouillon = {type: a.type, texte: a.texte, source: src, page, parties: pid ? [pid] : [], themes: a.themes};
  const dbl = C.doublon({id: "_", ...brouillon}, donnees().notes);
  if(dbl && ui.forcer !== brut){ ui.forcer = brut; toast(T.fiches.doublon, T.fiches.garder, () => noterDepuisSaisie()); return; }
  ui.forcer = null;
  const n = creerFiche(brouillon);
  if(n.type === "paraphrase"){ const p = C.paraphraseTropProche(n.texte, donnees().notes.filter(x => x.type === "citation" && x.source === n.source)); if(p) setTimeout(() => toast(remplir(T.fiches.trop_proche, p)), 1600); }
  // la source reste choisie pour la fiche suivante seulement si le chercheur l’a choisie lui-même (lecture en cours)
  ui.prefill = {source: sourceChoisieMain ? (box.querySelector("#cSource").value || "") : "", partie: partieChoisieMain ? pid : ""}; partieChoisieMain = false;
  ui.vider = true; enregistrer(); rendre();
  const t2 = box.querySelector("#cTexte"); if(t2) t2.focus();
}
function creerExtraits(){
  const ta = box.querySelector("#cExtraits"), src = box.querySelector("#cSource").value || null, pid = box.querySelector("#cPartie").value;
  const L = C.decouperExtraits(ta.value); if(!L.length) return;
  L.forEach(a => creerFiche({type: a.type === "idee" && src ? "citation" : a.type, texte: a.texte, source: src || C.lierSource(a, state.sources), page: a.page, parties: pid ? [pid] : [], themes: a.themes, origine: "extraits"}));
  ui.vider = true; enregistrer(); toast(remplir(T.fiches.n, {n: L.length})); rendre();
}
// dictée : reconnaissance vocale du navigateur (le son part chez Google ou Apple, comme le moteur « Direct »)
let reco = null;
function dicterVers(ta, bouton){
  const R = window.SpeechRecognition || window.webkitSpeechRecognition; if(!R){ toast(T.promenade.sans_micro); return; }
  if(reco){ reco.stop(); reco = null; if(bouton) bouton.textContent = T.saisie.dicter; return; }
  reco = new R(); reco.lang = "fr-FR"; reco.continuous = true; reco.interimResults = false;
  reco.onresult = e => { for(let i = e.resultIndex; i < e.results.length; i++) if(e.results[i].isFinal){ const t = e.results[i][0].transcript.trim(); ta.value = (ta.value ? ta.value.replace(/\s*$/, " ") : "") + t; ta.dispatchEvent(new Event("input")); } };
  reco.onend = () => { reco = null; if(bouton) bouton.textContent = T.saisie.dicter; };
  try{ reco.start(); if(bouton) bouton.textContent = T.saisie.arreter; }catch(e){ reco = null; }
}

// ---------- onglet Aujourd’hui ----------
function calendrierCourant(){
  const c = donnees(), o = state.maRedac && state.maRedac.objectif && state.maRedac.objectif.statut !== "termine" ? state.maRedac.objectif : null;
  return C.calendrier({items: items(), lectures: c.lectures, sources: state.sources, objectif: o, aujourdhui: auj(), finLecture: c.reglages.finLecture || null});
}
function ongletJour(){
  const c = donnees(), cal = calendrierCourant(), du = C.lectureDuJour(cal), b = C.bilanLecture(c.sessions, auj());
  let h = chiffresHtml(b) + saisieHtml();
  h += `<section class="cbloc">${titreBloc("lire", "cyan", T.jour.lire)}`;
  h += du.length ? `<ul class="cliste">${du.map(x => { const s = sourceDe(x.id), l = c.lectures[x.id]; return `<li><span><b>${esc(nomCourt(s))}</b> · ${esc((s.title || "").slice(0, 70))}</span><span class="legend">${esc(remplir(T.jour.pages, {pages: x.pages}))}${l.page ? ` · ${esc(T.lectures.page)} ${l.page}` : ""}</span><button class="btn small" type="button" data-c="lire" data-s="${esc(x.id)}">${esc(T.lectures.lire)}</button></li>`; }).join("")}</ul>` : `<p class="legend">${esc(T.jour.rien_a_lire)}</p>`;
  if(b.aujourdhui || b.serie) h += `<p class="legend">${esc(remplir(T.jour.lu_aujourdhui, {pages: b.aujourdhui, serie: b.serie}))}</p>`;
  if(cal.alerte) h += `<p class="note">${esc(cal.alerte === "trop" ? T.lectures.alerte_trop : T.lectures.alerte_retard)}</p>`;
  h += `</section>`;
  const aClasser = c.notes.filter(n => !partiesValides(n).length);
  if(aClasser.length && partiesU().length){
    h += `<section class="cbloc">${titreBloc("classer", "ambre", T.jour.a_classer, ` <span class="cnb">${aClasser.length}</span>`)}<p class="legend">${esc(T.jour.a_classer_aide)}</p><ul class="cliste">`;
    aClasser.slice(0, 8).forEach(n => { const s = C.suggererParties(n, items(), c.notes)[0];
      h += `<li class="cclasser"><span class="ctype t-${n.type}">${esc(T.types[n.type])}</span><span class="ctexte">${esc(n.texte.slice(0, 160))}</span>
        <span class="row">${s ? `<button class="btn small primary" type="button" data-c="ranger" data-n="${n.id}" data-p="${esc(s.id)}">${esc(T.jour.ranger)} : ${esc(titrePartie(s.id).slice(0, 40))}</button>` : ""}
        ${ui.rangerAutre === n.id ? `<select data-c-ranger="${n.id}">${optionsParties("", T.jour.autre)}</select>` : `<button class="btn small" type="button" data-c="ranger-autre" data-n="${n.id}">${esc(T.jour.autre)}</button>`}</span></li>`; });
    h += `</ul></section>`;
  }
  h += preparationHtml(true);
  const v = C.verifications(c.notes, c.lectures, state.sources, (state.draft || {}).text || "");
  const lignes = [...v.luesSansFiche.map(sid => remplir(T.jour.lues_sans_fiche, {source: nomCourt(sourceDe(sid))})), ...(v.sansSource.length ? [remplir(T.jour.sans_source, {n: v.sansSource.length})] : []), ...v.citeesSansFiche.slice(0, 5).map(sid => remplir(T.jour.citees_sans_fiche, {source: nomCourt(sourceDe(sid))}))].filter(Boolean);
  if(lignes.length) h += `<section class="cbloc">${titreBloc("alerte", "rose", T.jour.verifs)}<ul class="cverifs">${lignes.map(l => `<li>${esc(l)}</li>`).join("")}</ul></section>`;
  h += `<section class="cbloc cprom">${med("promenade", "teal", "med")}<button class="btn primary" type="button" data-c="promenade">${esc(T.jour.promenade)}</button><p class="legend">${esc(T.jour.promenade_aide)}</p></section>`;
  return h;
}
// « Les chiffres du jour » : quatre tuiles à médaillon ; chacune ouvre le détail
function chiffresHtml(b){
  const c = donnees(), K = T.chiffres, cov = C.couverture(items(), c.notes, c.lectures), aCl = c.notes.filter(n => !partiesValides(n).length).length;
  const tuile = (ic, coul, val, lib, act, etat = "") => `<button type="button" class="cchiffre${etat ? " " + etat : ""}" data-c="${act}">${med(ic, coul, "med")}<b>${val}</b><span>${esc(lib)}</span></button>`;
  return `<section class="cbloc">${titreBloc("calendrier", "indigo", K.titre)}<p class="legend">${esc(K.aide)}</p><div class="cchiffres">
    ${tuile("fiches", "violet", c.notes.length, K.fiches, "voir-fiches")}
    ${tuile("classer", "ambre", aCl, K.a_classer, "voir-a-classer", aCl ? "alerte" : "")}
    ${tuile("lire", "cyan", b.aujourdhui, K.pages, "voir-lectures")}
    ${tuile("pret", "teal", cov.length ? `${cov.filter(x => x.etat === "prete").length}/${cov.length}` : "—", K.pretes, "voir-redaction", cov.length && cov.every(x => x.etat === "prete") ? "ok" : "")}</div></section>`;
}
// préparation des parties : barre par partie (compacte dans « Aujourd’hui », complète dans « Vers la rédaction »)
function preparationHtml(compact){
  const cov = C.couverture(items(), donnees().notes, donnees().lectures); if(!cov.length) return "";
  return `<section class="cbloc">${titreBloc("pret", "teal", T.jour.preparation)}<ul class="cprep">${cov.filter(x => !compact || x.n <= 1).map(x => `<li class="e-${x.etat}"><span class="cpt">${esc(x.titre)}</span><span class="cbarre" aria-hidden="true"><i style="width:${Math.round(x.progression * 100)}%"></i></span><span class="cetat">${esc(T.redaction.etats[x.etat])}</span></li>`).join("")}</ul></section>`;
}

// ---------- onglet Lectures ----------
function carteLecture(sid, cal){
  const c = donnees(), l = c.lectures[sid], s = sourceDe(sid); if(!s) return "";
  const p = C.pagesRestantes(l, s), f = cal.file.find(x => x.id === sid), nb = c.notes.filter(n => n.source === sid).length;
  const L = T.lectures;
  if(ui.retenu === sid) return `<li class="clect"><form data-c-form="retenu" data-s="${esc(sid)}"><label class="f full">${esc(L.retenu)}<textarea name="r" rows="2"></textarea></label><button class="btn small primary" type="submit">${esc(L.retenu_enregistrer)}</button></form></li>`;
  return `<li class="clect s-${l.statut}"><div class="cl1"><b>${esc(nomCourt(s))}</b> <span>${esc(s.title || "")}</span></div>
    <div class="cl2"><select data-c-statut="${esc(sid)}" aria-label="Statut">${Object.entries(L.statuts).map(([k, v]) => `<option value="${k}"${l.statut === k ? " selected" : ""}>${esc(v)}</option>`).join("")}</select>
      <label class="cpg">${esc(L.page)} <input data-c-page="${esc(sid)}" inputmode="numeric" value="${+l.page || 0}"> ${esc(L.sur)} <input data-c-total="${esc(sid)}" inputmode="numeric" value="${+l.pages_total || ""}" placeholder="${p.total}"></label>
      <select data-c-prio="${esc(sid)}" aria-label="${esc(L.priorite)}">${[1, 2, 3].map(k => `<option value="${k}"${(+l.priorite || 2) === k ? " selected" : ""}>${esc(L.priorites[k])}</option>`).join("")}</select>
      ${f ? `<span class="legend">${f.aTemps ? "" : "⚠ "}${esc(dateCourte(f.debut))} → ${esc(dateCourte(f.fin))}</span>` : ""}${nb ? `<span class="cnb" title="${esc(remplir(T.fiches.n, {n: nb}))}">${nb}</span>` : ""}</div>
    <label class="f full cq">${esc(L.question)}<input data-c-question="${esc(sid)}" value="${esc(l.question || "")}"></label>
    <div class="row"><button class="btn small" type="button" data-c="lire" data-s="${esc(sid)}">${esc(L.lire)}</button>${l.lien || s.url || s.doi ? `<a class="btn small" href="${esc(l.lien || s.url || "https://doi.org/" + s.doi)}" target="_blank" rel="noopener">${esc(L.lire_en_ligne)}</a>` : ""}<button class="btn small" type="button" data-c="noter-source" data-s="${esc(sid)}">${esc(L.noter)}</button>${l.statut !== "lue" ? `<button class="btn small" type="button" data-c="finie" data-s="${esc(sid)}">${esc(L.finie)}</button>` : ""}</div></li>`;
}
function ongletLectures(){
  const c = donnees(), cal = calendrierCourant(), L = T.lectures, o = state.maRedac && state.maRedac.objectif;
  let h = ui.lecteur ? lecteurHtml() : "";
  const ids = Object.keys(c.lectures).filter(sourceDe);
  h += `<section class="cbloc">`;
  if(cal.file.length) h += `<p><b>${esc(remplir(L.rythme, {pages: cal.pagesParJour, fin: dateCourte(cal.finLecture)}))}</b></p>`;
  if(cal.alerte) h += `<p class="note">${esc(cal.alerte === "trop" ? L.alerte_trop : L.alerte_retard)}</p>`;
  h += o ? `<p class="legend">${esc(remplir(L.objectif_redaction, {du: dateCourte(o.date_debut), au: dateCourte(o.date_fin)}))}</p>`
    : `<p class="legend">${esc(L.sans_objectif)}</p><div class="row"><label class="f">${esc(L.fin_lecture)} <input type="date" data-c-fin value="${esc(c.reglages.finLecture || "")}"></label><button class="btn small" type="button" data-c="objectif">${esc(L.fixer_objectif)}</button></div>`;
  h += `</section>`;
  const dispo = state.sources.filter(s => !c.lectures[s.id]);
  h += `<form class="cbloc cajout" data-c-form="ajout">${titreBloc("ajouter", "violet", L.ajouter)}<div class="cchamps"><select name="s" aria-label="${esc(L.choisir)}"><option value="">${esc(L.choisir)}</option>${dispo.map(s => `<option value="${esc(s.id)}">${esc(nomCourt(s))} : ${esc((s.title || "").slice(0, 60))}</option>`).join("")}</select><select name="p" aria-label="${esc(L.pour_partie)}">${optionsParties("", L.pour_partie)}</select><button class="btn small" type="submit">${esc(L.ajouter_bouton)}</button></div><button class="link" type="button" data-c="trouver">${esc(L.trouver)}</button></form>`;
  if(!ids.length) return h + `<p class="legend">${esc(L.vide)}</p>`;
  cal.chapitres.forEach(ch => {
    const dans = ids.filter(sid => (c.lectures[sid].parties || []).some(p => ch.id === p || (C.chapitres(items()).find(x => x.id === ch.id) || {ids: []}).ids.includes(p)));
    if(!dans.length) return;
    h += `<section class="cbloc">${titreBloc("plan", "indigo", ch.titre)}<p class="legend">${esc(remplir(L.lire_avant, {date: dateCourte(ch.lireAvant)}))}${ch.rediger ? " · " + esc(remplir(L.rediger, {du: dateCourte(ch.rediger.du), au: dateCourte(ch.rediger.au)})) : ""}</p><ul class="clects">${trierLectures(dans, cal).map(sid => carteLecture(sid, cal)).join("")}</ul></section>`;
  });
  const sans = ids.filter(sid => !(c.lectures[sid].parties || []).some(p => items().some(it => it.id === p)));
  if(sans.length) h += `<section class="cbloc">${titreBloc("lire", "ardoise", L.sans_partie)}<ul class="clects">${trierLectures(sans, cal).map(sid => carteLecture(sid, cal)).join("")}</ul></section>`;
  return h;
}
const RANG_STATUT = {en_cours: 0, a_lire: 1, lue: 2, abandonnee: 3};
function trierLectures(ids, cal){ const c = donnees(), pos = id => { const i = cal.file.findIndex(x => x.id === id); return i < 0 ? 999 : i; };
  return ids.slice().sort((a, b) => RANG_STATUT[c.lectures[a].statut] - RANG_STATUT[c.lectures[b].statut] || pos(a) - pos(b)); }

// ---------- lecteur intégré ----------
async function ouvrirDocument(sid, fichier){
  ui.lecteur = {sid, pages: null, i: 0, decalage: (donnees().lectures[sid] || {}).decalage || 0, nom: fichier.name}; rendre();
  try{
    const n = fichier.name.toLowerCase(); let pages = [];
    if(n.endsWith(".pdf")){
      const lib = await waitFor("pdfjsLib"); lib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      const pdf = await lib.getDocument({data: await fichier.arrayBuffer()}).promise;
      for(let p = 1; p <= pdf.numPages; p++){ const tc = await (await pdf.getPage(p)).getTextContent(); pages.push(tc.items.map(x => x.str + (x.hasEOL ? "\n" : " ")).join("").replace(/[ \t]+\n/g, "\n").trim()); }
    } else if(n.endsWith(".docx")){
      const m = await waitFor("mammoth"); const r = await m.extractRawText({arrayBuffer: await fichier.arrayBuffer()});
      pages = decouperEnPages(r.value);
    } else pages = decouperEnPages(await fichier.text());
    if(!pages.join("").trim()) throw new Error("vide");
    const l = donnees().lectures[sid]; if(l && !+l.pages_total) l.pages_total = pages.length;
    ui.lecteur.pages = pages; ui.lecteur.i = Math.min(pages.length - 1, Math.max(0, (+(l || {}).page || 1) - 1 + (ui.lecteur.decalage || 0)));
  }catch(e){ ui.lecteur = null; toast(T.lecteur.illisible); }
  enregistrer(); rendre();
}
const decouperEnPages = t => { const P = [], paras = String(t).split(/\n\s*\n/); let cur = ""; paras.forEach(p => { if((cur + p).length > 2800 && cur){ P.push(cur.trim()); cur = ""; } cur += p + "\n\n"; }); if(cur.trim()) P.push(cur.trim()); return P; };
const pageImprimee = () => ui.lecteur.i + 1 - (ui.lecteur.decalage || 0);
function lecteurHtml(){
  const R = ui.lecteur, L = T.lecteur, s = sourceDe(R.sid);
  if(!R.pages) return `<section class="cbloc clecteur"><p>${esc(L.chargement)}</p></section>`;
  return `<section class="cbloc clecteur" aria-label="${esc(nomCourt(s))}"><div class="row clbar"><b>${esc(nomCourt(s))}</b>
    <button class="btn small" type="button" data-c="page-" aria-label="${esc(L.precedente)}" ${R.i ? "" : "disabled"}>←</button><span>${esc(L.page)} ${pageImprimee()} <span class="legend">(${R.i + 1}/${R.pages.length})</span></span><button class="btn small" type="button" data-c="page+" aria-label="${esc(L.suivante)}" ${R.i < R.pages.length - 1 ? "" : "disabled"}>→</button>
    <label class="legend">${esc(L.decalage)} ${esc(L.plus)}<input data-c-decalage inputmode="numeric" value="${-(R.decalage || 0)}" size="3"></label>
    <button class="btn small" type="button" data-c="fermer-lecteur">${esc(L.fermer)}</button></div>
    <div class="cpagetexte" id="cPageTexte" tabindex="0">${esc(R.pages[R.i]).replace(/\n{2,}/g, "</p><p>").replace(/^/, "<p>").replace(/$/, "</p>").replace(/\n/g, " ")}</div>
    <div class="csel" id="cSel" hidden><button class="btn small primary" type="button" data-c="sel-citer">${esc(L.citer)}</button><button class="btn small" type="button" data-c="sel-idee">${esc(L.idee)}</button></div>
    <p class="legend">${esc(L.aide)}</p></section>`;
}
function allerPage(k){
  const R = ui.lecteur; R.i = Math.max(0, Math.min(R.pages.length - 1, k));
  noterPages(R.sid, Math.max(+(donnees().lectures[R.sid] || {}).page || 0, pageImprimee())); enregistrer(); rendre();
  const t = box.querySelector("#cPageTexte"); if(t) t.scrollIntoView({block: "nearest"});
}

// ---------- onglet Fiches ----------
function carteFiche(n){
  const s = sourceDe(n.source), F = T.fiches, ps = partiesValides(n);
  if(ui.edition === n.id) return `<li class="cfiche"><form data-c-form="edition" data-n="${n.id}">
    <label class="f full">${esc(T.types[n.type])}<textarea name="texte" rows="4">${esc(n.texte)}</textarea></label>
    <div class="cchamps"><label class="f">Type<select name="type">${C.TYPES.map(t => `<option value="${t}"${n.type === t ? " selected" : ""}>${esc(T.types[t])}</option>`).join("")}</select></label>
      <label class="f">${esc(T.saisie.source)}<select name="source">${optionsSources(n.source || "")}</select></label>
      <label class="f cpage">${esc(T.saisie.page)}<input name="page" value="${esc(n.page || "")}"></label></div>
    <fieldset class="cparties"><legend>${esc(F.parties)}</legend>${partiesU().map(it => `<label><input type="checkbox" name="p" value="${esc(it.id)}"${ps.includes(it.id) ? " checked" : ""}> ${esc(it.t)}</label>`).join("")}</fieldset>
    <label class="f full">${esc(F.themes)}<input name="themes" value="${esc((n.themes || []).join(", "))}"></label>
    <label class="f full">${esc(F.commentaire)}<textarea name="commentaire" rows="2">${esc(n.commentaire || "")}</textarea></label>
    <div class="row"><button class="btn small primary" type="submit">${esc(F.enregistrer)}</button><button class="btn small" type="button" data-c="annuler-edition">${esc(F.annuler)}</button></div></form></li>`;
  const proche = n.type === "paraphrase" && C.paraphraseTropProche(n.texte, donnees().notes.filter(x => x.type === "citation" && x.source === n.source));
  let h = `<li class="cfiche${n.epingle ? " epinglee" : ""}${n.utilisee ? " utilisee" : ""}"><div class="cf1"><span class="ctype t-${n.type}">${esc(T.types[n.type])}</span>${s ? `<span class="csrc">${esc(nomCourt(s))}${n.page ? ", p. " + esc(n.page) : ""}</span>` : ""}${n.utilisee ? `<span class="tag ok">${esc(F.utilisee)}</span>` : ""}</div>
    <p class="ctexte">${n.type === "citation" ? "« " + esc(n.texte) + " »" : esc(n.texte)}</p>${n.commentaire ? `<p class="ccomm">${esc(n.commentaire)}</p>` : ""}
    ${proche ? `<p class="note">${esc(remplir(F.trop_proche, proche))}</p>` : ""}
    <div class="cf2">${ps.map(p => `<span class="cpart">${esc(titrePartie(p).slice(0, 40))}</span>`).join("")}${(n.themes || []).map(t => `<button class="cth" type="button" data-c="theme" data-t="${esc(t)}">#${esc(t)}</button>`).join("")}</div>
    <div class="cact"><button class="link" type="button" data-c="modifier" data-n="${n.id}">${esc(F.modifier)}</button><button class="link" type="button" data-c="voisines" data-n="${n.id}">${esc(F.voisines)}</button><button class="link" type="button" data-c="epingler" data-n="${n.id}">${esc(n.epingle ? F.desepingler : F.epingler)}</button><button class="link" type="button" data-c="supprimer" data-n="${n.id}">${esc(F.supprimer)}</button></div>`;
  if(ui.voisines === n.id){ const V = C.voisines(n, donnees().notes); h += V.length ? `<ul class="cvois">${V.map(v => `<li><span class="ctype t-${v.note.type}">${esc(T.types[v.note.type])}</span> ${esc(v.note.texte.slice(0, 140))}</li>`).join("")}</ul>` : `<p class="legend">${esc(F.aucune_voisine)}</p>`; }
  return h + `</li>`;
}
function ongletFiches(){
  const c = donnees(), F = T.fiches, f = ui.filtres;
  let h = saisieHtml();
  const themes = C.themesTous(c.notes);
  h += `<section class="cbloc cfiltres">${titreBloc("loupe", "violet", T.fiches.chercher)}<label class="f full"><span class="sr">${esc(T.fiches.chercher)}</span><input type="search" id="cRecherche" value="${esc(ui.q)}" placeholder="${esc(F.chercher_aide)}"></label>
    <div class="cchamps"><select data-c-filtre="type" aria-label="Type"><option value="">${esc(F.tous_types)}</option>${C.TYPES.map(t => `<option value="${t}"${f.type === t ? " selected" : ""}>${esc(T.types[t])}</option>`).join("")}</select>
    <select data-c-filtre="partie" aria-label="${esc(F.parties)}"><option value="">${esc(F.toutes_parties)}</option><option value="aucune"${f.partie === "aucune" ? " selected" : ""}>${esc(F.a_classer)}</option>${partiesU().map(it => `<option value="${esc(it.id)}"${f.partie === it.id ? " selected" : ""}>${esc(it.t)}</option>`).join("")}</select>
    <select data-c-filtre="theme" aria-label="Thème"><option value="">${esc(F.tous_themes)}</option>${themes.filter(t => t.perso).map(t => `<option value="${esc(t.libelle)}"${f.theme === t.libelle ? " selected" : ""}>#${esc(t.libelle)}</option>`).join("")}</select>
    <select data-c-filtre="source" aria-label="Source"><option value="">${esc(F.toutes_sources)}</option>${[...new Set(c.notes.map(n => n.source).filter(Boolean))].map(sourceDe).filter(Boolean).map(s => `<option value="${esc(s.id)}"${f.source === s.id ? " selected" : ""}>${esc(nomCourt(s))}</option>`).join("")}</select>
    <label class="cchk"><input type="checkbox" data-c-filtre="inutilisees"${f.inutilisees ? " checked" : ""}> ${esc(F.inutilisees)}</label></div></section>`;
  const R = C.rechercher(c.notes, state.sources, ui.q, f);
  h += `<p class="legend" aria-live="polite">${esc(remplir(F.n, {n: R.length}))}</p>`;
  h += !c.notes.length ? `<p class="legend">${esc(F.vide)}</p>` : R.length ? `<ul class="cfiches">${R.slice(0, 200).map(carteFiche).join("")}</ul>` : `<p class="legend">${esc(F.aucune)}</p>`;
  h += `<div class="row cexports"><button class="btn small" type="button" data-c="word">${esc(F.export_word)}</button><button class="btn small" type="button" data-c="excel">${esc(F.export_excel)}</button></div>`;
  return h;
}

// ---------- onglet Thèmes ----------
function ongletThemes(){
  const c = donnees(), Th = T.themes, L = C.themesTous(c.notes);
  if(!L.length) return `<p class="legend">${esc(Th.vide)}</p>`;
  return `<p class="legend">${esc(Th.intro)}</p><ul class="cthemes">${L.map(t => {
    const par = {}; t.notes.forEach(nid => { const n = c.notes.find(x => x.id === nid); (n ? partiesValides(n) : []).forEach(p => par[p] = (par[p] || 0) + 1); });
    const top = Object.entries(par).sort((a, b) => b[1] - a[1])[0];
    return `<li><button type="button" class="ctheme" data-c="voir-theme" data-t="${esc(t.perso ? "#" + t.libelle : t.libelle.split(" · ")[0])}"><b>${t.perso ? "#" : ""}${esc(t.libelle)}</b><span class="cnb">${t.notes.length}</span><span class="legend">${esc(t.perso ? Th.perso : Th.auto)}${top ? " · " + esc(remplir(Th.surtout, {partie: titrePartie(top[0]).slice(0, 40)})) : ""}</span></button></li>`; }).join("")}</ul>`;
}

// ---------- onglet Vers la rédaction ----------
function ongletRedaction(){
  const c = donnees(), R = T.redaction, cal = calendrierCourant(), cov = C.couverture(items(), c.notes, c.lectures), o = state.maRedac && state.maRedac.objectif;
  if(!partiesU().length) return `<p class="note">${esc(T.sans_plan)}</p><button class="btn small primary" type="button" data-c="plan">${esc(T.faire_plan)}</button>`;
  let h = `<p class="legend">${esc(R.intro)}</p>`;
  h += `<p><b>${esc(R.ordre)}</b> : ${cal.ordreRedaction.map(pid => esc(titrePartie(pid))).join(" → ")}</p>`;
  h += o ? `<div class="row"><button class="btn small" type="button" data-c="caler">${esc(R.caler)}</button></div>` : `<p class="note">${esc(R.fixer)} <button class="link" type="button" data-c="objectif">${esc(R.fixer_bouton)}</button></p>`;
  h += `<ul class="cchaps">`;
  cov.forEach(x => {
    const ch = cal.chapitres.find(y => y.id === x.id);
    h += `<li class="e-${x.etat} n${x.n}"><div class="cch1"><b>${esc(x.titre)}</b><span class="cetat">${esc(R.etats[x.etat])}</span></div>
      <span class="cbarre" aria-hidden="true"><i style="width:${Math.round(x.progression * 100)}%"></i></span>
      <p class="legend">${esc(remplir(R.resume, {fiches: x.fiches, sources: x.sources, alire: x.aLire.length}))}${ch ? " · " + esc(remplir(T.lectures.lire_avant, {date: dateCourte(ch.lireAvant)})) + (ch.rediger ? " · " + esc(remplir(T.lectures.rediger, {du: dateCourte(ch.rediger.du), au: dateCourte(ch.rediger.au)})) : "") : ""}</p>
      ${x.manques.length && x.etat !== "vide" ? `<p class="legend">${x.manques.map(m => esc(R.manques[m])).join(" ")}</p>` : ""}
      <div class="row"><button class="btn small" type="button" data-c="voir-partie" data-p="${esc(x.id)}">${esc(R.voir)}</button>${x.fiches > 1 ? `<button class="btn small" type="button" data-c="organiser" data-p="${esc(x.id)}">${esc(R.organiser)}</button>` : ""}<button class="btn small primary" type="button" data-c="rediger" data-p="${esc(x.id)}">${esc(R.rediger)}</button></div>
      ${ui.organiser === x.id ? filHtml(x.id) : ""}</li>`;
  });
  return h + `</ul><div class="row cexports"><button class="btn small" type="button" data-c="word">${esc(T.fiches.export_word)}</button><button class="btn small" type="button" data-c="excel">${esc(T.fiches.export_excel)}</button></div>`;
}
function filHtml(pid){
  const D = C.dossier(pid, donnees().notes);
  return `<div class="cfil"><p class="legend">${esc(T.redaction.fil)}</p><ol>${D.map((n, i) => `<li><span class="ctype t-${n.type}">${esc(T.types[n.type])}</span> <span>${esc(n.texte.slice(0, 120))}</span><span class="cfilbt"><button type="button" data-c="fil-haut" data-n="${n.id}" data-p="${esc(pid)}" aria-label="Monter" ${i ? "" : "disabled"}>↑</button><button type="button" data-c="fil-bas" data-n="${n.id}" data-p="${esc(pid)}" aria-label="Descendre" ${i < D.length - 1 ? "" : "disabled"}>↓</button></span></li>`).join("")}</ol><button class="btn small" type="button" data-c="organiser" data-p="">${esc(T.redaction.fermer)}</button></div>`;
}
function deplacerFil(pid, nid, sens){
  const D = C.dossier(pid, donnees().notes), i = D.findIndex(n => n.id === nid), j = i + sens; if(i < 0 || j < 0 || j >= D.length) return;
  [D[i], D[j]] = [D[j], D[i]]; D.forEach((n, k) => { n.ordre = n.ordre || {}; n.ordre[pid] = k; }); enregistrer(); rendre();
}

// ---------- dossier de fiches dans la Rédaction ----------
function rendreDossier(){
  const el = document.getElementById("carnetDossier"); if(!el) return;
  const c = state.carnet; if(!c || !(c.notes || []).length){ el.hidden = true; return; }
  el.hidden = false;
  const P = partiesU(), pid = P.some(it => it.id === ui.partieDossier) ? ui.partieDossier : (P[0] || {}).id;
  const D = pid ? C.dossier(pid, c.notes) : [], Dt = T.dossier;
  el.innerHTML = `<details${ui.dossierOuvert ? " open" : ""}><summary>${med("plume", "cyan")}<b>${esc(Dt.titre)}</b> <span class="cnb">${D.length}</span></summary>
    ${P.length ? `<label class="f">${esc(Dt.choisir)}<select data-c-dossier>${P.map(it => `<option value="${esc(it.id)}"${it.id === pid ? " selected" : ""}>${esc(it.t)}</option>`).join("")}</select></label>` : ""}
    ${D.length ? `<ol class="cdos">${D.map(n => { const s = sourceDe(n.source); return `<li class="${n.utilisee ? "utilisee" : ""}"><span class="ctype t-${n.type}">${esc(T.types[n.type])}</span> <span class="ctexte">${esc(n.texte.slice(0, 220))}${n.texte.length > 220 ? "…" : ""}</span>${s ? ` <span class="csrc">${esc(nomCourt(s))}${n.page ? ", p. " + esc(n.page) : ""}</span>` : ""}${n.utilisee ? ` <span class="legend">${esc(Dt.utilisee)}</span>` : ""} <button class="btn small" type="button" data-c-inserer="${n.id}">${esc(Dt.inserer)}</button></li>`; }).join("")}</ol>` : `<p class="legend">${esc(Dt.vide)}</p>`}
    <button class="link" type="button" data-c-ouvrir>${esc(Dt.ouvrir)}</button></details>`;
  el.querySelector("details").ontoggle = e => { ui.dossierOuvert = e.target.open; };
  const sel = el.querySelector("[data-c-dossier]"); if(sel) sel.onchange = () => { ui.partieDossier = sel.value; rendreDossier(); };
  el.querySelector("[data-c-ouvrir]").onclick = () => setView("carnet");
  el.querySelectorAll("[data-c-inserer]").forEach(b => b.onclick = () => inserer(b.dataset.cInserer));
}
function inserer(nid){
  const n = (state.carnet.notes || []).find(x => x.id === nid), ta = document.getElementById("draft"); if(!n || !ta) return;
  const txt = C.insertion(n, appel(n)), a = ta.selectionStart ?? ta.value.length, b = ta.selectionEnd ?? a;
  const avant = ta.value.slice(0, a), sep = avant && !/\s$/.test(avant) ? " " : "";
  ta.setRangeText(sep + txt + " ", a, b, "end"); ta.dispatchEvent(new Event("input", {bubbles: true}));
  n.utilisee = true; n.modifie = Date.now(); enregistrer(); rendreDossier(); toast(T.dossier.inseree);
}

// ---------- exports ----------
function exporterWord(){
  const c = donnees(), W = T.word, groupes = [...partiesU().map(it => ({titre: it.t, n: it.n, notes: C.dossier(it.id, c.notes)})), {titre: W.a_classer, n: 1, notes: c.notes.filter(n => !partiesValides(n).length)}].filter(g => g.notes.length);
  const titre = ((state.projects[state.current] || {}).name || T.titre);
  const fiche = n => { const s = sourceDe(n.source); return `<p style="margin:0 0 4pt"><b>${esc(T.types[n.type])}</b>${s ? ` · ${esc(nomCourt(s))}${n.page ? ", " + W.page + " " + esc(n.page) : ""}` : ""}${(n.themes || []).length ? ` · ${n.themes.map(t => "#" + esc(t)).join(" ")}` : ""}</p><p style="margin:0 0 4pt;text-align:justify">${n.type === "citation" ? "« " + esc(n.texte) + " »" : esc(n.texte)}</p>${n.commentaire ? `<p style="margin:0 0 4pt;color:#555"><i>${esc(n.commentaire)}</i></p>` : ""}<p style="margin:0 0 10pt">&nbsp;</p>`; };
  const ref = [...new Set(c.notes.map(n => n.source).filter(Boolean))].map(sourceDe).filter(Boolean).sort((a, b) => nomCourt(a).localeCompare(nomCourt(b), "fr"));
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${esc(W.titre)}</title></head><body style="font-family:'Times New Roman',serif;font-size:12pt">
    <p style="font-size:16pt;font-weight:bold">${esc(W.titre)} : ${esc(titre)}</p>
    ${groupes.map(g => `<p style="font-size:${g.n > 1 ? 12.5 : 14}pt;font-weight:bold;margin:16pt 0 8pt">${esc(g.titre)}</p>${g.notes.map(fiche).join("")}`).join("")}
    ${ref.length ? `<p style="font-size:14pt;font-weight:bold;margin:18pt 0 8pt">Références</p>${ref.map(s => `<p style="margin:0 0 6pt 1.25cm;text-indent:-1.25cm">${bibFor(s)}</p>`).join("")}` : ""}</body></html>`;
  saveWord(("fiches-" + titre).replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 50), html);
}
async function exporterExcel(){
  const c = donnees(), JSZip = window.JSZip || await waitFor("JSZip"); if(!JSZip || !window.MaRedaction){ toast("Excel : réessaie une fois connecté."); return; }
  const feuilles = C.classeur(c, items(), state.sources, nomCourt, {...T.excel, types: T.types, statuts: T.lectures.statuts, etats: T.redaction.etats});
  const z = new JSZip(); Object.entries(MaRedaction.xlsxFichiers({feuilles})).forEach(([p, x]) => z.file(p, x));
  const blob = await z.generateAsync({type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
  download(`${T.excel.fichier}-${auj()}.xlsx`, blob, blob.type);
}

// ---------- mode promenade ----------
function promenadeHtml(){
  const P = T.promenade, n = donnees().notes.filter(x => x.origine === "promenade" && x.cree > (ui.promenadeDepuis || 0)).length;
  return `<div class="cpromenade" role="dialog" aria-label="${esc(P.titre)}"><h2>${esc(P.titre)}</h2><p class="legend">${esc(P.aide)}</p>
    <textarea id="cPromTexte" rows="6"></textarea>
    <div class="row">${window.SpeechRecognition || window.webkitSpeechRecognition ? `<button class="btn" type="button" data-c="prom-dicter">${esc(T.saisie.dicter)}</button>` : `<span class="legend">${esc(P.sans_micro)}</span>`}<button class="btn primary" type="button" data-c="prom-noter">${esc(P.noter)}</button></div>
    <p class="legend" aria-live="polite">${esc(remplir(P.notees, {n}))}</p><button class="btn small" type="button" data-c="prom-fin">${esc(P.terminer)}</button></div>`;
}

// ---------- rendu ----------
// ce que le chercheur est en train d’écrire survit à tout nouvel affichage (sauvegarde, synchronisation, autre module) ;
// seul l’enregistrement d’une fiche vide la zone de saisie (ui.vider)
function garderSaisie(){
  if(ui.vider){ ui.vider = false; return null; }
  const v = sel => { const e = box.querySelector(sel); return e ? e.value : null; }, a = document.activeElement;
  const g = {texte: v("#cTexte"), source: v("#cSource"), page: v("#cPage"), partie: v("#cPartie"), extraits: v("#cExtraits"), promenade: v("#cPromTexte"), actif: a && box.contains(a) ? a.id : null, debut: a && a.selectionStart, fin: a && a.selectionEnd};
  return g.texte || g.extraits || g.promenade ? g : null;
}
function rendreSaisie(g){
  if(!g) return;
  const mettre = (sel, x) => { const e = box.querySelector(sel); if(e && x !== null && x !== undefined && x !== "") e.value = x; };
  mettre("#cTexte", g.texte); mettre("#cSource", g.source); mettre("#cPage", g.page); mettre("#cPartie", g.partie); mettre("#cExtraits", g.extraits); mettre("#cPromTexte", g.promenade);
  if(g.extraits){ const d = box.querySelector(".cextraits"); if(d) d.open = true; }
  const e = g.actif && document.getElementById(g.actif);
  if(e && box.contains(e)){ e.focus(); try{ if(g.debut !== null && g.debut !== undefined) e.setSelectionRange(g.debut, g.fin); }catch(_){} }
  if(g.texte) analyserSaisieEnDirect();
}
function rendre(){
  if(typeof state === "undefined") return;
  const c = donnees();
  if(ui.promenade){ const g = garderSaisie(); box.innerHTML = promenadeHtml(); lier(); const t = box.querySelector("#cPromTexte"); if(t) t.focus(); rendreSaisie(g); return; }
  let h = `<h1>${esc(T.titre)}</h1><p class="lead">${esc(T.intro)}</p>`;
  if(!partiesU().length) h += `<p class="note">${esc(T.sans_plan)} <button class="link" type="button" data-c="plan">${esc(T.faire_plan)}</button></p>`;
  h += `<div class="mr-onglets c-onglets" role="tablist">${Object.entries(T.onglets).map(([k, v]) => `<button type="button" role="tab" aria-selected="${ui.onglet === k}" data-c-onglet="${k}">${esc(v)}${k === "fiches" && c.notes.length ? ` <span class="cnb">${c.notes.length}</span>` : ""}</button>`).join("")}</div>`;
  h += `<div class="c-corps">${ui.onglet === "lectures" ? ongletLectures() : ui.onglet === "fiches" ? ongletFiches() : ui.onglet === "themes" ? ongletThemes() : ui.onglet === "redaction" ? ongletRedaction() : ongletJour()}</div>`;
  const focus = document.activeElement && box.contains(document.activeElement) && document.activeElement.id === "cRecherche";
  const garde = garderSaisie();
  box.innerHTML = h; lier();
  rendreSaisie(garde);
  if(focus){ const r = box.querySelector("#cRecherche"); r.focus(); r.setSelectionRange(r.value.length, r.value.length); }
  if(pretesAvant === null) verifierPartiesPretes();
}
function lier(){
  const c = donnees();
  box.querySelectorAll("[data-c-onglet]").forEach(b => b.onclick = () => { ui.onglet = b.dataset.cOnglet; ui.edition = null; rendre(); });
  const f = box.querySelector('[data-c-form="saisie"]');
  if(f){
    const ta = f.querySelector("#cTexte"); let t;
    ta.oninput = () => { clearTimeout(t); t = setTimeout(analyserSaisieEnDirect, 250); };
    ta.onkeydown = e => { if(e.key === "Enter" && (e.ctrlKey || e.metaKey)){ e.preventDefault(); noterDepuisSaisie(); } };
    f.querySelector("#cPartie").onchange = () => { partieChoisieMain = true; };
    f.querySelector("#cSource").onchange = () => { sourceChoisieMain = true; };
    f.onsubmit = e => { e.preventDefault(); noterDepuisSaisie(); };
    if(ui.prefill && ui.prefill.texte) analyserSaisieEnDirect();
    ui.prefill = ui.prefill ? {source: ui.prefill.source, partie: ui.prefill.partie} : null;
  }
  const rech = box.querySelector("#cRecherche"); if(rech){ let t; rech.oninput = () => { clearTimeout(t); t = setTimeout(() => { ui.q = rech.value; rendre(); }, 300); }; }
  box.querySelectorAll("[data-c-filtre]").forEach(s => s.onchange = () => { const k = s.dataset.cFiltre; ui.filtres[k] = s.type === "checkbox" ? s.checked : s.value; rendre(); });
  box.querySelectorAll("[data-c-ranger]").forEach(s => s.onchange = () => { const n = c.notes.find(x => x.id === s.dataset.cRanger); if(n && s.value){ n.parties = [s.value]; ui.rangerAutre = null; apresRangement(); } });
  box.querySelectorAll("[data-c-statut]").forEach(s => s.onchange = () => { const sid = s.dataset.cStatut; if(s.value === "lue"){ ui.retenu = sid; rendre(); return; } c.lectures[sid].statut = s.value; enregistrer(); rendre(); });
  box.querySelectorAll("[data-c-page]").forEach(i => i.onchange = () => { noterPages(i.dataset.cPage, i.value); enregistrer(); rendre(); });
  box.querySelectorAll("[data-c-total]").forEach(i => i.onchange = () => { c.lectures[i.dataset.cTotal].pages_total = Math.max(0, +i.value || 0) || null; enregistrer(); rendre(); });
  box.querySelectorAll("[data-c-prio]").forEach(s => s.onchange = () => { c.lectures[s.dataset.cPrio].priorite = +s.value; enregistrer(); rendre(); });
  box.querySelectorAll("[data-c-question]").forEach(i => i.onchange = () => { c.lectures[i.dataset.cQuestion].question = i.value.trim(); enregistrer(); });
  const fin = box.querySelector("[data-c-fin]"); if(fin) fin.onchange = () => { c.reglages.finLecture = fin.value || null; enregistrer(); rendre(); };
  const dec = box.querySelector("[data-c-decalage]"); if(dec) dec.onchange = () => { ui.lecteur.decalage = -(+dec.value || 0); const l = c.lectures[ui.lecteur.sid]; if(l) l.decalage = ui.lecteur.decalage; enregistrer(); rendre(); };
  box.querySelectorAll("form[data-c-form]").forEach(fm => { if(fm.dataset.cForm !== "saisie") fm.onsubmit = e => { e.preventDefault(); formulaire(fm); }; });
  box.querySelectorAll("[data-c]").forEach(b => b.onclick = () => action(b.dataset.c, b.dataset));
  const pt = box.querySelector("#cPageTexte");
  if(pt){ const montrer = () => { const s = window.getSelection(), ok = s && !s.isCollapsed && pt.contains(s.anchorNode) && s.toString().trim().length > 3; box.querySelector("#cSel").hidden = !ok; if(ok) ui.selection = s.toString().replace(/\s+/g, " ").trim(); };
    pt.onmouseup = montrer; pt.ontouchend = () => setTimeout(montrer, 50); pt.onkeyup = montrer; }
}
function apresRangement(){ enregistrer(); verifierPartiesPretes(); if(!donnees().notes.some(n => !partiesValides(n).length)) bravo(T.bravo.rangees); rendre(); }
function formulaire(fm){
  const c = donnees(), type = fm.dataset.cForm;
  if(type === "ajout"){ const sid = fm.querySelector("[name=s]").value; if(!sid) return; ajouterALire(sid, fm.querySelector("[name=p]").value); rendre(); return; }
  if(type === "retenu"){ const sid = fm.dataset.s, r = fm.querySelector("[name=r]").value.trim(), l = c.lectures[sid];
    l.statut = "lue"; l.fin = auj(); if(l.pages_total) noterPages(sid, l.pages_total);
    if(r) creerFiche({type: "resume", texte: r, source: sid, parties: (l.parties || []).filter(p => items().some(it => it.id === p))});
    ui.retenu = null; enregistrer(); bravo(T.bravo.lue); rendre(); return; }
  if(type === "edition"){ const n = c.notes.find(x => x.id === fm.dataset.n); if(!n) return;
    n.texte = fm.querySelector("[name=texte]").value.trim() || n.texte; n.type = fm.querySelector("[name=type]").value; n.source = fm.querySelector("[name=source]").value || null;
    n.page = fm.querySelector("[name=page]").value.trim(); n.parties = [...fm.querySelectorAll("[name=p]:checked")].map(x => x.value);
    n.themes = fm.querySelector("[name=themes]").value.split(",").map(x => x.trim().replace(/^#/, "")).filter(Boolean); n.commentaire = fm.querySelector("[name=commentaire]").value.trim(); n.modifie = Date.now();
    ui.edition = null; apresRangement(); return; }
}
function action(a, d){
  const c = donnees();
  const n = d.n ? c.notes.find(x => x.id === d.n) : null;
  if(a === "plan"){ setView("plan"); return; }
  if(a === "voir-fiches"){ ui.onglet = "fiches"; ui.q = ""; ui.filtres = {}; rendre(); return; }
  if(a === "voir-a-classer"){ ui.onglet = "fiches"; ui.q = ""; ui.filtres = {partie: "aucune"}; rendre(); return; }
  if(a === "voir-lectures"){ ui.onglet = "lectures"; rendre(); return; }
  if(a === "voir-redaction"){ ui.onglet = "redaction"; rendre(); return; }
  if(a === "objectif"){ setView("redac"); return; }
  if(a === "trouver"){ setView("plan"); return; }
  if(a === "dicter"){ dicterVers(box.querySelector("#cTexte"), box.querySelector('[data-c="dicter"]')); return; }
  if(a === "extraits"){ creerExtraits(); return; }
  if(a === "ranger" && n){ n.parties = [d.p]; apresRangement(); return; }
  if(a === "ranger-autre"){ ui.rangerAutre = d.n; rendre(); return; }
  if(a === "promenade"){ ui.promenade = true; ui.promenadeDepuis = Date.now(); rendre(); return; }
  if(a === "prom-dicter"){ dicterVers(box.querySelector("#cPromTexte"), box.querySelector('[data-c="prom-dicter"]')); return; }
  if(a === "prom-noter"){ const t = box.querySelector("#cPromTexte"), v = t.value.trim(); if(!v) return; const x = C.analyserSaisie(v); creerFiche({type: x.type, texte: x.texte, page: x.page, themes: x.themes, source: C.lierSource(x, state.sources), origine: "promenade"}); ui.vider = true; enregistrer(); rendre(); return; }
  if(a === "prom-fin"){ if(reco){ reco.stop(); reco = null; } ui.promenade = false; ui.onglet = "jour"; rendre(); return; }
  if(a === "lire"){ ui.onglet = "lectures"; choisirFichier(d.s); return; }
  if(a === "noter-source"){ ui.prefill = {source: d.s, partie: ((c.lectures[d.s] || {}).parties || [])[0] || ""}; sourceChoisieMain = true; ui.onglet = "fiches"; rendre(); const t = box.querySelector("#cTexte"); if(t){ t.focus(); t.scrollIntoView({block: "center"}); } return; }
  if(a === "finie"){ ui.retenu = d.s; rendre(); return; }
  if(a === "page-"){ allerPage(ui.lecteur.i - 1); return; }
  if(a === "page+"){ allerPage(ui.lecteur.i + 1); return; }
  if(a === "fermer-lecteur"){ ui.lecteur = null; rendre(); return; }
  if(a === "sel-citer" || a === "sel-idee"){ const R = ui.lecteur, l = c.lectures[R.sid] || {};
    ui.prefill = {texte: a === "sel-citer" ? `« ${ui.selection} » p. ${pageImprimee()}` : "", source: R.sid, page: String(pageImprimee()), partie: (l.parties || [])[0] || ""};
    sourceChoisieMain = true;
    if(a === "sel-citer"){ const x = C.analyserSaisie(ui.prefill.texte); creerFiche({type: "citation", texte: x.texte, source: R.sid, page: x.page, parties: ui.prefill.partie ? [ui.prefill.partie] : []}); enregistrer(); toast(T.types.citation + " ✓"); window.getSelection().removeAllRanges(); box.querySelector("#cSel").hidden = true; return; }
    ui.prefill.texte = `Sur « ${ui.selection.slice(0, 80)}${ui.selection.length > 80 ? "…" : ""} » (p. ${pageImprimee()}) : `;
    ui.onglet = "fiches"; rendre(); const t = box.querySelector("#cTexte"); if(t){ t.focus(); t.setSelectionRange(t.value.length, t.value.length); } return; }
  if(a === "modifier"){ ui.edition = d.n; rendre(); return; }
  if(a === "annuler-edition"){ ui.edition = null; rendre(); return; }
  if(a === "voisines"){ ui.voisines = ui.voisines === d.n ? null : d.n; rendre(); return; }
  if(a === "epingler" && n){ n.epingle = !n.epingle; enregistrer(); rendre(); return; }
  if(a === "supprimer" && n){ const i = c.notes.indexOf(n); c.notes.splice(i, 1); enregistrer(); rendre(); toast(T.fiches.supprimee, T.fiches.annuler, () => { c.notes.splice(i, 0, n); enregistrer(); rendre(); }); return; }
  if(a === "theme"){ ui.onglet = "fiches"; ui.q = "#" + d.t; ui.filtres = {}; rendre(); return; }
  if(a === "voir-theme"){ ui.onglet = "fiches"; ui.q = d.t; ui.filtres = {}; rendre(); return; }
  if(a === "voir-partie"){ ui.onglet = "fiches"; ui.q = ""; ui.filtres = {partie: d.p}; rendre(); return; }
  if(a === "organiser"){ ui.organiser = d.p || null; rendre(); return; }
  if(a === "fil-haut"){ deplacerFil(d.p, d.n, -1); return; }
  if(a === "fil-bas"){ deplacerFil(d.p, d.n, 1); return; }
  if(a === "rediger"){ const ch = C.chapitres(items()).find(x => x.id === d.p || x.ids.includes(d.p)); ui.partieDossier = d.p; ui.dossierOuvert = true; setView("redac"); rendreDossier();
    if(state.maRedac && state.maRedac.objectif && window.MaRedactionUI && ch){ const sel = document.querySelector("#maRedac [data-mr-section]"); if(sel){ const k = {introduction: "introduction", conclusion: "conclusion"}[ch.nature]; if(k){ sel.value = k; sel.dispatchEvent(new Event("change")); } } }
    const el = document.getElementById("carnetDossier"); if(el) el.scrollIntoView({block: "start"}); return; }
  if(a === "caler"){ const o = state.maRedac.objectif; state.maRedac.sous = C.sousObjectifsDuPlan(items(), o.pages_cibles); enregistrer(); toast(T.redaction.calees); if(typeof renderMaRedac === "function") renderMaRedac(); return; }
  if(a === "word"){ exporterWord(); return; }
  if(a === "excel"){ exporterExcel(); return; }
}
function choisirFichier(sid){
  const i = document.createElement("input"); i.type = "file"; i.accept = ".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";
  i.onchange = () => { if(i.files[0]) ouvrirDocument(sid, i.files[0]); else rendre(); };
  ui.lecteurAttente = sid; rendre(); i.click();
}

// ---------- démarrage ----------
window.CarnetUI = {ui, rendre, rendreDossier, donnees, ajouterALire, inserer, ouvrirDocument, T,
  planChange(){ if(document.body.dataset.view === "carnet") rendre(); rendreDossier(); },
  statutLecture(sid){ const l = state.carnet && state.carnet.lectures && state.carnet.lectures[sid]; return l ? (l.statut === "lue" ? T.lectures.statuts.lue : "Dans ta liste de lecture") : ""; }};
if(document.body.dataset.view === "carnet") rendre();
rendreDossier();
})();
