// Module MA RÉDACTION : critères d’acceptation (section 7), cas limites (section 6), test de non-génération (section 8).
// Fonctions pures, testées seules, avant l’interface.
const M = require("../js/ma-redaction.js");
const TEXTES = require("../textes/messages_fr.json");
const errs = [];
const egal = (o, a, q) => { if (JSON.stringify(o) !== JSON.stringify(a)) errs.push(`${q} :\n    attendu ${JSON.stringify(a)}\n    obtenu  ${JSON.stringify(o)}`); };
const vrai = (v, q) => egal(!!v, true, q);

// objectif de référence : 100 pages, 250 mots par page, 6 mois, lundi à vendredi, à partir du lundi 4 janvier 2027
const REF = {titre: "Mémoire", type_document: "memoire_master", pages_cibles: 100, mots_par_page: 250, date_debut: "2027-01-04", duree_mois: 6};

// ---------- Calcul ----------
const b = M.cibleBase(REF);
egal(M.normaliser(REF).date_fin, "2027-07-03", "6 mois à partir du 4 janvier : fin le 3 juillet");
egal(b.mots_total, 25000, "100 pages × 250 mots = 25 000 mots");
vrai(Math.abs(b.cible_jour - 193) <= 1, `cible de base 193 mots par jour (±1) — obtenu ${b.cible_jour}`);
egal(b.cible_semaine, b.cible_jour * 5, "cible de la semaine = 5 jours de cible");
const ap = M.apercu(REF);
egal([ap.mots_total, ap.par_jour, ap.par_semaine], [25000, 193, 965], "aperçu : 25 000 mots = 193 mots par jour, soit 965 par semaine");
vrai(ap.par_mois_environ >= 4000 && ap.par_mois_environ <= 4300, `aperçu : environ 4 000 mots par mois — obtenu ${ap.par_mois_environ}`);

const plan = M.planInitial(REF);
egal(plan.reduce((s, x) => s + x.cible, 0), 25000, "la somme des cibles quotidiennes égale mots_total");
vrai(plan.every(x => x.cible >= 0), "aucune cible négative");
const petit = {...REF, pages_cibles: 1, mots_par_page: 150, duree_mois: 3}; // 150 mots sur ~65 jours
egal(M.planInitial(petit).reduce((s, x) => s + x.cible, 0), 150, "somme exacte même quand il y a moins de mots que de jours");

// un jour manqué est reporté sur les jours suivants, sans dépasser le plafond
const lundi = "2027-01-04", mardi = "2027-01-05";
const c1 = M.cibleDuJour(REF, [], lundi, 3);
const c2 = M.cibleDuJour(REF, [], mardi, 3); // rien écrit lundi
vrai(c2.cible > c1.cible - 1 && c2.mots_restants === 25000 && c2.cible_base_maintenant >= c1.cible_base_maintenant, "jour manqué : le retard est réparti sur les jours restants");
const enRetard = M.cibleDuJour({...REF, plafond_jour: 200}, [], "2027-06-28", 3); // presque tout reste à écrire
egal(enRetard.cible, 200, "le report ne dépasse jamais le plafond");
vrai(enRetard.irrealisable && enRetard.fin_proposee > "2027-07-03", "objectif irréalisable : avertissement et nouvelle date de fin proposée");

// un jour dépassé réduit les cibles suivantes
const avance = M.cibleDuJour(REF, [{date: lundi, mots_ecrits: 1000}], mardi, 3);
vrai(avance.cible < c1.cible, "un jour dépassé réduit les cibles suivantes");

// élan
const e3 = M.cibleDuJour(REF, [], lundi, 3), e5 = M.cibleDuJour(REF, [], lundi, 5), e1 = M.cibleDuJour(REF, [], lundi, 1);
egal(e5.cible, Math.ceil(e3.cible_base_maintenant * 1.5), "élan 5 : la cible du jour augmente de 50 %");
egal(M.cibleDuJour({...REF, plafond_jour: 250}, [], lundi, 5).cible, 250, "élan 5 : dans la limite du plafond");
vrai(e1.cible > 0 && e1.cible < e3.cible, "élan 1 : cible réduite, jamais supprimée");
egal(e1.mots_total, 25000, "l’élan ne touche jamais l’objectif final");

