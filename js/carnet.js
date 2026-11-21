/* SCIENTUS : CARNET DE RECHERCHE, moteur (2026-11-21).
   Lire, noter, ranger, puis rédiger : le plan du travail est la colonne vertébrale commune.
   Chaque lecture et chaque fiche sont rattachées à des parties du plan ; la planification des lectures suit le
   calendrier de rédaction (on lit pour une partie avant de la rédiger) ; à la fin, chaque partie a son dossier
   de fiches, prêt pour la rédaction.
   Tout est calculé sur l’appareil, sans service payant ni IA externe : analyse des mots (racines, poids TF-IDF,
   similarité cosinus), regroupement en thèmes, recherche, détection des doublons et des paraphrases trop proches.
   SCIENTUS ne rédige rien : il range, relie et retrouve ce que le chercheur a lu et noté. Fonctions pures. */
(function(racine){
"use strict";

// ================= mots =================
const MOTS_VIDES = new Set(("au aux avec ce ces cet cette dans de des du elle elles en et eux il ils je la le les leur leurs lui ma mais me meme mes moi mon ne nos notre nous on ou par pas pour qu que qui sa se ses son sur ta te tes toi ton tu un une vos votre vous c d j l m n s t y a ete etre avoir ai as avons avez ont est sont etait etaient sera seront fait faire plus moins tres tout tous toute toutes autre autres aussi ainsi alors donc car comme si sans sous entre vers chez dont ou cela ceci celui celle ceux celles quand puis encore deja bien peu ici la-bas leur lorsque selon afin apres avant depuis pendant contre parmi chaque quelque quelques meme memes tel telle tels telles cest quil quelle dun dune lun lune nest sest "
  + "the a an and or of to in on for with by from at as is are was were be been being this that these those it its their there which who whom what when where how not no but if then than so such into about over under between through during before after also can could may might must shall should will would do does did has have had our we you your they them he she his her i me my").split(/\s+/));
const SANS_ACCENTS = t => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "");
const normaliser = t => SANS_ACCENTS(t).toLowerCase().replace(/[’']/g, " ").replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
// racinisation légère du français et de l’anglais : « identités », « identitaire » → « identit »
const SUFFIXES = ["issements", "issement", "atrices", "atrice", "ateurs", "ateur", "ations", "ation", "logies", "logie", "ements", "ement", "ments", "ment", "itaires", "itaire", "ites", "ite", "iques", "ique", "ismes", "isme", "istes", "iste", "ables", "able", "ances", "ance", "ences", "ence", "euses", "euse", "eurs", "eur", "ives", "ive", "ifs", "if", "elles", "elle", "els", "el", "aux", "ings", "ing", "ies", "es", "s", "e", "x"];
function racine_(mot){
  let m = mot; if(m.length <= 4) return m;
  for(const s of SUFFIXES) if(m.endsWith(s) && m.length - s.length >= 4){ m = m.slice(0, -s.length); break; }
  return m;
}
const mots = t => normaliser(t).split(" ").filter(m => m.length >= 3 && !MOTS_VIDES.has(m) && !/^\d+$/.test(m));
const termes = t => mots(t).map(racine_);
// forme lisible d’une racine : le mot le plus fréquent qui la produit
function formesLisibles(textes){
  const f = {};
  textes.forEach(t => (String(t || "").toLowerCase().match(/[\p{L}][\p{L}’'-]+/gu) || []).forEach(w => {
    const n = normaliser(w); if(n.length < 3 || MOTS_VIDES.has(n)) return; const r = racine_(n);
    (f[r] = f[r] || {})[w] = (f[r][w] || 0) + 1; }));
  const L = {}; Object.entries(f).forEach(([r, m]) => L[r] = Object.entries(m).sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)[0][0]); return L;
}

// ================= vecteurs =================
function idfDe(docs){
  const df = {}; docs.forEach(d => new Set(d).forEach(t => df[t] = (df[t] || 0) + 1));
  const N = Math.max(1, docs.length), idf = {}; Object.entries(df).forEach(([t, n]) => idf[t] = Math.log(1 + N / n)); return idf;
}
function vecteur(ts, idf, poids = 1){
  const v = {}; ts.forEach(t => v[t] = (v[t] || 0) + poids * (idf ? (idf[t] || Math.log(2)) : 1)); return v;
}
function ajouterA(v, w, k = 1){ Object.entries(w).forEach(([t, x]) => v[t] = (v[t] || 0) + k * x); return v; }
function cosinus(a, b){
  let p = 0, na = 0, nb = 0; for(const t in a){ na += a[t] * a[t]; if(b[t]) p += a[t] * b[t]; } for(const t in b) nb += b[t] * b[t];
  return na && nb ? p / Math.sqrt(na * nb) : 0;
}
const texteNote = n => [n.texte, n.commentaire, (n.themes || []).join(" ")].filter(Boolean).join(" ");

// ================= saisie : analyse d’une prise de note =================
const TYPES = ["citation", "paraphrase", "resume", "idee", "question", "definition", "donnee"];
// « citation … page 12 », « « … » p. 12 », « Définition : … », « ? » en fin, chiffres, #mots-clés, (Bourdieu, 1982)
function analyserSaisie(brut){
  let t = String(brut || "").trim(), type = null, page = "";
  const themes = [];
  t = t.replace(/(^|\s)#([\p{L}\p{N}_-]{2,40})/gu, (m, a, x) => { themes.push(x.replace(/_/g, " ")); return a; }).trim();
  // appel en fin de fiche, lu en premier : (Bourdieu, 1982, p. 60)
  let auteur = null, annee = null;
  const ref = t.match(/\(\s*([\p{Lu}][\p{L}’'-]+(?:\s+(?:et|&|and)\s+[\p{Lu}][\p{L}’'-]+)?)(?:\s+et\s+al\.)?\s*,\s*(\d{4}[a-z]?)\s*(?:,\s*(?:p\.|pp\.)\s*(\d+(?:\s*[-–]\s*\d+)?))?\s*\)\s*\.?$/u);
  if(ref){ auteur = ref[1]; annee = ref[2]; if(ref[3]) page = ref[3].replace(/\s+/g, "").replace("–", "-"); t = t.slice(0, ref.index).trim(); }
  const mp = t.match(/[,(\s]*\b(?:p\.|pp\.|page|pages)\s*(\d+(?:\s*[-–]\s*\d+)?)\s*\)?\s*\.?$/i);
  if(mp){ if(!page) page = mp[1].replace(/\s+/g, "").replace("–", "-"); t = t.slice(0, mp.index).trim(); }
  const cmd = t.match(/^(citation|paraphrase|r[ée]sum[ée]|id[ée]e|question|d[ée]finition|donn[ée]e|chiffre)\s*[:,-]?\s+/i);
  if(cmd){ const c = normaliser(cmd[1]); type = {citation: "citation", paraphrase: "paraphrase", resume: "resume", idee: "idee", question: "question", definition: "definition", donnee: "donnee", chiffre: "donnee"}[c]; t = t.slice(cmd[0].length); }
  const guillemets = t.match(/^[«"“]\s*([\s\S]+?)\s*[»"”]\s*\.?$/);
  if(guillemets){ t = guillemets[1]; type = type || "citation"; }
  if(!type){
    if(/\?\s*$/.test(t)) type = "question";
    else if(/^[\p{L}][\p{L}\s’'-]{1,40}\s*:\s+\S/u.test(t) && t.length < 400 && /^(le |la |les |l’|l')?[\p{L}’'-]+(\s[\p{L}’'-]+){0,3}\s*:/iu.test(t)) type = "definition";
    else if(/\d+([.,]\d+)?\s?(%|pour ?cent|millions?|milliards?|habitants|personnes|ans)(?=[\s.,;:)]|$)/i.test(t)) type = "donnee";
    else if(auteur) type = "paraphrase"; // l’idée d’un auteur, avec sa référence, sans guillemets
    else type = "idee";
  }
  return {type, texte: t.replace(/\s+/g, " ").trim(), page, themes, auteur, annee};
}
// rattacher une saisie à une source de la bibliographie : nom de l’auteur (sans accents) et année
function lierSource(a, sources){
  if(!a || !a.auteur) return null;
  const nom = normaliser(a.auteur.split(/\s+(?:et|&|and)\s+/)[0]);
  const L = (sources || []).filter(s => (s.authors || []).some(x => normaliser(x.family) === nom) && (!a.annee || String(s.year || "").slice(0, 4) === a.annee.slice(0, 4)));
  return L.length === 1 ? L[0].id : L.length ? (L.find(s => String(s.year) === a.annee) || L[0]).id : null;
}
// coller plusieurs extraits (surlignages d’un PDF, notes d’un carnet papier recopiées) : un bloc par paragraphe
function decouperExtraits(texte){
  return String(texte || "").split(/\n\s*\n|\r\n\s*\r\n/).map(b => b.replace(/\s*\n\s*/g, " ").trim()).filter(b => b.length > 2).map(analyserSaisie);
}

// ================= le plan : colonne vertébrale =================
const ESTRUBRIQUE = {introduction: /^(introduction|avant[- ]propos|preambule)\b/, conclusion: /^(conclusion|bilan|perspectives)\b/, annexe: /^(references|bibliographie|annexes?|sommaire|table|resume|abstract|remerciements|dedicace|sigles|index)\b/};
function natureDe(titre){
  const t = normaliser(String(titre || "").replace(/^\s*(?:(?:\d+|[IVX]+)(?:\.\d+)*\.?|[A-Z]\.)\s+/, ""));
  for(const [k, re] of Object.entries(ESTRUBRIQUE)) if(re.test(t)) return k;
  return "corps";
}
// parties qui reçoivent des lectures et des fiches (les références et annexes n’en reçoivent pas)
const partiesUtiles = items => (items || []).filter(it => !it.sans && natureDe(it.t) !== "annexe");
// partie de premier niveau de chaque partie (une sous-partie appartient à la partie qui la précède)
function chapitres(items){
  const out = []; let cur = null;
  partiesUtiles(items).forEach(it => { if(it.n <= 1 || !cur){ cur = {id: it.id, titre: it.t, nature: natureDe(it.t), ids: [it.id]}; out.push(cur); } else cur.ids.push(it.id); });
  return out;
}
// ordre de rédaction conseillé : le corps d’abord, puis la conclusion, l’introduction en dernier
// (on présente mieux ce qu’on a déjà écrit) ; l’ordre de LECTURE reste celui du plan
function ordreRedaction(chaps){
  const rang = c => c.nature === "introduction" ? 2 : c.nature === "conclusion" ? 1 : 0;
  return chaps.map((c, i) => ({c, i})).sort((a, b) => rang(a.c) - rang(b.c) || a.i - b.i).map(x => x.c);
}
// poids de chaque chapitre dans le document : introduction 10 %, conclusion 7 %, le reste partagé
function partsDuDocument(chaps){
  const corps = chaps.filter(c => c.nature === "corps").length || 1;
  const fixe = chaps.reduce((s, c) => s + (c.nature === "introduction" ? .10 : c.nature === "conclusion" ? .07 : 0), 0);
  return chaps.map(c => ({id: c.id, part: c.nature === "introduction" ? .10 : c.nature === "conclusion" ? .07 : (1 - fixe) / corps}));
}
// sous-objectifs de MA RÉDACTION calés sur le plan : mêmes titres, pages réparties selon le poids des chapitres
function sousObjectifsDuPlan(items, pagesTotal){
  const ch = chapitres(items), P = partsDuDocument(ch);
  return ch.map((c, i) => ({titre: c.titre, ordre: i + 1, pages_cibles: pagesTotal ? Math.max(1, Math.round(pagesTotal * P[i].part)) : null, partie: c.id}));
}

// ================= classement automatique d’une fiche =================
// profil d’une partie = son intitulé et sa consigne (poids 2) + les fiches que le chercheur y a déjà rangées (poids 1) :
// le classement apprend des choix du chercheur
function profilsParties(items, notes, idf){
  const P = {};
  partiesUtiles(items).forEach(it => { P[it.id] = vecteur(termes(it.t + " " + (it.r || "")).filter(x => !/^(titr|partie|chapitr|sous)$/.test(x)), idf, 2); });
  (notes || []).forEach(n => (n.parties || []).forEach(pid => { if(P[pid]) ajouterA(P[pid], vecteur(termes(texteNote(n)), idf), 1 / Math.max(1, (n.parties || []).length)); }));
  return P;
}
function suggererParties(note, items, notes, n = 3){
  const autres = (notes || []).filter(x => x.id !== note.id);
  const idf = idfDe([...autres.map(x => termes(texteNote(x))), ...partiesUtiles(items).map(it => termes(it.t + " " + (it.r || "")))]);
  const P = profilsParties(items, autres, idf), v = vecteur(termes(texteNote(note)), idf);
  const L = Object.entries(P).map(([id, p]) => ({id, score: cosinus(v, p)})).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, n);
  // confiance : un score net et un écart avec la suivante
  L.forEach((x, i) => x.sur = i === 0 && x.score >= .18 && (!L[1] || x.score - L[1].score >= .05));
  return L;
}

