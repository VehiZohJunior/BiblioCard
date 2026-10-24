// Jeu de références réalistes (formes rencontrées dans les mémoires et thèses francophones)
// et ce que la lecture automatique doit en tirer. a = noms de famille, séparés par « / ».
module.exports = [
  // ---- NORCAMES / LSH : NOM Prénom, année, titre, ville, éditeur
  {l: "AMIN Samir, 1996, Les Défis de la mondialisation, Paris, L'Harmattan.", a: "Amin", y: "1996", type: "book", title: "Les Défis de la mondialisation", city: "Paris", publisher: "L'Harmattan"},
  {l: "KOUADIO Jean et TRAORÉ Awa, 2019, Les médias ivoiriens et la crise, Abidjan, Éditions du CERAP.", a: "Kouadio/Traoré", y: "2019", type: "book", title: "Les médias ivoiriens et la crise", city: "Abidjan", publisher: "Éditions du CERAP"},
  {l: "DIAGNE Souleymane Bachir, 2003, « Islam et philosophie. Leçons d'une rencontre », Diogène, n° 202, p. 145-151.", a: "Diagne", y: "2003", type: "article", title: "Islam et philosophie. Leçons d'une rencontre", container: "Diogène", issue: "202", pages: "145-151"},
  {l: "KONÉ Aminata, 2021, Discours médiatique en Côte d'Ivoire, Thèse de doctorat, Abidjan, Université Félix Houphouët-Boigny.", a: "Koné", y: "2021", type: "thesis", title: "Discours médiatique en Côte d'Ivoire", publisher: "Université Félix Houphouët-Boigny", city: "Abidjan"},
  {l: "N'GUESSAN Kouadio Germain, 2018, « Le français ivoirien dans la presse écrite », Akofena, n° 4, vol. 2, p. 33-48.", a: "N'Guessan", y: "2018", type: "article", title: "Le français ivoirien dans la presse écrite", container: "Akofena", issue: "4", volume: "2", pages: "33-48"},
  {l: "KOUAMÉ Koia Jean-Martial, 2012, « Les langues ivoiriennes et l'école », in KOUADIO N'Guessan Jérémie (dir.), Langues et développement, Abidjan, EDUCI, p. 71-90.", a: "Kouamé", y: "2012", type: "chapter", title: "Les langues ivoiriennes et l'école", pages: "71-90", city: "Abidjan", publisher: "EDUCI"},
  {l: "BAMBA Moussa, 2015, Mémoire de master en sciences du langage, Bouaké, Université Alassane Ouattara.", a: "Bamba", y: "2015", type: "thesis", city: "Bouaké", publisher: "Université Alassane Ouattara"},
  {l: "SANGARÉ Ibrahim, 2020, « Titrologie et opinion publique à Abidjan », Kurukan Fuga, vol. 1, n° 3, p. 112-130.", a: "Sangaré", y: "2020", type: "article", title: "Titrologie et opinion publique à Abidjan", container: "Kurukan Fuga", volume: "1", issue: "3", pages: "112-130"},
  {l: "DUMONT Pierre, 1990, Le français langue africaine, Paris, L'Harmattan.", a: "Dumont", y: "1990", type: "book", title: "Le français langue africaine", city: "Paris", publisher: "L'Harmattan"},
  {l: "CHARAUDEAU Patrick, 1997, Le discours d'information médiatique. La construction du miroir social, Paris, Nathan.", a: "Charaudeau", y: "1997", type: "book", city: "Paris", publisher: "Nathan"},
  // ---- ISO 690 : NOM, Prénom. Titre. Ville : Éditeur, année.
  {l: "BERGER, Gaston, 1967. L'Homme moderne et son éducation. Paris : PUF.", a: "Berger", y: "1967", type: "book", title: "L'Homme moderne et son éducation", city: "Paris", publisher: "PUF"},
  {l: "MAINGUENEAU, Dominique, 2014. Discours et analyse du discours. Paris : Armand Colin.", a: "Maingueneau", y: "2014", type: "book", title: "Discours et analyse du discours", city: "Paris", publisher: "Armand Colin"},
  {l: "KERBRAT-ORECCHIONI, Catherine, 1980. L'Énonciation. De la subjectivité dans le langage. Paris : Armand Colin.", a: "Kerbrat-Orecchioni", y: "1980", type: "book", city: "Paris", publisher: "Armand Colin"},
  // ---- APA 7
  {l: "Ostrom, E., Walker, J., & Gardner, R. (1992). Covenants with and without a sword. American Political Science Review, 86(2), 404–417. https://doi.org/10.2307/1964229", a: "Ostrom/Walker/Gardner", y: "1992", type: "article", title: "Covenants with and without a sword", container: "American Political Science Review", volume: "86", issue: "2", pages: "404-417", doi: "10.2307/1964229"},
  {l: "Bourdieu, P. (1982). Ce que parler veut dire. Fayard.", a: "Bourdieu", y: "1982", type: "book", title: "Ce que parler veut dire", publisher: "Fayard"},
  {l: "Van Dijk, T. A. (2008). Discourse and power. Palgrave Macmillan.", a: "Van Dijk", y: "2008", type: "book", title: "Discourse and power", publisher: "Palgrave Macmillan"},
  {l: "Fairclough, N. (1995). Media discourse. Edward Arnold.", a: "Fairclough", y: "1995", type: "book", title: "Media discourse", publisher: "Edward Arnold"},
  {l: "Krieg-Planque, A. (2009). La notion de « formule » en analyse du discours. Presses universitaires de Franche-Comté.", a: "Krieg-Planque", y: "2009", type: "book", publisher: "Presses universitaires de Franche-Comté"},
  {l: "Kouassi, A. B., & Yao, K. (2021). La presse en ligne en Côte d'Ivoire. Revue ivoirienne de communication, 12(1), 45–60.", a: "Kouassi/Yao", y: "2021", type: "article", title: "La presse en ligne en Côte d'Ivoire", container: "Revue ivoirienne de communication", volume: "12", issue: "1", pages: "45-60"},
  {l: "Moirand, S. (2007). Les discours de la presse quotidienne. Observer, analyser, comprendre. Presses universitaires de France.", a: "Moirand", y: "2007", type: "book", publisher: "Presses universitaires de France"},
  // ---- Chicago / MLA : Nom, Prénom
  {l: "Bourdieu, Pierre. 1982. Ce que parler veut dire. Paris : Fayard.", a: "Bourdieu", y: "1982", type: "book", title: "Ce que parler veut dire", city: "Paris", publisher: "Fayard"},
  {l: "Le Goff, Jacques. 1977. Pour un autre Moyen Âge. Paris : Gallimard.", a: "Le Goff", y: "1977", type: "book", title: "Pour un autre Moyen Âge", city: "Paris", publisher: "Gallimard"},
  {l: "Kouadio, Jean, et Awa Traoré. 2019. Les médias ivoiriens. Abidjan : CERAP.", a: "Kouadio/Traoré", y: "2019", type: "book", title: "Les médias ivoiriens", city: "Abidjan", publisher: "CERAP"},
  {l: "Mbembe, Achille. 2000. De la postcolonie. Essai sur l'imagination politique dans l'Afrique contemporaine. Paris : Karthala.", a: "Mbembe", y: "2000", type: "book", city: "Paris", publisher: "Karthala"},
  // ---- forme « NOM P. »
  {l: "DIAKITÉ S., 1985, Violence technologique et développement, Paris, L'Harmattan.", a: "Diakité", y: "1985", type: "book", title: "Violence technologique et développement", city: "Paris", publisher: "L'Harmattan"},
  {l: "KOFFI K. E. et AKA A., 2017, Communication et développement, Abidjan, PUCI.", a: "Koffi/Aka", y: "2017", type: "book", title: "Communication et développement", city: "Abidjan", publisher: "PUCI"},
  // ---- trois auteurs et plus
  {l: "AKA Kouamé, BLÉ Raoul et DIBI Augustin, 2016, Les médias et la paix, Abidjan, Balafons.", a: "Aka/Blé/Dibi", y: "2016", type: "book", title: "Les médias et la paix", city: "Abidjan", publisher: "Balafons"},
  // ---- articles en anglais
  {l: "Bell, A. (1991). The language of news media. Blackwell.", a: "Bell", y: "1991", type: "book", title: "The language of news media", publisher: "Blackwell"},
  {l: "Entman, R. M. (1993). Framing: Toward clarification of a fractured paradigm. Journal of Communication, 43(4), 51–58.", a: "Entman", y: "1993", type: "article", container: "Journal of Communication", volume: "43", issue: "4", pages: "51-58"},
  // ---- pages web
  {l: "UNESCO, 2022, Rapport mondial sur l'éducation, consulté le 12 mars 2024, https://www.unesco.org/fr/rapport.", a: "UNESCO", y: "2022", url: "https://www.unesco.org/fr/rapport"},
  // ---- thèses
  {l: "YAO Kouassi Serge, 2019, La presse ivoirienne et les élections, Thèse de doctorat unique, Université Félix Houphouët-Boigny, Abidjan.", a: "Yao", y: "2019", type: "thesis", title: "La presse ivoirienne et les élections", city: "Abidjan", publisher: "Université Félix Houphouët-Boigny"},
  {l: "Coulibaly, N. (2016). La titrologie en Côte d'Ivoire [Thèse de doctorat, Université Félix Houphouët-Boigny].", a: "Coulibaly", y: "2016", type: "thesis", title: "La titrologie en Côte d'Ivoire", publisher: "Université Félix Houphouët-Boigny"},
  // ---- éditions et traductions
  {l: "FANON Frantz, 2002 [1961], Les Damnés de la terre, Paris, La Découverte.", a: "Fanon", y: "2002", type: "book", title: "Les Damnés de la terre", city: "Paris", publisher: "La Découverte"},
  {l: "HAMPÂTÉ BÂ Amadou, 1991, Amkoullel, l'enfant peul, Arles, Actes Sud.", a: "Hampâté Bâ", y: "1991", type: "book", city: "Arles", publisher: "Actes Sud"},
  {l: "SENGHOR Léopold Sédar, 1964, Liberté I. Négritude et humanisme, Paris, Seuil.", a: "Senghor", y: "1964", type: "book", city: "Paris", publisher: "Seuil"},
  {l: "KI-ZERBO Joseph, 1972, Histoire de l'Afrique noire, Paris, Hatier.", a: "Ki-Zerbo", y: "1972", type: "book", title: "Histoire de l'Afrique noire", city: "Paris", publisher: "Hatier"},
  {l: "AMOA Urbain, 2008, « Poétique de la parole africaine », Revue de littérature comparée, vol. 82, n° 1, p. 23-41.", a: "Amoa", y: "2008", type: "article", title: "Poétique de la parole africaine", container: "Revue de littérature comparée", volume: "82", issue: "1", pages: "23-41"},
  {l: "Kourouma, Ahmadou. 1970. Les Soleils des indépendances. Paris : Seuil.", a: "Kourouma", y: "1970", type: "book", title: "Les Soleils des indépendances", city: "Paris", publisher: "Seuil"},
  {l: "Dadié, B. B. (1959). Un Nègre à Paris. Présence africaine.", a: "Dadié", y: "1959", type: "book", title: "Un Nègre à Paris", publisher: "Présence africaine"},
  {l: "TOURÉ Mamadou, 2010, « Médias et démocratie en Afrique de l'Ouest », dans DIOUF Mamadou (dir.), Les médias africains, Dakar, CODESRIA, p. 15-38.", a: "Touré", y: "2010", type: "chapter", title: "Médias et démocratie en Afrique de l'Ouest", pages: "15-38", city: "Dakar", publisher: "CODESRIA"},
];