// jours exclus
const exclu = {...REF, jours_exclus: ["2027-01-05"]};
vrai(!M.planInitial(exclu).some(x => x.date === "2027-01-05"), "les jours exclus ne reçoivent aucune cible");
egal(M.cibleDuJour(exclu, [], "2027-01-05", 3).cible, 0, "pas de cible un jour exclu");
egal(M.cibleDuJour(REF, [], "2027-01-09", 3).cible, 0, "pas de cible un samedi (jour non travaillé)");
egal(M.planInitial(exclu).reduce((s, x) => s + x.cible, 0), 25000, "avec des jours exclus, la somme reste exacte");

// changement de mots par page ou de pages en cours de route : recalcul de ce qui reste
const ecrit = [{date: lundi, mots_ecrits: 193}];
const avant = M.cibleDuJour(REF, ecrit, mardi, 3), apres = M.cibleDuJour({...REF, mots_par_page: 300}, ecrit, mardi, 3);
egal(apres.mots_restants, 30000 - 193, "mots par page modifiés : mots_total recalculé, cibles restantes redistribuées");
vrai(apres.cible > avant.cible, "et la cible du jour augmente en conséquence");

// ---------- Cas limites (section 6) ----------
const aujourdhui = "2027-01-04";
egal(M.valider({...REF, duree_mois: undefined}, aujourdhui).erreurs, ["date_fin_ou_duree"], "ni date de fin ni durée : refus");
egal(M.valider({...REF, duree_mois: undefined, date_fin: "2026-12-01"}, aujourdhui).erreurs, ["date_fin_avant_debut"], "fin avant le début : refus");
egal(M.valider({...REF, duree_mois: undefined, date_fin: "2027-01-10", jours_exclus: ["2027-01-04", "2027-01-05", "2027-01-06", "2027-01-07", "2027-01-08"]}, aujourdhui).erreurs, ["aucun_jour_ouvre"], "aucun jour ouvré : refus");
egal(M.valider({...REF, date_debut: "2026-12-20"}, aujourdhui).erreurs, ["date_debut_trop_ancienne"], "début à plus de 7 jours dans le passé : refus");
egal(M.valider({...REF, pages_cibles: 0}, aujourdhui).erreurs, ["pages_cibles"], "pages entre 1 et 1 000");
egal(M.valider({...REF, mots_par_page: 500}, aujourdhui).erreurs, ["mots_par_page"], "mots par page entre 150 et 400");
egal(M.valider(REF, aujourdhui).ok, true, "objectif de référence valide");
const depart = M.cibleDuJour({...REF, duree_mois: 1, plafond_jour: 300}, [], lundi, 3);
vrai(depart.irrealisable && depart.fin_proposee, "cible supérieure au plafond dès le départ : nouvelle date proposée");
egal(M.ecartSousObjectifs(REF, [{pages_cibles: 40}, {pages_cibles: 50}]), {somme: 90, attendu: 100, ecart: 10}, "sous-objectifs : l’écart est calculé (affiché, non bloquant)");

// ---------- Anti-procrastination ----------
const lun11 = "2027-01-11";
// deux jours ouvrés sans écriture → rappel de niveau 1
const j2 = [{date: "2027-01-04", mots_ecrits: 200}, {date: "2027-01-05", mots_ecrits: 200}, {date: "2027-01-06", mots_ecrits: 200}];
const ind2 = M.indicateurs(REF, j2, "2027-01-08");
egal(ind2.jours_sans_ecriture, 1, "un seul jour sans écriture : pas encore d’alerte");
const ind3 = M.indicateurs(REF, j2.slice(0, 2), "2027-01-08", []);
egal(ind3.jours_sans_ecriture, 2, "deux jours ouvrés sans écriture comptés");
const esc1 = M.escalade({...ind3, alertes: ["jours_sans_ecriture"]}, [], "2027-01-08");
egal(esc1 && esc1.niveau, 1, "deux jours ouvrés sans écriture : rappel de niveau 1");
vrai(TEXTES.interventions["1"].includes("{premiere_action}") && TEXTES.premieres_actions.length, "le rappel de niveau 1 donne une première action");