// ================= thèmes =================
// thèmes automatiques : les termes forts partagés par plusieurs fiches, regroupés quand ils vont ensemble
function themesAuto(notes, max = 12){
  const N = (notes || []).filter(n => n.texte);
  if(N.length < 2) return [];
  const docs = N.map(n => [...new Set(termes(texteNote(n)))]), idf = idfDe(docs), lis = formesLisibles(N.map(texteNote));
  const ou = {}; docs.forEach((d, i) => d.forEach(t => (ou[t] = ou[t] || new Set()).add(i)));
  let C = Object.entries(ou).filter(([t, s]) => s.size >= 2 && s.size <= Math.max(2, Math.ceil(N.length * .7)) && t.length >= 4)
    .map(([t, s]) => ({termes: [t], fiches: s, poids: s.size * (idf[t] || 1)})).sort((a, b) => b.poids - a.poids).slice(0, 60);
  // regroupement : deux termes qui apparaissent presque toujours ensemble forment un seul thème
  const jac = (a, b) => { let i = 0; a.forEach(x => b.has(x) && i++); return i / (a.size + b.size - i); };
  for(let fini = false; !fini;){
    fini = true;
    for(let i = 0; i < C.length && fini; i++) for(let j = i + 1; j < C.length; j++) if(jac(C[i].fiches, C[j].fiches) >= .6){
      C[i] = {termes: [...C[i].termes, ...C[j].termes], fiches: new Set([...C[i].fiches, ...C[j].fiches]), poids: C[i].poids + C[j].poids / 2}; C.splice(j, 1); fini = false; break; }
  }
  return C.sort((a, b) => b.poids - a.poids).slice(0, max).map(c => ({cle: c.termes[0], libelle: c.termes.slice(0, 2).map(t => lis[t] || t).join(" · "), notes: [...c.fiches].map(i => N[i].id), termes: c.termes}));
}
// tous les thèmes : ceux du chercheur (#mots-clés) d’abord, puis les automatiques qui ne les répètent pas
function themesTous(notes){
  const perso = {}; (notes || []).forEach(n => (n.themes || []).forEach(t => { const k = normaliser(t); (perso[k] = perso[k] || {cle: k, libelle: t, notes: [], perso: true}).notes.push(n.id); }));
  const P = Object.values(perso).sort((a, b) => b.notes.length - a.notes.length);
  const dejaVu = new Set(P.flatMap(p => termes(p.libelle)));
  return [...P, ...themesAuto(notes).filter(t => !t.termes.some(x => dejaVu.has(x)))];
}

