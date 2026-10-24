// Structure d’un article selon NORCAMES/LSH : parties obligatoires, ordre, numérotation, citations longues
const E = require('../js/moteur.js');
let err = 0;
const egal = (obtenu, attendu, quoi) => { const a = JSON.stringify(obtenu), b = JSON.stringify(attendu); if (a !== b) { err++; console.log(`ÉCHEC ${quoi}\n  attendu ${b}\n  obtenu  ${a}`); } };
const P = (...l) => l.join("\n\n");
const longue = "d’élargir l’histoire des mathématiques de telle sorte qu’elle acquière une perspective multiculturelle et globale, d’accroître le domaine des mathématiques alors qu’elle s’est pour l’essentiel occupée du groupe professionnel occidental que l’on appelle les mathématiciens";

// 1. Article conforme (contribution théorique) : rien à signaler
const conforme = P(
  "La titrologie dans la presse ivoirienne", "Awa KONÉ", "Université Félix Houphouët-Boigny, Abidjan", "awa.kone@ufhb.edu.ci",
  "Résumé : Cet article étudie les titres de la presse ivoirienne.", "Mots clés : presse, titrologie, Côte d’Ivoire",
  "Abstract: This paper studies Ivorian newspaper headlines.", "Key words: press, headlines, Côte d’Ivoire",
  "Introduction", "La presse ivoirienne occupe une place singulière.",
  "1. Le corpus", "Nous avons réuni quarante unes.", "1.1. Les quotidiens", "Six quotidiens ont été retenus.", "1.2. La période", "De septembre à novembre 2020.",
  "2. L’analyse", "Comme le dit M. Ascher (1998, p. 223) :", `« ${longue} ».`, "2.1. Les procédés", "Le jeu de mots domine.",
  "Conclusion", "La titrologie est un genre à part entière.",
  "Références bibliographiques", "ASCHER Marcia, 1998, Mathématiques d’ailleurs, Paris, Seuil.");
const c = E.checkArticleStructure(conforme);
egal(c && c.count, 0, "article conforme : aucun problème");
if (c && c.count) console.log(JSON.stringify(c, null, 1));

// 2. Article fautif
const fautif = P(
  "La titrologie dans la presse ivoirienne", "Awa KONÉ", "Université Félix Houphouët-Boigny",
  "Abstract: This paper studies Ivorian newspaper headlines.", "Résumé : Cet article étudie les titres.",
  "Introduction", "La presse ivoirienne occupe une place singulière.",
  "1. Méthodologie", "Nous avons réuni quarante unes.", "1.1. Les quotidiens", "Six quotidiens.", "1.3. La période", "De septembre à novembre.",
  "3. Résultats", `Comme le montre M. Ascher (1998, p. 223) dans son ouvrage, le but poursuivi est « ${longue} », ce qui éclaire notre propos.`,
  "Le journal titre « ⟦Le bélier a encore frappé⟧ » en une.",
  "Conclusion", "La titrologie est un genre.",
  "Bibliographie", "ASCHER Marcia, 1998, Mathématiques d’ailleurs, Paris, Seuil.");
const f = E.checkArticleStructure(fautif);
egal(f.missing, ["Discussion", "Mots clés", "Key words"], "parties manquantes (article de terrain sans Discussion)");
egal(f.order, [], "le bloc anglais (Abstract) peut précéder le bloc français (Résumé)");
const inverse = E.checkArticleStructure(P("a@b.ci", "Résumé : x", "Mots clés : x", "Abstract: x", "Key words: x", "Conclusion", "Texte.", "Introduction", "Texte.", "Références bibliographiques", "AMIN Samir, 1996, Les Défis de la mondialisation, Paris, L’Harmattan."));
egal(inverse.order, ["ordre : Conclusion avant Introduction"], "ordre : conclusion avant l’introduction");
// PDF : titres collés au texte, sommaire de revue avant l’article, numéro sans point, partie 4.1 sautée
const pdf = ["Sommaire", "Introduction……………IX", "Références", "TITRE DE L’ARTICLE", "Auteur", "auteur@univ.ci", "Abstract", "Text.", "Key words: a, b", "Résumé", "Texte.", "Mots-clés : a, b", "INTRODUCTION", "Texte de l’introduction.",
  "1 THEORETICAL FRAMEWORK", "Texte.", "1.1 Critical Discourse Analysis", "Texte.", "2. Methodological Approach", "Texte.", "2.1 Data", "Texte.", "2.1.1 Lexical amplifications", "Texte.", "3. Results and Interpretations", "Texte.", "26 L'esprit impur sortit de cet", "CONCLUSION", "Texte de la conclusion.", "BIBLIOGRAPHY", "AMIN Samir, 1996, Les Défis de la mondialisation, Paris, L’Harmattan."].join("\n");
const p = E.checkArticleStructure(pdf);
egal(p.missing, [], "PDF : toutes les parties trouvées");
egal(p.order, [], "PDF : ordre");
egal(p.numbering.map(n => n.issue), ["numéro sans point (NORCAMES : « 1. »)"], "PDF : numérotation (versets ignorés)");
egal(p.refsLabel, "BIBLIOGRAPHY", "PDF : intitulé de la bibliographie de l’article, pas celui du sommaire");
egal(f.email, false, "adresse électronique absente");
egal(f.numbering.map(n => n.issue), ["numéro 1.3 après 1.1", "numéro 3 après 1.3"], "numérotation");
egal(f.longQuotes.length, 1, "citation longue dans la phrase");
egal(f.italicQuotes, ["Le bélier a encore frappé"], "citation en italique");
egal(f.refsLabel, "Bibliographie", "intitulé de la bibliographie");

// 3. Titres repérés par leur style Word : une partie sans numéro est signalée
const styles = P("Titre", "a@b.ci", "Résumé : x", "Mots clés : x", "Abstract: x", "Key words: x", "Introduction", "Texte.", "Le corpus", "Texte.", "2. L’analyse", "Texte.", "Conclusion", "Texte.", "Références bibliographiques", "AMIN Samir, 1996, Les Défis de la mondialisation, Paris, L’Harmattan.");
egal(E.checkArticleStructure(styles, ["Introduction", "Le corpus", "2. L’analyse", "Conclusion"]).numbering.map(n => n.issue), ["partie non numérotée", "la première partie porte le numéro 2"], "titres Word");
// sans les styles, une phrase courte n’est pas prise pour un titre
egal(E.checkArticleStructure(styles).numbering.map(n => n.issue), ["la première partie porte le numéro 2"], "sans styles Word");

// 4. Un mémoire (sans résumé ni abstract) n’est pas contrôlé comme un article
egal(E.checkArticleStructure(P("Introduction", "Texte.", "Conclusion", "Bibliographie")), null, "mémoire ignoré");

console.log(err ? `erreurs : ${err}` : "erreurs : aucune");
