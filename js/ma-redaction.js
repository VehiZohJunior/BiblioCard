/* SCIENTUS — module MA RÉDACTION : objectifs de rédaction, anti-procrastination, plans de travail.
   Spécification : « SCIENTUS : spécification du module MA RÉDACTION » (2026-11-21).

   Ce fichier ne contient QUE des fonctions pures : pas de stockage, pas d’affichage, pas d’horloge cachée (la date du
   jour est toujours passée en paramètre). Elles sont testées seules (tests/test-ma-redaction.js), avant l’interface.

   Principe directeur : SCIENTUS organise, relance et mesure ; il n’écrit jamais le document à la place de
   l’utilisateur. Aucun texte destiné au document n’est produit ici : les messages sont dans textes/messages_fr.json.

   Dates : chaînes « AAAA-MM-JJ », dans le fuseau de l’utilisateur (Africa/Abidjan par défaut, UTC+0). Les calculs se
   font sur des numéros de jour, sans heure, donc sans décalage d’horaire d’été ni de fuseau.
   Jours de travail : masque de 7 bits, bit 0 = lundi … bit 6 = dimanche (lundi à vendredi = 0b0011111 = 31). */
(function(racine){
"use strict";

// ---------- dates ----------
const MS_JOUR = 86400000;
function versJour(iso){ const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso)); if(!m) throw new Error(`date invalide : ${iso}`); return Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / MS_JOUR); }
function versIso(j){ return new Date(j * MS_JOUR).toISOString().slice(0, 10); }
const jourSemaine = j => (j + 3) % 7; // 0 = lundi (le 1970-01-01, jour 0, était un jeudi)
function ajouterMois(iso, n){
  const [a, m, j] = iso.split("-").map(Number), total = (m - 1) + n, an = a + Math.floor(total / 12), mois = ((total % 12) + 12) % 12;
  const dernier = new Date(Date.UTC(an, mois + 1, 0)).getUTCDate();
  return versIso(Math.round(Date.UTC(an, mois, Math.min(j, dernier)) / MS_JOUR));
}
const LUN_VEN = 0b0011111;

// ---------- gabarits (section 1) : structure, volume indicatif, durée typique ; aucun texte rédigé ----------
const GABARITS = {
  memoire_licence: {nom: "Mémoire de licence", structure: ["Introduction", "Cadre théorique", "Méthode", "Résultats", "Discussion", "Conclusion"], pages: [40, 60], mois: [3, 6]},
  memoire_master: {nom: "Mémoire de master", structure: ["Introduction", "Cadre théorique", "Méthode", "Résultats", "Discussion", "Conclusion"], pages: [60, 100], mois: [6, 9]},
  rapport_stage: {nom: "Rapport de stage", structure: ["Présentation de l’entreprise", "Missions", "Analyse", "Bilan", "Annexes"], pages: [30, 60], mois: [2, 4]},
  article: {nom: "Article scientifique", structure: ["Résumé", "Introduction", "Méthode", "Résultats", "Discussion"], mots: [6000, 8000], mois: [2, 6]},
  these: {nom: "Thèse de doctorat", structure: ["Introduction générale", "Chapitres de recherche", "Discussion", "Conclusion"], pages: [250, 300], mois: [36, 48]},
  livre: {nom: "Livre", structure: [], pages: null, mois: null},
};
// valeurs proposées au formulaire quand on choisit un gabarit (point de départ, modifiable)
function depuisGabarit(type, motsParPage = 250){
  const g = GABARITS[type]; if(!g) throw new Error(`type inconnu : ${type}`);
  const pages = g.pages ? g.pages[1] : g.mots ? Math.ceil(g.mots[1] / motsParPage) : null;
  return {type_document: type, pages_cibles: pages, mots_par_page: motsParPage, duree_mois: g.mois ? g.mois[1] : null,
    sous_objectifs: g.structure.map((titre, i) => ({titre, ordre: i + 1, pages_cibles: null}))};
}