// ================= recherche =================
// mots (racines, sans accents), « expressions exactes », #thème, type:citation, auteur:Bourdieu, partie non classée : -mot exclut
function rechercher(notes, sources, requete, filtres = {}){
  const q = String(requete || "");
  const exactes = [...q.matchAll(/"([^"]+)"|«\s*([^»]+?)\s*»/g)].map(m => normaliser(m[1] || m[2]));
  let reste = q.replace(/"[^"]*"|«[^»]*»/g, " ");
  const F = {...filtres}, exclus = [];
  reste = reste.replace(/(^|\s)(type|auteur|partie|source):(\S+)/gi, (m, a, k, v) => { F[k.toLowerCase()] = v; return " "; });
  reste = reste.replace(/(^|\s)#(\S+)/g, (m, a, v) => { F.theme = v; return " "; });
  reste = reste.replace(/(^|\s)-(\S{3,})/g, (m, a, v) => { exclus.push(racine_(normaliser(v))); return " "; });
  const T = termes(reste), S = {}; (sources || []).forEach(s => S[s.id] = s);
  const idf = idfDe(notes.map(n => termes(texteNote(n))));
  const out = [];
  for(const n of notes){
    const s = S[n.source], txt = normaliser(texteNote(n)), tn = new Set(termes(texteNote(n)));
    const meta = s ? normaliser([(s.authors || []).map(a => a.family).join(" "), s.year, s.title].join(" ")) : "";
    if(F.type && n.type !== F.type) continue;
    if(F.theme && !(n.themes || []).some(t => normaliser(t) === normaliser(F.theme)) && !tn.has(racine_(normaliser(F.theme)))) continue;
    if(F.auteur && !(s && (s.authors || []).some(a => normaliser(a.family).startsWith(normaliser(F.auteur))))) continue;
    if(F.source && n.source !== F.source) continue;
    if(F.partie === "aucune" ? (n.parties || []).length : F.partie && !(n.parties || []).includes(F.partie)) continue;
    if(F.inutilisees && n.utilisee) continue;
    if(exclus.some(x => tn.has(x))) continue;
    if(exactes.some(e => !txt.includes(e))) continue;
    let score = exactes.length * 3;
    for(const t of T){ if(tn.has(t)) score += 1 + (idf[t] || 0); else if(meta.split(" ").some(w => racine_(w) === t)) score += 1.5; else { score = -1; break; } }
    if(score < 0) continue;
    out.push({note: n, score: score + (n.epingle ? .5 : 0)});
  }
  return out.sort((a, b) => b.score - a.score || (b.note.modifie || 0) - (a.note.modifie || 0)).map(x => x.note);
}

// ================= liens entre fiches =================
function voisines(note, notes, n = 3){
  const autres = notes.filter(x => x.id !== note.id && x.texte); if(!autres.length) return [];
  const idf = idfDe([note, ...autres].map(x => termes(texteNote(x)))), v = vecteur(termes(texteNote(note)), idf);
  return autres.map(x => ({note: x, score: cosinus(v, vecteur(termes(texteNote(x)), idf))})).filter(x => x.score >= .2).sort((a, b) => b.score - a.score).slice(0, n);
}
// doublon : même source (ou sans source) et contenu presque identique
function doublon(note, notes){
  const t = normaliser(note.texte); if(t.length < 12) return null;
  for(const x of notes){ if(x.id === note.id || (x.source || null) !== (note.source || null)) continue;
    const u = normaliser(x.texte); if(u === t || (Math.min(u.length, t.length) > 30 && (u.includes(t) || t.includes(u)))) return x.id;
    if(cosinus(vecteur(termes(t)), vecteur(termes(u))) >= .9) return x.id; }
  return null;
}
// paraphrase trop proche de la citation d’origine : au moins 5 mots de suite repris tels quels (risque de plagiat)
function paraphraseTropProche(para, citations){
  const m = normaliser(para).split(" "); if(m.length < 5) return null;
  const g = new Set(); for(let i = 0; i + 5 <= m.length; i++) g.add(m.slice(i, i + 5).join(" "));
  for(const c of citations || []){ const w = normaliser(c.texte).split(" "); for(let i = 0; i + 5 <= w.length; i++) if(g.has(w.slice(i, i + 5).join(" "))) return {citation: c.id, extrait: w.slice(i, i + 5).join(" ")}; }
  return null;
}

// ================= couverture du plan : chaque partie est-elle prête à être rédigée ? =================
function couverture(items, notes, lectures){
  const L = lectures || {};
  return partiesUtiles(items).map(it => {
    const N = (notes || []).filter(n => (n.parties || []).includes(it.id));
    const sources = new Set(N.map(n => n.source).filter(Boolean));
    const types = {}; N.forEach(n => types[n.type] = (types[n.type] || 0) + 1);
    const aLire = Object.entries(L).filter(([id, l]) => (l.parties || []).includes(it.id) && l.statut !== "lue" && l.statut !== "abandonnee").map(([id]) => id);
    const lues = Object.entries(L).filter(([id, l]) => (l.parties || []).includes(it.id) && l.statut === "lue").length;
    const nat = natureDe(it.t), seuilN = nat === "corps" ? 6 : 3, seuilS = nat === "corps" ? 3 : 2;
    const etat = N.length >= seuilN && sources.size >= seuilS ? "prete" : N.length >= Math.ceil(seuilN / 2) || sources.size >= 2 ? "en_cours" : N.length ? "mince" : "vide";
    const manques = [];
    if(sources.size < seuilS) manques.push("sources");
    if(nat === "corps" && !types.citation && !types.paraphrase) manques.push("appui");
    if(nat === "introduction" && !types.definition && !types.question) manques.push("cadrage");
    return {id: it.id, titre: it.t, n: it.n, nature: nat, fiches: N.length, sources: sources.size, types, aLire, lues, etat, manques,
      utilisees: N.filter(n => n.utilisee).length, progression: Math.min(1, (Math.min(N.length / seuilN, 1) + Math.min(sources.size / seuilS, 1)) / 2)};
  });
}

// ================= planification des lectures, calée sur la rédaction =================
const ISO = d => new Date(Date.UTC(1970, 0, 1 + d)).toISOString().slice(0, 10);
const JOUR = iso => Math.round(Date.parse(iso + "T00:00:00Z") / 864e5);
const ouvre = (j, masque) => (masque >> ((new Date(Date.UTC(1970, 0, 1 + j)).getUTCDay() + 6) % 7)) & 1; // bit 0 = lundi
function joursOuvresEntre(d1, d2, masque = 31){ let n = 0; for(let j = JOUR(d1); j <= JOUR(d2); j++) if(ouvre(j, masque)) n++; return n; }
function nIemeJour(depuis, n, masque = 31){ let j = JOUR(depuis), k = 0; for(let g = 0; g < 4000; g++, j++) if(ouvre(j, masque) && ++k >= n) return ISO(j); return ISO(j); }
// pages restant à lire, avec une estimation raisonnable si le nombre de pages n’est pas connu
const PAGES_PAR_TYPE = {article: 20, chapter: 25, book: 180, thesis: 250, report: 40, web: 6, conference: 12};
function pagesRestantes(l, s){
  const total = +l.pages_total || (s && s.pages && /(\d+)\s*[-–]\s*(\d+)/.test(s.pages) ? (() => { const m = s.pages.match(/(\d+)\s*[-–]\s*(\d+)/); return Math.max(1, m[2] - m[1] + 1); })() : PAGES_PAR_TYPE[(s && s.type) || "article"] || 20);
  return {total, reste: Math.max(0, total - (+l.page || 0)), estime: !+l.pages_total};
}
/* Calendrier de recherche.
   - Rédaction : la période de MA RÉDACTION est partagée entre les chapitres selon leur poids, dans l’ordre de
     rédaction conseillé (corps, conclusion, introduction).
   - Lecture : chaque chapitre doit être lu AVANT le début de sa rédaction (« juste à temps ») ; les lectures
     d’un chapitre sont ordonnées par priorité puis dans l’ordre du plan ; une lecture qui sert plusieurs chapitres
     compte pour le premier rédigé.
   - Sans objectif de rédaction : on lit dans l’ordre du plan jusqu’à la date de fin de lecture choisie (ou en 6 semaines). */
function calendrier({items, lectures, sources, objectif, aujourdhui, finLecture, masque}){
  const S = {}; (sources || []).forEach(s => S[s.id] = s);
  const M = masque || (objectif && objectif.jours_travail) || 31;
  const ch = chapitres(items), poids = {}; partsDuDocument(ch).forEach(p => poids[p.id] = p.part);
  const debutRed = objectif && objectif.date_debut > aujourdhui ? objectif.date_debut : aujourdhui;
  const finRed = objectif && objectif.date_fin;
  // tranches de rédaction
  const red = {}, ordre = ordreRedaction(ch);
  if(finRed && finRed > debutRed){
    const total = joursOuvresEntre(debutRed, finRed, M); let fait = 0;
    ordre.forEach(c => { const n = Math.max(1, Math.round(total * poids[c.id])); red[c.id] = {du: nIemeJour(debutRed, fait + 1, M), au: nIemeJour(debutRed, Math.min(total, fait + n), M)}; fait += n; });
  }
  // échéance de lecture de chaque chapitre
  const finDefaut = finLecture || (objectif && objectif.date_debut > aujourdhui ? objectif.date_debut : ISO(JOUR(aujourdhui) + 42));
  const echeance = {}; ch.forEach(c => echeance[c.id] = red[c.id] ? (red[c.id].du > aujourdhui ? ISO(JOUR(red[c.id].du) - 1) : aujourdhui) : finDefaut);
  const chapDe = pid => ch.find(c => c.ids.includes(pid));
  // file de lecture : par échéance, puis priorité, puis « en cours » d’abord, puis ordre du plan
  const file = Object.entries(lectures || {}).filter(([id, l]) => l.statut !== "lue" && l.statut !== "abandonnee" && S[id]).map(([id, l]) => {
    const cs = (l.parties || []).map(chapDe).filter(Boolean);
    const c = cs.sort((a, b) => (echeance[a.id] < echeance[b.id] ? -1 : 1))[0];
    const p = pagesRestantes(l, S[id]);
    return {id, chapitre: c ? c.id : null, echeance: c ? echeance[c.id] : finDefaut, priorite: +l.priorite || 2, enCours: l.statut === "en_cours", ordre: c ? ch.indexOf(c) : 99, ...p};
  }).sort((a, b) => (a.echeance < b.echeance ? -1 : a.echeance > b.echeance ? 1 : 0) || b.enCours - a.enCours || a.priorite - b.priorite || a.ordre - b.ordre);
  // rythme : pour chaque échéance, les pages cumulées divisées par les jours de lecture disponibles ; on garde le plus exigeant
  let cumul = 0, rythme = 0, alerte = null;
  file.forEach(x => { cumul += x.reste; const j = Math.max(1, joursOuvresEntre(aujourdhui, x.echeance, M)); const r = cumul / j; if(r > rythme) rythme = r; if(x.echeance < aujourdhui) alerte = "retard"; });
  rythme = Math.ceil(rythme);
  if(rythme > 40) alerte = alerte || "trop";
  // dates prévues de chaque lecture à ce rythme
  let pages = 0; file.forEach(x => { x.debut = nIemeJour(aujourdhui, Math.floor(pages / Math.max(1, rythme)) + 1, M); pages += x.reste; x.fin = nIemeJour(aujourdhui, Math.max(1, Math.ceil(pages / Math.max(1, rythme))), M); x.aTemps = x.fin <= x.echeance; });
  return {chapitres: ch.map(c => ({id: c.id, titre: c.titre, nature: c.nature, lireAvant: echeance[c.id], rediger: red[c.id] || null, lectures: file.filter(x => x.chapitre === c.id).map(x => x.id)})),
    ordreRedaction: ordre.map(c => c.id), file, pagesParJour: rythme, alerte, finLecture: file.length ? file[file.length - 1].fin : null, sansPartie: file.filter(x => !x.chapitre).map(x => x.id)};
}
// lecture du jour : les pages à lire aujourd’hui, prises dans l’ordre de la file
function lectureDuJour(cal){
  let reste = cal.pagesParJour; const out = [];
  for(const x of cal.file){ if(reste <= 0) break; const p = Math.min(reste, x.reste); if(p > 0){ out.push({id: x.id, pages: p}); reste -= p; } }
  return out;
}

// ================= vers la rédaction =================
// dossier d’une partie : ses fiches dans l’ordre choisi par le chercheur (fil de l’argumentation), puis les autres
function dossier(pid, notes){
  return (notes || []).filter(n => (n.parties || []).includes(pid)).sort((a, b) => ((a.ordre || {})[pid] ?? 1e9) - ((b.ordre || {})[pid] ?? 1e9) || (a.cree || 0) - (b.cree || 0));
}
// texte inséré dans la rédaction : la fiche du chercheur et sa référence, jamais un texte inventé
function insertion(note, appel){
  const a = appel ? " " + appel : "";
  if(note.type === "citation") return `« ${note.texte.replace(/^[«"“]\s*|\s*[»"”]$/g, "")} »${a}`;
  if((note.type === "paraphrase" || note.type === "resume" || note.type === "donnee" || note.type === "definition") && appel) return `${note.texte.replace(/\s*\.$/, "")}${a}.`;
  return note.texte;
}
// sources lues sans aucune fiche, sources citées dans la rédaction sans fiche, fiches sans source
function verifications(notes, lectures, sources, texteRedaction){
  const S = new Set((notes || []).map(n => n.source).filter(Boolean));
  const luesSansFiche = Object.entries(lectures || {}).filter(([id, l]) => l.statut === "lue" && !S.has(id)).map(([id]) => id);
  const sansSource = (notes || []).filter(n => !n.source && (n.type === "citation" || n.type === "paraphrase" || n.type === "donnee")).map(n => n.id);
  const t = normaliser(texteRedaction || "");
  const citeesSansFiche = (sources || []).filter(s => !S.has(s.id) && (s.authors || [])[0] && s.year && t.includes(normaliser(s.authors[0].family)) && t.includes(String(s.year).slice(0, 4))).map(s => s.id);
  return {luesSansFiche, sansSource, citeesSansFiche};
}

// ================= exports =================
// classeur Excel (mêmes fonctions que MA RÉDACTION) : fiches, lectures, parties
function classeur(carnet, items, sources, nomSource, libelles){
  const S = {}; (sources || []).forEach(s => S[s.id] = s); const P = {}; (items || []).forEach(it => P[it.id] = it.t);
  const L = carnet.lectures || {}, cov = couverture(items, carnet.notes, L);
  return [
    {nom: libelles.fiches, lignes: [libelles.entetes_fiches, ...(carnet.notes || []).map(n => [libelles.types[n.type] || n.type, n.texte, n.source ? nomSource(S[n.source]) : "", n.page || "", (n.parties || []).map(p => P[p] || "").filter(Boolean).join(" ; "), (n.themes || []).join(" ; "), n.commentaire || "", n.utilisee ? libelles.oui : "", n.cree ? new Date(n.cree).toISOString().slice(0, 10) : ""])]},
    {nom: libelles.lectures, lignes: [libelles.entetes_lectures, ...Object.entries(L).filter(([id]) => S[id]).map(([id, l]) => [nomSource(S[id]), libelles.statuts[l.statut] || l.statut, +l.page || 0, +l.pages_total || "", (l.parties || []).map(p => P[p] || "").filter(Boolean).join(" ; "), l.question || "", (carnet.notes || []).filter(n => n.source === id).length])]},
    {nom: libelles.parties, lignes: [libelles.entetes_parties, ...cov.map(c => [c.titre, c.fiches, c.sources, c.aLire.length, libelles.etats[c.etat], c.utilisees])]}];
}

// ================= suivi : pages lues, série =================
function bilanLecture(sessions, aujourdhui){
  const parJour = {}; (sessions || []).forEach(s => parJour[s.date] = (parJour[s.date] || 0) + (+s.pages || 0));
  // série : jours de lecture consécutifs jusqu’à hier, plus aujourd’hui si on a déjà lu (la journée n’est pas finie)
  let serie = 0, j = JOUR(aujourdhui) - (parJour[aujourdhui] > 0 ? 0 : 1);
  while(parJour[ISO(j)] > 0 && serie < 3650){ serie++; j--; }
  const semaine = Object.entries(parJour).filter(([d]) => JOUR(d) > JOUR(aujourdhui) - 7).reduce((s, [, p]) => s + p, 0);
  return {aujourdhui: parJour[aujourdhui] || 0, semaine, serie, total: Object.values(parJour).reduce((s, p) => s + p, 0)};
}

const api = {MOTS_VIDES, normaliser, racine: racine_, mots, termes, formesLisibles, idfDe, vecteur, cosinus, TYPES, analyserSaisie, lierSource, decouperExtraits,
  natureDe, partiesUtiles, chapitres, ordreRedaction, partsDuDocument, sousObjectifsDuPlan, suggererParties, themesAuto, themesTous, rechercher, voisines,
  doublon, paraphraseTropProche, couverture, pagesRestantes, joursOuvresEntre, nIemeJour, calendrier, lectureDuJour, dossier, insertion, verifications,
  classeur, bilanLecture, PAGES_PAR_TYPE};
if(typeof module !== "undefined" && module.exports) module.exports = api; else racine.Carnet = api;
})(typeof window !== "undefined" ? window : globalThis);