// élan de 1 ou 2 pendant trois jours → réduction de cible, sans modifier l’objectif final
const elanBas = [{date: "2027-01-04", mots_ecrits: 193, elan: 2}, {date: "2027-01-05", mots_ecrits: 193, elan: 1}, {date: "2027-01-06", mots_ecrits: 193, elan: 2}];
const indE = M.indicateurs(REF, elanBas, "2027-01-07");
vrai(indE.alertes.includes("elan_bas"), "élan bas trois jours : indicateur levé");
const escE = M.escalade(indE, [], "2027-01-07");
egal(escE.niveau, 2, "élan bas : réduction de cible (niveau 2)");
const cibleJ = M.cibleDuJour(REF, elanBas, "2027-01-07", 2);
egal(M.cibleReduite(cibleJ.cible), Math.ceil(cibleJ.cible / 2), "la cible du jour est divisée par deux");
egal(cibleJ.mots_total, 25000, "l’objectif final n’est pas modifié");

// une journée manquée ne remet pas la série à zéro
const serieJournal = [{date: "2027-01-04", mots_ecrits: 100}, {date: "2027-01-05", mots_ecrits: 100}, {date: "2027-01-07", mots_ecrits: 50}];
egal(M.serie(REF, serieJournal, "2027-01-07").jours, 3, "une journée manquée (mercredi) ne remet pas la série à zéro");
egal(M.serie(REF, serieJournal.slice(0, 2), "2027-01-07"), {jours: 2, en_suspens: true}, "série en suspens : elle se rattrape par une session aujourd’hui");
egal(M.serie(REF, [{date: "2027-01-04", mots_ecrits: 100}], "2027-01-07").jours, 0, "deux journées manquées de suite : la série recommence");

// après 7 jours de blocage → point de contrôle
const ind7 = M.indicateurs(REF, [{date: "2027-01-04", mots_ecrits: 193}], "2027-01-14");
egal(ind7.jours_sans_ecriture, 7, "sept jours ouvrés sans écriture");
egal(M.escalade(ind7, [], "2027-01-14").niveau, 4, "après 7 jours de blocage : point de contrôle (niveau 4)");

// plusieurs indicateurs simultanés → niveau supérieur
egal(M.escalade({jours_sans_ecriture: 2, alertes: ["jours_sans_ecriture", "retard"]}, [], lun11).niveau, 3, "deux indicateurs (niveaux 1 et 2) : niveau 3 directement");

// une intervention ignorée n’est pas répétée plus d’une fois par jour
const seul = {...ind3, alertes: ["jours_sans_ecriture"]};
egal(M.escalade(seul, [{date: "2027-01-08", niveau: 1, reponse: "ignoree"}], "2027-01-08"), null, "intervention déjà présentée aujourd’hui : pas répétée");
egal(M.escalade(seul, [{date: "2027-01-07", niveau: 1, reponse: "ignoree"}], "2027-01-08").niveau, 1, "le lendemain, elle peut revenir");
egal(M.escalade(ind3, [], "2027-01-08").niveau, 3, "deux jours sans écriture créent aussi un retard : niveau supérieur");

// détresse : pause assumée, relances suspendues
egal(M.escalade(ind7, [], "2027-01-14", true), {niveau: 5, declencheurs: ["detresse"], relances_suspendues: true}, "détresse signalée : niveau 5, relances arrêtées");

// plan non suivi
const sessions = ["2027-01-04", "2027-01-05", "2027-01-06", "2027-01-07", "2027-01-08"].map((date, i) => ({date, demarree: i === 4}));
egal(M.indicateurs(REF, [], "2027-01-08", sessions).sessions_non_demarrees, 4, "sessions prévues non démarrées comptées");
egal(M.proposerPlan({...M.indicateurs(REF, j2, "2027-01-08", sessions), jours_sans_ecriture: 0}, {}, [], "2027-01-08"), "implementation", "plan non suivi : rendez-vous d’écriture proposé");

// plans : refusé → pas reproposé dans les 7 jours
const indB = {jours_sans_ecriture: 3, retard_jours: 2, sessions_non_demarrees: 0};
egal(M.proposerPlan(indB, {}, [], lun11), "session_minimale", "après un blocage : session minimale");
egal(M.proposerPlan(indB, {perfectionnisme: true}, [{date: "2027-01-08", strategie: "session_minimale"}], lun11), "brouillon_imparfait", "plan refusé il y a 3 jours : pas reproposé");
egal(M.proposerPlan(indB, {}, [{date: "2027-01-01", strategie: "session_minimale"}], lun11), "session_minimale", "refusé il y a 10 jours : de nouveau proposable");
egal(M.proposerPlan({jours_sans_ecriture: 0, retard_jours: 12, sessions_non_demarrees: 0}, {}, [], lun11), "semaine_relance", "deux semaines de retard : semaine de relance");