// ---------- jours ouvrés ----------
function joursOuvres(debutIso, finIso, masque = LUN_VEN, exclus = []){
  const ex = new Set(exclus), out = [];
  for(let j = versJour(debutIso), f = versJour(finIso); j <= f; j++){ const iso = versIso(j); if((masque >> jourSemaine(j)) & 1 && !ex.has(iso)) out.push(iso); }
  return out;
}
const estOuvre = (iso, masque = LUN_VEN, exclus = []) => !!((masque >> jourSemaine(versJour(iso))) & 1) && !exclus.includes(iso);
const nbJoursParSemaine = masque => [0, 1, 2, 3, 4, 5, 6].filter(b => (masque >> b) & 1).length;
// la n-ième journée ouvrée à partir d’une date (incluse) : pour proposer une nouvelle date de fin
function nIemeJourOuvre(debutIso, n, masque = LUN_VEN, exclus = []){
  if(!nbJoursParSemaine(masque)) return null;
  const ex = new Set(exclus); let vus = 0;
  for(let j = versJour(debutIso); ; j++){ const iso = versIso(j); if((masque >> jourSemaine(j)) & 1 && !ex.has(iso) && ++vus >= n) return iso; }
}

// ---------- normalisation et validation de l’objectif (sections 2.1 et 6) ----------
function normaliser(o){
  const n = {mots_par_page: 250, jours_travail: LUN_VEN, jours_exclus: [], ...o};
  if(!n.date_fin && n.duree_mois && n.date_debut) n.date_fin = versIso(versJour(ajouterMois(n.date_debut, +n.duree_mois)) - 1);
  return n;
}
function valider(objectif, aujourdhui){
  const o = normaliser(objectif), e = [];
  if(!String(o.titre || "").trim()) e.push("titre");
  if(!GABARITS[o.type_document]) e.push("type_document");
  if(!(Number.isInteger(+o.pages_cibles) && +o.pages_cibles >= 1 && +o.pages_cibles <= 1000)) e.push("pages_cibles");
  if(!(Number.isInteger(+o.mots_par_page) && +o.mots_par_page >= 150 && +o.mots_par_page <= 400)) e.push("mots_par_page");
  if(!o.date_debut) e.push("date_debut");
  else if(aujourdhui && versJour(o.date_debut) < versJour(aujourdhui) - 7) e.push("date_debut_trop_ancienne");
  if(!o.date_fin) e.push("date_fin_ou_duree");
  else if(o.date_debut && versJour(o.date_fin) < versJour(o.date_debut)) e.push("date_fin_avant_debut");
  if(!e.length && !joursOuvres(o.date_debut, o.date_fin, o.jours_travail, o.jours_exclus).length) e.push("aucun_jour_ouvre");
  if(!e.length && o.plafond_jour != null && !(+o.plafond_jour > 0)) e.push("plafond_jour");
  return {ok: !e.length, erreurs: e, objectif: o};
}

// ---------- cible de base (section 2.2) ----------
function cibleBase(objectif){
  const o = normaliser(objectif), jours = joursOuvres(o.date_debut, o.date_fin, o.jours_travail, o.jours_exclus);
  const mots_total = o.pages_cibles * o.mots_par_page, n = jours.length;
  const cible_jour = n ? Math.ceil(mots_total / n) : 0; // critère d’acceptation : 193 mots pour 100 pages en 6 mois
  const semaine = cible_jour * nbJoursParSemaine(o.jours_travail);
  const moisMoyen = n ? cible_jour * n / ((versJour(o.date_fin) - versJour(o.date_debut) + 1) / 30.4375) : 0;
  return {mots_total, jours_ouvres: n, cible_jour, cible_semaine: semaine, cible_mois_moyenne: Math.round(moisMoyen),
    pages_par_mois: o.mots_par_page ? moisMoyen / o.mots_par_page : 0, plafond_jour: o.plafond_jour != null ? +o.plafond_jour : 2 * cible_jour};
}
// mots prévus dans un mois donné (« AAAA-MM »)
function cibleDuMois(objectif, mois){ const o = normaliser(objectif); return planInitial(o).filter(x => x.date.startsWith(mois)).reduce((s, x) => s + x.cible, 0); }
// plan de départ : la somme des cibles égale exactement mots_total ; le dernier jour absorbe le reste de l’arrondi
function planInitial(objectif){
  const o = normaliser(objectif), jours = joursOuvres(o.date_debut, o.date_fin, o.jours_travail, o.jours_exclus), b = cibleBase(o);
  let reste = b.mots_total;
  return jours.map((date, i) => { const c = i === jours.length - 1 ? reste : Math.min(b.cible_jour, reste); reste -= c; return {date, cible: c}; });
}
// aperçu du formulaire : « 100 pages = 25 000 mots = 193 mots par jour, soit 965 par semaine et environ 4 200 par mois »
function apercu(objectif){
  const o = normaliser(objectif), b = cibleBase(o);
  return {pages: o.pages_cibles, mots_total: b.mots_total, par_jour: b.cible_jour, par_semaine: b.cible_semaine, par_mois_environ: Math.round(b.cible_mois_moyenne / 100) * 100};
}

