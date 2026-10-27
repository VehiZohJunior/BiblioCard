// Formes réelles de citation des sources dans les mémoires, thèses et articles (français et anglais),
// et ce que SCIENTUS doit en tirer : « Nom année » pour chaque source. s = sources attendues, [] = aucune.
module.exports = [
  // ---- auteur-date, forme NORCAMES
  {t: "Comme l’a montré P. Bourdieu (1982, p. 64), le langage est un instrument de pouvoir.", s: ["Bourdieu 1982"]},
  {t: "Cette crise est vécue comme globale (S. Diakité, 1985, p. 105).", s: ["Diakité 1985"]},
  {t: "S. B. Diagne (1991, p. 2) écrit que la société civile porte le développement.", s: ["Diagne 1991"]},
  {t: "D’après S. Amin (1996, p. 12) et S. Diakité (1985), la mondialisation est inégale.", s: ["Amin 1996", "Diakité 1985"]},
  // ---- auteur-date, autres usages
  {t: "Plusieurs travaux le confirment (Bourdieu, 1982 ; Mbembe, 2000).", s: ["Bourdieu 1982", "Mbembe 2000"]},
  {t: "Le marché linguistique est inégal (Bourdieu 1982: 64).", s: ["Bourdieu 1982"]},
  {t: "Pour Mbembe (2000 : 45), la postcolonie est un régime de violence.", s: ["Mbembe 2000"]},
  {t: "Il s’agit d’une reproduction sociale (cf. Bourdieu, 1982).", s: ["Bourdieu 1982"]},
  {t: "La violence y est banalisée (voir notamment Mbembe, 2000, p. 12-15).", s: ["Mbembe 2000"]},
  {t: "Bourdieu (1979, 1982) a étudié le goût et le langage.", s: ["Bourdieu 1979", "Bourdieu 1982"]},
  {t: "Ces positions sont constantes (Bourdieu, 1979 ; 1982).", s: ["Bourdieu 1979", "Bourdieu 1982"]},
  {t: "T. A. Van Dijk (1993a, 1993b) distingue cognition et société.", s: ["Dijk 1993a", "Dijk 1993b"]},
  // ---- plusieurs auteurs
  {t: "Selon Bourdieu et Passeron (1970), l’école reproduit les inégalités.", s: ["Bourdieu 1970"]},
  {t: "Le langage véhicule une idéologie (Hodge & Kress, 1979).", s: ["Hodge 1979"]},
  {t: "La critique du langage est ancienne (Fowler et al., 1979).", s: ["Fowler 1979"]},
  {t: "J. Kouadio et A. Traoré (2019) décrivent la presse ivoirienne.", s: ["Kouadio 2019"]},
  {t: "Smith, Jones and Lee (2010) argue that framing matters.", s: ["Smith 2010"]},
  // ---- noms particuliers
  {t: "Pour M. de Certeau (1980), l’usager braconne.", s: ["Certeau 1980"]},
  {t: "J.-P. Sartre (1943) définit la mauvaise foi.", s: ["Sartre 1943"]},
  {t: "J. Ki-Zerbo (1972) retrace l’histoire de l’Afrique noire.", s: ["Ki-Zerbo 1972"]},
  {t: "B. N’Guessan (2015) analyse la titrologie.", s: ["N’Guessan 2015"]},
  {t: "Le Goff (1977) propose un autre Moyen Âge.", s: ["Le Goff 1977"]},
  {t: "La longue durée structure l’histoire (Le Goff, 1977).", s: ["Le Goff 1977"]},
  {t: "Q. O. Al-Azzawi (2018) étudie l’informativité.", s: ["Al-Azzawi 2018"]},
  {t: "Le roman maghrébin s’en empare (Ben Jelloun, 1987).", s: ["Ben Jelloun 1987"]},
  {t: "Shannon’s (1948) theory of communication remains central.", s: ["Shannon 1948"]},
  // ---- dates particulières
  {t: "La violence coloniale est structurelle (Fanon, [1961] 2002, p. 40).", s: ["Fanon 2002"]},
  {t: "Ce récit est rapporté par la tradition orale (Kouassi, s.d.).", s: ["Kouassi s.d."]},
  // ---- auteurs institutionnels
  {t: "Le taux de scolarisation progresse (UNESCO, 2015).", s: ["UNESCO 2015"]},
  {t: "Selon l’INS (2021), la population urbaine double.", s: ["INS 2021"]},
  // ---- citation de seconde main
  {t: "Bourdieu (1982) cité par Kouassi (2015) insiste sur le capital symbolique.", s: ["Bourdieu 1982", "Kouassi 2015"]},
  {t: "Le capital symbolique est central (Bourdieu, 1982, cité par Kouassi, 2015).", s: ["Bourdieu 1982", "Kouassi 2015"]},
  // ---- formes vues dans de vrais mémoires
  {t: "Accordingly, H. Mathane (2023, p. 2) puts that amplification develops the text.", s: ["Mathane 2023"]},
  {t: "They discussed different theories and approaches. (B.L Dragana, 2016, p.36-37).", s: ["Dragana 2016"]},
  {t: "Mark clarifies the relationship between the clauses (Delbert Burkett, 2018).", s: ["Burkett 2018"]},
  {t: "Le mot signifie rigoureux, austère, rigide. (Dictionnaire De La Langue Française, 1989).", s: ["Dictionnaire De La Langue Française 1989"]},
  {t: "As Van\nDijk (1995) shows, ideology is cognitive.", s: ["Van Dijk 1995"]},
  {t: "En abordant l’identité dans son ouvrage, Orientalism (1978), Saïd Edward soulève la question du regard.", s: []},
  // ---- pièges : ce ne sont pas des sources
  {t: "En 1960, la Côte d’Ivoire (Afrique de l’Ouest) devient indépendante.", s: []},
  {t: "L’enquête a été menée à Bouaké (Côte d’Ivoire, 2019) auprès de 120 élèves.", s: []},
  {t: "Les entretiens ont eu lieu à Abidjan (juin 2019).", s: []},
  {t: "La loi n° 2013-450 du 19 juin 2013 protège les données (Abidjan, 2013).", s: []},
  {t: "Le taux atteint 45 % (Tableau 2, 2020).", s: []},
  {t: "Cette période (1960-1990) est celle du parti unique.", s: []},
];
// sources en notes de bas de page (histoire, droit, lettres) : la note donne la référence complète
module.exports.notes = {
  t: `La parole est un pouvoir symbolique¹. La postcolonie en est une illustration².

1 P. Bourdieu, Ce que parler veut dire, Paris, Fayard, 1982, p. 64.
2 A. MBEMBE, De la postcolonie, Paris, Karthala, 2000, p. 30.
3 Ibid., p. 32.
4 P. Bourdieu, op. cit., p. 70.
5 J. Ki-Zerbo, Histoire de l’Afrique noire, Paris, Hatier, 1972, p. 15.`,
  s: ["Bourdieu 1982", "Mbembe 2000", "Ki-Zerbo 1972"],
};