// énergie, jalons
egal([M.tacheSelonElan(5), M.tacheSelonElan(3), M.tacheSelonElan(1)], ["exigeante", "moyenne", "legere"], "tâche conseillée selon l’élan");
egal(M.jalons(950, 2100), [1000, 2000], "jalons franchis tous les 1 000 mots");

// ---------- Types et interface ----------
for(const [type, g] of Object.entries(M.GABARITS)){
  const d = M.depuisGabarit(type);
  egal(d.sous_objectifs.map(s => s.titre), g.structure, `gabarit ${type} : structure par défaut chargée`);
  if(g.pages) egal(d.pages_cibles, g.pages[1], `gabarit ${type} : volume par défaut chargé`);
}
egal(M.depuisGabarit("article").pages_cibles, 32, "article : 8 000 mots à 250 mots par page = 32 pages");
for(const s of M.STRATEGIES){
  const p = TEXTES.plans[s];
  vrai(p && p.description && p.description.split("\n").length === 2 && p.effort, `plan ${s} : description en deux lignes et effort`);
}

// ---------- Comptage des mots (Markdown et LaTeX retirés) ----------
egal(M.compterMots("## Introduction\n\nLe **langage** est un [pouvoir](http://x.org) symbolique."), 7, "Markdown retiré du comptage");
egal(M.compterMots("\\section{Méthode} Le corpus compte \\textbf{120} articles. % commentaire"), 6, "LaTeX retiré du comptage");

// ---------- Non-génération : aucun texte destiné au document ----------
const tous = [];
(function parcourir(v){ if(typeof v === "string") tous.push(v); else if(v && typeof v === "object") Object.entries(v).forEach(([k, x]) => { if(!k.startsWith("_")) parcourir(x); }); })(TEXTES); // « _statut » : note interne
tous.filter(t => !/À RENSEIGNER/.test(t)).forEach(t => {
  vrai(t.length <= 220, `texte court (pas un paragraphe rédigé) : « ${t.slice(0, 60)}… »`);
  vrai(t.split(/(?<=[.!?])\s+/).filter(Boolean).length <= 3, `au plus trois phrases : « ${t.slice(0, 60)}… »`);
});
TEXTES.prompts_inspiration.forEach(p => vrai(/\?$/.test(p), `prompt d’inspiration = une question : « ${p} »`));
// aucun message ne juge la personne (garde-fous, section 3.6)
const JUGEMENT = /paresse|paresseu|honte|nul\b|échec|faible volonté|tu aurais dû|inadmissible|décevant/i;
tous.forEach(t => vrai(!JUGEMENT.test(t), `aucun jugement de la personne : « ${t.slice(0, 60)}… »`));