// ---------- cible du jour : élan, retard, avance, plafond (section 2.3) ----------
const FACTEUR_ELAN = {1: 0.5, 2: 0.75, 3: 1.0, 4: 1.25, 5: 1.5};
const motsEcritsAvant = (journal, iso) => (journal || []).filter(x => x.date < iso).reduce((s, x) => s + (+x.mots_ecrits || 0), 0);
const motsEcritsJusqua = (journal, iso) => (journal || []).filter(x => x.date <= iso).reduce((s, x) => s + (+x.mots_ecrits || 0), 0);
/* Cible du jour, recalculée chaque jour à partir de ce qui reste (un jour manqué est réparti sur les jours
   restants ; un jour dépassé réduit les suivants). L’élan ajuste la cible du jour, jamais l’objectif final. */
function cibleDuJour(objectif, journal, aujourdhui, elan = 3){
  const o = normaliser(objectif), b = cibleBase(o), plafond = b.plafond_jour;
  const ecrits = motsEcritsAvant(journal, aujourdhui), restants = Math.max(0, b.mots_total - ecrits);
  const debut = versJour(aujourdhui) < versJour(o.date_debut) ? o.date_debut : aujourdhui;
  const jours = versJour(debut) <= versJour(o.date_fin) ? joursOuvres(debut, o.date_fin, o.jours_travail, o.jours_exclus) : [];
  const ouvre = estOuvre(aujourdhui, o.jours_travail, o.jours_exclus) && jours[0] === aujourdhui;
  const r = {mots_total: b.mots_total, mots_ecrits: ecrits, mots_restants: restants, jours_restants: jours.length, plafond, jour_ouvre: ouvre,
    cible_base_maintenant: 0, cible: 0, plafonnee: false, irrealisable: false, fin_proposee: null, termine: restants === 0};
  if(r.termine) return r;
  r.cible_base_maintenant = jours.length ? Math.ceil(restants / jours.length) : restants;
  // le plafond empêche de rattraper : avertir et proposer une date de fin réaliste
  if(!jours.length || r.cible_base_maintenant > plafond){
    r.irrealisable = true;
    r.fin_proposee = nIemeJourOuvre(debut, Math.ceil(restants / plafond), o.jours_travail, o.jours_exclus);
  }
  if(!ouvre) return r; // jour de repos ou exclu : pas de cible aujourd’hui
  const f = FACTEUR_ELAN[elan] || 1;
  const voulue = Math.ceil(r.cible_base_maintenant * f);
  r.cible = Math.max(1, Math.min(voulue, plafond)); // un élan bas réduit la cible sans jamais la supprimer
  r.plafonnee = voulue > plafond;
  return r;
}
// date de fin projetée au rythme actuel (moyenne des jours ouvrés écoulés), pour la vue d’ensemble
function finProjetee(objectif, journal, aujourdhui){
  const o = normaliser(objectif), b = cibleBase(o);
  const veille = versIso(versJour(aujourdhui) - 1), ecoules = versJour(veille) >= versJour(o.date_debut) ? joursOuvres(o.date_debut, veille, o.jours_travail, o.jours_exclus).length : 0;
  const ecrits = motsEcritsAvant(journal, aujourdhui), restants = b.mots_total - ecrits;
  if(restants <= 0) return {date: veille, rythme: ecoules ? ecrits / ecoules : 0};
  if(!ecoules || !ecrits) return {date: null, rythme: 0};
  const rythme = ecrits / ecoules;
  return {date: nIemeJourOuvre(versJour(aujourdhui) < versJour(o.date_debut) ? o.date_debut : aujourdhui, Math.ceil(restants / rythme), o.jours_travail, o.jours_exclus), rythme};
}

