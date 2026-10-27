// Mémoire piège : tout ce qu’un vrai document place autour et au milieu de sa bibliographie (page de garde,
// dédicace, sigles, en-têtes et pieds de page, numéros de page, intertitres de la bibliographie, mentions
// d’imprimeur, résumé, abstract, mots clés, annexes, questionnaire, table des matières, index).
// La bibliographie générée ne doit contenir QUE les références des sources citées.
module.exports.texte = `UNIVERSITÉ FÉLIX HOUPHOUËT-BOIGNY
UFR Langues, Littératures et Civilisations
Mémoire de master en sciences du langage
Présenté par KOUAMÉ Aya Estelle
Sous la direction de M. TRAORÉ Bakary, Maître de Conférences
Année universitaire 2023-2024

DÉDICACE
À ma mère, pour son soutien depuis 1998.

SIGLES ET ABRÉVIATIONS
CAMES : Conseil Africain et Malgache pour l’Enseignement Supérieur, créé en 1968.
UNESCO : Organisation des Nations unies pour l’éducation, la science et la culture.

INTRODUCTION
La presse ivoirienne a fait l’objet de nombreuses analyses. Comme l’a montré P. Bourdieu (1982, p. 64), le langage est un instrument de pouvoir symbolique. A. Mbembe (2000) a décrit la postcolonie. La critique du langage est ancienne (Fowler et al., 1979). Le taux de scolarisation progresse (UNESCO, 2015).
Mémoire de master – KOUAMÉ Aya Estelle – 2024
12
CONCLUSION
Ces travaux éclairent notre corpus, comme le confirme S. Diakité (1985, p. 105).

BIBLIOGRAPHIE
I. Ouvrages
BOURDIEU Pierre, 1982, Ce que parler veut dire. L’économie des échanges linguistiques, Paris, Fayard.
DIAKITÉ Sidiki, 1985, Violence technologique et développement. La question africaine du développement, Paris, L’Harmattan.
Mémoire de master – KOUAMÉ Aya Estelle – 2024
45
MBEMBE Achille, 2000, De la postcolonie. Essai sur l’imagination politique dans l’Afrique contemporaine, Paris, Karthala.
II. Articles
FOWLER Roger, HODGE Bob, KRESS Gunther et TREW Tony, 1979, « Language and Control », Discourse & Society, 4, 2, p. 12-30. Printed in Great Britain. All rights reserved.
KONÉ Aminata, 2015, « La presse écrite en Côte d’Ivoire », Revue Ivoirienne des Lettres, 12, p. 45-60.
III. Rapports et documents officiels
UNESCO, 2015, Rapport mondial de suivi sur l’éducation pour tous, Paris, UNESCO.
Page 46 sur 52

RÉSUMÉ
Ce mémoire analyse le discours de la presse ivoirienne entre 2010 et 2020. Selon Bourdieu (1982), le langage est un pouvoir symbolique ; nous montrons que les titres de presse construisent une opinion publique polarisée, à partir d’un corpus de 300 articles publiés en 2015.
Mots clés : presse, discours, pouvoir symbolique, Côte d’Ivoire, 2015.

ABSTRACT
This dissertation analyzes the discourse of the Ivorian press between 2010 and 2020. According to Bourdieu (1982), language is a symbolic power; we show that headlines build a polarized public opinion, based on a corpus of 300 articles published in 2015.
Keywords: press, discourse, symbolic power, Ivory Coast, 2015.

ANNEXES
Annexe 1 : Questionnaire administré aux lecteurs (juin 2019)
1. Depuis quand lisez-vous la presse ? Avant 2010, après 2010.
2. MBEMBE Achille, 2000, est-il cité dans vos cours ? Oui, Non.

TABLE DES MATIÈRES
DÉDICACE ........................................ 2
INTRODUCTION .................................... 5
BIBLIOGRAPHIE ................................... 45
RÉSUMÉ .......................................... 52`;
// ce que la bibliographie générée doit contenir : les cinq sources citées, et rien d’autre
// (Koné, 2015 est dans la liste mais n’est cité nulle part : il n’est pas repris)
module.exports.attendu = ["Bourdieu 1982", "Diakité 1985", "Fowler 1979", "Mbembe 2000", "UNESCO 2015"];