// ---------- Sessions agréables (2026-11-21) ----------
egal(M.pasFranchis({session: 0, jour: 0, cible: 200, total: 0}, {session: 12, jour: 12, cible: 200, total: 12}).map(x => x.type), ["premiers_mots"], "premiers mots : félicité");
egal(M.pasFranchis({session: 90, jour: 90, cible: 200, total: 90}, {session: 110, jour: 110, cible: 200, total: 110}).map(x => x.type), ["cent_mots", "moitie"], "100 mots et moitié de la cible");
egal(M.pasFranchis({session: 150, jour: 190, cible: 200, total: 990}, {session: 170, jour: 210, cible: 200, total: 1010}).map(x => x.type), ["cible_atteinte", "mille"], "cible atteinte et cap des 1 000 mots");
egal(M.pasFranchis({session: 50, jour: 50, cible: 200}, {session: 40, jour: 40, cible: 200}), [], "texte effacé : aucun message, jamais de reproche");
egal(M.pasPrincipal([{type: "premiers_mots"}, {type: "cible_atteinte"}]).type, "cible_atteinte", "un seul message à la fois : le plus marquant");
egal([M.variante(["a", "b", "c"], 0), M.variante(["a", "b", "c"], 4)], ["a", "b"], "variantes de messages");
egal(M.rythme(250, 10 * 60000), 25, "rythme : 250 mots en 10 minutes = 25 mots par minute");
const rdv = {heure: "07:00", jours: M.LUN_VEN, actif: true};
egal(M.rappelRendezVous(rdv, "2027-01-04", 7 * 60 + 5, {}), true, "rendez-vous passé, rien écrit : rappel");
egal(M.rappelRendezVous(rdv, "2027-01-04", 6 * 60 + 59, {}), false, "avant l’heure : pas de rappel");
egal(M.rappelRendezVous(rdv, "2027-01-04", 8 * 60, {mots: 40}), false, "déjà écrit aujourd’hui : pas de rappel");
egal(M.rappelRendezVous(rdv, "2027-01-04", 8 * 60, {demarree: true}), false, "session déjà commencée : pas de rappel");
egal(M.rappelRendezVous(rdv, "2027-01-04", 8 * 60, {rappels: ["2027-01-04"]}), false, "une seule fois par jour");
egal(M.rappelRendezVous(rdv, "2027-01-09", 8 * 60, {}), false, "pas un jour de rendez-vous (samedi) : pas de rappel");
egal(M.rappelRendezVous(rdv, "2027-01-04", 8 * 60, {soutien: true}), false, "pause assumée : aucun rappel");
egal(M.rappelRendezVous(rdv, "2027-01-04", 8 * 60, {statut: "pause"}), false, "objectif en pause : aucun rappel");
const ics = M.calendrierIcs({...REF, jours_exclus: ["2027-01-06"]}, rdv, {titre: "Session d'écriture", alarme: "Écris"});
vrai(/DTSTART:20270104T070000/.test(ics) && /RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;UNTIL=20270703T235959/.test(ics), "agenda : rendez-vous récurrent jusqu’à la fin de l’objectif");
vrai(/EXDATE:20270106T070000/.test(ics) && (ics.match(/BEGIN:VALARM/g) || []).length === 2 && /TRIGGER:-PT10M/.test(ics), "agenda : jours exclus, alarme 10 minutes avant et à l’heure");
vrai(/SUMMARY:Session d'écriture : Mémoire/.test(ics) && ics.endsWith("END:VCALENDAR\r\n"), "agenda : titre et fin de fichier conformes");
const journalX = {objectif: REF, journal: [{date: "2027-01-04", mots_ecrits: 150, source: "redaction"}, {date: "2027-01-04", mots_ecrits: 50, source: "manuel"}, {date: "2027-01-04", mots_ecrits: 0, source: "elan", elan: 4}], bilans: [{date: "2027-01-04", debut: Date.UTC(2027, 0, 4, 7, 0), fin: Date.UTC(2027, 0, 4, 7, 25), mots_ecrits: 200, elan_avant: 3, elan_apres: 4, note: "Méthode d’abord"}]};
const cl = M.classeurJournal(journalX, TEXTES.export);
egal(cl.feuilles.map(f => f.nom), ["Journal", "Sessions", "Objectif"], "Excel : trois feuilles");
egal(cl.feuilles[0].lignes[1], ["2027-01-04", 200, 150, 50, 4, 193], "Excel : une ligne par jour (total, Rédaction, saisie, élan, cible prévue)");
egal(cl.feuilles[1].lignes[1].slice(3), [25, 200, 3, 4, "Méthode d’abord"], "Excel : les sessions avec leur durée");
const fx = M.xlsxFichiers(cl);
vrai(fx["xl/workbook.xml"].includes('<sheet name="Journal"') && fx["xl/worksheets/sheet1.xml"].includes("<v>200</v>") && fx["xl/worksheets/sheet2.xml"].includes("Méthode d’abord"), "Excel : classeur .xlsx valide (feuilles, nombres, texte)");
egal([M.colonne(0), M.colonne(25), M.colonne(26)], ["A", "Z", "AA"], "Excel : noms de colonnes");
vrai(M.seuilVoix(0.003, 5) < M.seuilVoix(0.003, 3) && M.seuilVoix(0.003, 3) < M.seuilVoix(0.003, 1), "micro : plus sensible = seuil plus bas");
vrai(M.seuilVoix(0.01, 3) > M.seuilVoix(0.002, 3), "micro : pièce bruyante = seuil plus haut");
vrai(M.seuilVoix(0, 5) >= 0.004 && M.seuilVoix(1, 1) <= 0.06, "micro : seuil toujours dans des bornes raisonnables");
vrai(Object.values(TEXTES.felicitations).every(l => l.length >= 1) && TEXTES.felicitations.cent_mots.length >= 3, "félicitations : plusieurs variantes");
Object.values(TEXTES.questions_par_section).flat().forEach(q => vrai(/\?$/.test(q), `question par section = une question : « ${q} »`));

errs.forEach(e => console.log("ÉCHEC " + e));
console.log(errs.length ? `erreurs : ${errs.length}` : "erreurs : aucune");
process.exit(errs.length ? 1 : 0);