// ---------- sous-objectifs (section 2.4) : l’écart est affiché, jamais bloquant ----------
function ecartSousObjectifs(objectif, sous){
  const somme = (sous || []).reduce((s, x) => s + (+x.pages_cibles || 0), 0);
  return {somme, attendu: +objectif.pages_cibles, ecart: +objectif.pages_cibles - somme};
}

// ---------- comptage des mots (section 2.5) : texte de la Rédaction, sans syntaxe Markdown ni LaTeX ----------
function compterMots(texte){
  const t = String(texte || "")
    .replace(/```[\s\S]*?```/g, " ").replace(/`[^`]*`/g, " ")                       // code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")   // images, liens
    .replace(/^\s{0,3}(?:#{1,6}|>|[-*+]|\d+[.)])\s+/gm, " ").replace(/[*_~]{1,3}/g, "") // titres, citations, listes, gras
    .replace(/\\begin\{[^}]*\}|\\end\{[^}]*\}/g, " ").replace(/\\[a-zA-Z@]+\*?(?:\[[^\]]*\])?/g, " ").replace(/[{}]/g, " ") // LaTeX
    .replace(/%.*$/gm, " ");
  return (t.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) || []).length;
}

// ---------- anti-procrastination (section 3.3) : indicateurs du jour ----------
const SEUILS = {jours_sans_ecriture: 2, retard_jours: 1, elan_moyen: 2, plan_non_suivi: 3, point_de_controle: 7};
function indicateurs(objectif, journal, aujourdhui, sessions = []){
  const o = normaliser(objectif), b = cibleBase(o), j = versJour(aujourdhui);
  const parDate = new Map(); (journal || []).forEach(x => parDate.set(x.date, (parDate.get(x.date) || 0) + (+x.mots_ecrits || 0)));
  // jours ouvrés consécutifs sans écriture, jusqu’à hier
  let sans = 0;
  if(j - 1 >= versJour(o.date_debut)){
    const passes = joursOuvres(o.date_debut, versIso(j - 1), o.jours_travail, o.jours_exclus);
    for(let i = passes.length - 1; i >= 0 && !(parDate.get(passes[i]) > 0); i--) sans++;
  }
  // retard : ce que le plan de départ prévoyait jusqu’à hier, moins ce qui est écrit, en jours de cible
  const prevu = planInitial(o).filter(x => x.date < aujourdhui).reduce((s, x) => s + x.cible, 0);
  const retardMots = Math.max(0, prevu - motsEcritsAvant(journal, aujourdhui));
  const retardJours = b.cible_jour ? retardMots / b.cible_jour : 0;
  // élan moyen sur les 7 derniers jours (au moins 3 relevés)
  const elans = (journal || []).filter(x => x.elan && versJour(x.date) > j - 7 && versJour(x.date) <= j).map(x => +x.elan);
  const elanMoyen = elans.length >= 3 ? elans.reduce((s, x) => s + x, 0) / elans.length : null;
  // plan non suivi : parmi les 5 dernières sessions prévues (déjà passées), combien n’ont pas démarré
  const prevues = (sessions || []).filter(s => s.date <= aujourdhui).sort((a, b) => a.date < b.date ? -1 : 1).slice(-5);
  const nonDemarrees = prevues.filter(s => !s.demarree).length;
  const alertes = [];
  if(sans >= SEUILS.jours_sans_ecriture) alertes.push("jours_sans_ecriture");
  if(retardJours > SEUILS.retard_jours) alertes.push("retard");
  if(elanMoyen !== null && elanMoyen <= SEUILS.elan_moyen) alertes.push("elan_bas");
  if(nonDemarrees >= SEUILS.plan_non_suivi) alertes.push("plan_non_suivi");
  return {jours_sans_ecriture: sans, retard_mots: retardMots, retard_jours: retardJours, elan_moyen: elanMoyen, sessions_non_demarrees: nonDemarrees, alertes};
}

// ---------- escalade des interventions (section 3.4) ----------
/* Niveau propre à chaque indicateur ; plusieurs indicateurs simultanés font monter d’un niveau ; 7 jours de blocage
   donnent le point de contrôle (4) ; la détresse signalée donne la pause assumée (5), qui arrête toute relance.
   Une même intervention déjà présentée aujourd’hui n’est pas répétée (au plus une fois par jour). */
const NIVEAU_INDICATEUR = {jours_sans_ecriture: 1, retard: 2, elan_bas: 2, plan_non_suivi: 3};
function escalade(ind, historique = [], aujourdhui, detresse = false){
  if(detresse) return {niveau: 5, declencheurs: ["detresse"], relances_suspendues: true};
  if(!ind.alertes.length) return null;
  let niveau = Math.max(...ind.alertes.map(a => NIVEAU_INDICATEUR[a]));
  if(ind.alertes.length >= 2) niveau += 1;
  if(ind.jours_sans_ecriture >= SEUILS.point_de_controle) niveau = Math.max(niveau, 4);
  niveau = Math.min(niveau, 4);
  if((historique || []).some(h => h.date === aujourdhui && h.niveau === niveau)) return null;
  return {niveau, declencheurs: ind.alertes.slice(), relances_suspendues: false};
}
// niveau 2 : la cible du jour est divisée par deux (jamais l’objectif final)
const cibleReduite = cible => cible > 0 ? Math.max(1, Math.ceil(cible / 2)) : 0;

// ---------- plans de travail (section 3.2) ----------
const STRATEGIES = ["session_minimale", "pomodoro", "chapitre_dabord", "brouillon_imparfait", "implementation", "semaine_relance"];
/* Le plan qui convient, à partir des indicateurs et de ce que l’utilisateur a signalé ; un plan refusé n’est pas
   reproposé dans les 7 jours. Retourne null si rien ne s’impose ou si tout ce qui conviendrait a été refusé. */
function proposerPlan(ind, contexte = {}, refus = [], aujourdhui){
  const recents = new Set((refus || []).filter(r => versJour(aujourdhui) - versJour(r.date) < 7).map(r => r.strategie));
  const ordre = [];
  if(ind.retard_jours >= 10) ordre.push("semaine_relance");      // deux semaines de retard (10 jours ouvrés de cible)
  if(ind.jours_sans_ecriture >= SEUILS.jours_sans_ecriture) ordre.push("session_minimale");
  if(ind.sessions_non_demarrees >= SEUILS.plan_non_suivi) ordre.push("implementation");
  if(contexte.perfectionnisme) ordre.push("brouillon_imparfait");
  if(contexte.blocage_introduction) ordre.push("chapitre_dabord");
  if(contexte.journee_chargee) ordre.push("pomodoro");
  return ordre.find(s => !recents.has(s)) || null;
}
// « semaine de relance » : objectif réduit de moitié pendant une semaine (la cible du jour, pas l’objectif final)
const cibleSemaineRelance = cible => cibleReduite(cible);

// ---------- énergie, motivation (section 3.5) ----------
// tâche conseillée selon l’élan noté en début de session
const tacheSelonElan = elan => +elan >= 4 ? "exigeante" : +elan === 3 ? "moyenne" : "legere";
// jalons franchis entre deux totaux : chaque tranche de 1 000 mots
function jalons(avant, apres, pas = 1000){ const out = []; for(let k = Math.floor(avant / pas) + 1; k * pas <= apres; k++) out.push(k * pas); return out; }
/* Série de jours d’écriture, sans gamification excessive : une journée ouvrée manquée ne remet pas la série à zéro
   (elle se rattrape par une session, même minimale, le jour ouvré suivant) ; deux journées manquées de suite la
   recommencent. Le jour en cours ne compte que s’il est déjà écrit. */
function serie(objectif, journal, aujourdhui){
  const o = normaliser(objectif), ecrit = new Set((journal || []).filter(x => +x.mots_ecrits > 0).map(x => x.date));
  if(versJour(aujourdhui) < versJour(o.date_debut)) return {jours: 0, en_suspens: false};
  const jours = joursOuvres(o.date_debut, aujourdhui, o.jours_travail, o.jours_exclus);
  let n = 0, manques = 0, enSuspens = false;
  for(let i = jours.length - 1; i >= 0; i--){
    if(ecrit.has(jours[i])){ n++; manques = 0; }
    else if(jours[i] === aujourdhui) continue;           // la journée n’est pas finie
    else { manques++; if(manques >= 2) break; if(n === 0) enSuspens = true; }
  }
  return {jours: n, en_suspens: enSuspens};
}

// ================= SESSIONS AGRÉABLES : félicitations, rythme, rendez-vous, agenda, Excel, micro =================

/* Félicitations à chaque petit pas : ce qui vient d’être franchi entre deux états de la session.
   etat = {session: mots écrits pendant la session, jour: mots du jour, cible: cible du jour, total: mots depuis le début}.
   Retourne la liste des pas franchis, dans l’ordre (jamais de message négatif : un pas non franchi ne dit rien). */
function pasFranchis(avant, apres){
  const out = [], a = {session: 0, jour: 0, cible: 0, total: 0, ...avant}, b = {session: 0, jour: 0, cible: 0, total: 0, ...apres};
  if(a.session <= 0 && b.session > 0) out.push({type: "premiers_mots"});
  for(let k = Math.floor(a.session / 100) + 1; k * 100 <= b.session; k++) if(k * 100 > 0) out.push({type: "cent_mots", valeur: k * 100});
  if(b.cible > 0){
    if(a.jour < b.cible / 2 && b.jour >= b.cible / 2 && b.jour < b.cible) out.push({type: "moitie"});
    if(a.jour < b.cible && b.jour >= b.cible) out.push({type: "cible_atteinte"});
    if(a.jour < b.cible * 1.5 && b.jour >= b.cible * 1.5) out.push({type: "cible_depassee"});
  }
  jalons(a.total, b.total).forEach(v => out.push({type: "mille", valeur: v}));
  return out;
}
// le plus marquant d’une liste de pas (un seul message à la fois, pour ne pas noyer l’utilisateur)
const ORDRE_PAS = ["mille", "cible_depassee", "cible_atteinte", "moitie", "cent_mots", "premiers_mots"];
const pasPrincipal = pas => (pas || []).slice().sort((x, y) => ORDRE_PAS.indexOf(x.type) - ORDRE_PAS.indexOf(y.type))[0] || null;
// choix d’une variante de message, stable pour une même graine (pas de répétition immédiate du même texte)
const variante = (liste, graine) => liste && liste.length ? liste[Math.abs(graine | 0) % liste.length] : "";

// rythme d’écriture en mots par minute (session ou sprint)
const rythme = (mots, ms) => ms > 0 ? Math.round(mots / (ms / 60000)) : 0;
// durée prévue d’une session selon le plan (minutes) ; 0 = libre
const DUREES_SESSION = {session_minimale: 15, pomodoro: 25, sprint: 5, libre: 0};

/* RENDEZ-VOUS D’ÉCRITURE : heure fixée à l’avance (plan « implémentation »). Faut-il rappeler l’utilisateur ?
   Oui si aujourd’hui est un jour de rendez-vous, que l’heure est passée, que rien n’a été écrit ni commencé
   aujourd’hui, et qu’aucun rappel n’a déjà été fait aujourd’hui (une fois par jour, jamais plus). Pas de rappel
   pendant une pause assumée (soutien) ni si l’objectif est en pause ou terminé. */
const minutesDe = hhmm => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || "")); return m ? +m[1] * 60 + +m[2] : null; };
function rappelRendezVous(rdv, jourIso, minutesMaintenant, etat = {}){
  if(!rdv || !rdv.actif || etat.soutien || (etat.statut && etat.statut !== "actif")) return false;
  const h = minutesDe(rdv.heure); if(h === null) return false;
  if(!(((rdv.jours ?? LUN_VEN) >> jourSemaine(versJour(jourIso))) & 1)) return false;
  if(minutesMaintenant < h) return false;
  if(etat.demarree || (etat.mots || 0) > 0) return false;
  return !(etat.rappels || []).includes(jourIso);
}

/* AGENDA DU TÉLÉPHONE : fichier .ics des rendez-vous d’écriture (récurrents, avec alarme). Le téléphone sonne même
   quand SCIENTUS est fermé. Heure « flottante » (celle de l’appareil, pas de conversion de fuseau). */
const ics2 = iso => iso.replace(/-/g, "");
const icsTexte = t => String(t || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
function calendrierIcs(objectif, rdv, textes = {}){
  const o = normaliser(objectif), h = minutesDe(rdv.heure); if(h === null) return "";
  const masque = rdv.jours ?? o.jours_travail, BYDAY = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"].filter((_, b) => (masque >> b) & 1);
  // premier jour de rendez-vous à partir du début de l’objectif
  let debut = versJour(o.date_debut); while(!((masque >> jourSemaine(debut)) & 1)) debut++;
  const hh = String(Math.floor(h / 60)).padStart(2, "0"), mm = String(h % 60).padStart(2, "0"), duree = rdv.duree || 25;
  const lignes = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//WayDayZ//SCIENTUS Ma redaction//FR", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
    `UID:scientus-${ics2(o.date_debut)}-${hh}${mm}@scientus`, `DTSTAMP:${ics2(o.date_debut)}T000000Z`,
    `DTSTART:${ics2(versIso(debut))}T${hh}${mm}00`, `DURATION:PT${duree}M`,
    `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY.join(",")};UNTIL=${ics2(o.date_fin)}T235959`,
    ...((o.jours_exclus || []).map(x => `EXDATE:${ics2(x)}T${hh}${mm}00`)),
    `SUMMARY:${icsTexte(textes.titre || "Session d'écriture")} : ${icsTexte(o.titre)}`,
    `DESCRIPTION:${icsTexte(textes.description || "")}`,
    "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsTexte(textes.alarme || "Session d'écriture")}`, "TRIGGER:-PT10M", "END:VALARM",
    "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsTexte(textes.alarme || "Session d'écriture")}`, "TRIGGER:PT0M", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR"];
  return lignes.join("\r\n") + "\r\n";
}

/* EXPORT EXCEL du journal d’écriture : trois feuilles (journal par jour, sessions, objectif). Données seulement,
   en lignes de cellules ; xlsxFichiers en fait un classeur Excel (.xlsx) sans bibliothèque supplémentaire. */
function classeurJournal(d, entetes){
  const o = normaliser(d.objectif), prevu = new Map(planInitial(o).map(x => [x.date, x.cible])), parJour = new Map();
  (d.journal || []).forEach(x => { const j = parJour.get(x.date) || {redaction: 0, manuel: 0, elan: ""}; if(x.source === "elan") j.elan = x.elan; else if(x.source === "manuel") j.manuel += +x.mots_ecrits || 0; else j.redaction += +x.mots_ecrits || 0; parJour.set(x.date, j); });
  const jours = [...parJour.keys()].sort();
  const E = entetes;
  return {feuilles: [
    {nom: E.feuille_journal, lignes: [E.journal, ...jours.map(j => { const x = parJour.get(j); return [j, x.redaction + x.manuel, x.redaction, x.manuel, x.elan, prevu.get(j) || 0]; })]},
    {nom: E.feuille_sessions, lignes: [E.sessions, ...(d.bilans || []).map(b => [b.date, b.debut ? new Date(b.debut).toTimeString().slice(0, 5) : "", b.fin ? new Date(b.fin).toTimeString().slice(0, 5) : "", b.debut && b.fin ? Math.round((b.fin - b.debut) / 60000) : "", b.mots_ecrits || 0, b.elan_avant || "", b.elan_apres || "", b.note || ""])]},
    {nom: E.feuille_objectif, lignes: [[E.objectif[0], o.titre], [E.objectif[1], GABARITS[o.type_document] ? GABARITS[o.type_document].nom : o.type_document], [E.objectif[2], o.pages_cibles], [E.objectif[3], o.mots_par_page], [E.objectif[4], o.date_debut], [E.objectif[5], o.date_fin], [E.objectif[6], motsEcritsJusqua(d.journal, "9999-12-31")]]},
  ]};
}
const xmlEsc = v => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const colonne = i => { let s = ""; i++; while(i > 0){ const r = (i - 1) % 26; s = String.fromCharCode(65 + r) + s; i = Math.floor((i - 1) / 26); } return s; };
function xlsxFichiers(classeur){
  const f = {}, n = classeur.feuilles.length;
  f["[Content_Types].xml"] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${classeur.feuilles.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`;
  f["_rels/.rels"] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  f["xl/workbook.xml"] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${classeur.feuilles.map((s, i) => `<sheet name="${xmlEsc(String(s.nom).slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`;
  f["xl/_rels/workbook.xml.rels"] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${classeur.feuilles.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}</Relationships>`;
  classeur.feuilles.forEach((s, i) => {
    const lignes = s.lignes.map((l, r) => `<row r="${r + 1}">${l.map((v, c) => { const ref = colonne(c) + (r + 1);
      return typeof v === "number" && isFinite(v) ? `<c r="${ref}"><v>${v}</v></c>` : `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v ?? "")}</t></is></c>`; }).join("")}</row>`).join("");
    f[`xl/worksheets/sheet${i + 1}.xml`] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${lignes}</sheetData></worksheet>`;
  });
  return f;
}

/* MICRO : seuil de détection de la voix calibré sur le bruit ambiant de la pièce (mesuré une seconde au démarrage)
   et sur la sensibilité choisie (1 = pièce bruyante, 5 = voix faible ou micro éloigné). */
const FACTEUR_SENSIBILITE = {1: 5, 2: 4, 3: 3, 4: 2.3, 5: 1.7};
function seuilVoix(bruitRms, sensibilite = 3){
  const f = FACTEUR_SENSIBILITE[sensibilite] || 3, base = Math.max(+bruitRms || 0, 0.002);
  return Math.min(0.06, Math.max(0.004, base * f));
}
// niveau affiché (0 à 100) à partir d’un RMS
const niveauAffiche = rms => Math.min(100, Math.round(Math.sqrt(Math.max(0, rms)) * 220));

const api = {versJour, versIso, ajouterMois, joursOuvres, estOuvre, nIemeJourOuvre, nbJoursParSemaine, LUN_VEN,
  GABARITS, depuisGabarit, normaliser, valider, cibleBase, cibleDuMois, planInitial, apercu, FACTEUR_ELAN, cibleDuJour, finProjetee,
  motsEcritsAvant, motsEcritsJusqua, ecartSousObjectifs, compterMots,
  SEUILS, indicateurs, NIVEAU_INDICATEUR, escalade, cibleReduite, STRATEGIES, proposerPlan, cibleSemaineRelance,
  tacheSelonElan, jalons, serie,
  pasFranchis, pasPrincipal, variante, rythme, DUREES_SESSION, minutesDe, rappelRendezVous, calendrierIcs, classeurJournal, xlsxFichiers, colonne, seuilVoix, niveauAffiche};
if(typeof module !== "undefined" && module.exports) module.exports = api; else racine.MaRedaction = api;
})(typeof window !== "undefined" ? window : globalThis);
