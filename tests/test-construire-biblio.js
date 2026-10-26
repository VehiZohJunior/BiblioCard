// Construire la bibliographie à partir des citations : classement des candidats renvoyés par OpenAlex et
// Open Library (données de la forme réelle, observées le 2026-10-26), choix de l’édition, ville de l’éditeur.
const E = require('../js/moteur.js');
let err = 0;
const egal = (o, a, q) => { if (o !== a) { err++; console.log(`ÉCHEC ${q}\n  attendu ${JSON.stringify(a)}\n  obtenu  ${JSON.stringify(o)}`); } };
const oa = (titre, an, auteurs, cites, extra = {}) => E.fromOpenAlex({display_name: titre, publication_year: an, type: extra.type || "book", cited_by_count: cites,
  authorships: auteurs.map(n => ({author: {display_name: n}})), primary_location: {source: extra.source || null}, biblio: extra.biblio || {}});
const ol = (titre, an, auteurs, editions = 1) => E.fromOpenLibrary({title: titre, first_publish_year: an, author_name: auteurs, edition_count: editions, key: "/works/OL1W"});
const premier = (cite, ctx, cands) => { const r = E.classerCandidats(cite, ctx, cands); return [r.verdict, r.L[0] ? r.L[0].s.title : ""]; };

// 1. Homonyme écarté par l’initiale : « E. Ostrom » n’est pas Charles W. Ostrom ; « Elinor Ostrom B » (lettre parasite d’OpenAlex)
const ostrom = premier({family: "Ostrom", year: "1990", raw: "E. Ostrom (1990"}, "E. Ostrom (1990) a enfin proposé une théorie de la gouvernance des communs.",
  [oa("Time Series Analysis", 1990, ["Charles W. Ostrom"], 196), oa("Governing the Commons", 1990, ["Elinor Ostrom B"], 20585, {source: {host_organization_name: "Cambridge University Press"}})]);
egal(ostrom.join(" | "), "sure | Governing the Commons", "Ostrom");

// 2. Compte rendu d’un autre auteur écarté ; « Bourdıeu » (ı sans point) reconnu ; « langage » ≈ « linguistiques »
const bourdieu = premier({family: "Bourdieu", year: "1982", raw: "P. Bourdieu (1982"}, "Comme l’a montré P. Bourdieu (1982, p. 64), le langage est un instrument de pouvoir symbolique.",
  [oa("La Distinction: Critique sociale du jugement", 1983, ["David Spurr", "Pierre Bourdieu"], 145, {type: "article", source: {display_name: "SubStance"}}),
   oa("Les rites comme actes d'institution", 1982, ["Pierre Bourdıeu"], 824, {type: "article", source: {display_name: "Actes de la recherche"}}),
   oa("Ce que parler veut dire : l'économie des échanges linguistiques", 1982, ["Pierre Bourdıeu"], 453)]);
egal(bourdieu[1], "Ce que parler veut dire : l'économie des échanges linguistiques", "Bourdieu");

// 3. « pouvoir » ≈ « power » : Discourse and Power plutôt que Discourse and Context ; particule « van »
const vd = premier({family: "van Dijk", year: "2008", raw: "T. A. van Dijk (2008"}, "T. A. van Dijk (2008, p. 12) insiste sur le contrôle du discours par les élites, qui exercent un pouvoir.",
  [oa("Discourse and Context", 2008, ["Teun A. van Dijk"], 1006), ol("Discourse and power", 2008, ["Teun A. van Dijk"]), oa("Discourse and Power", 2008, ["Teun A. van Dijk"], 486)]);
egal(vd[1].toLowerCase(), "discourse and power", "van Dijk");

// 4. Aucun candidat de cet auteur : introuvable, rien n’est inventé
egal(premier({family: "Kouassi", year: "2019", raw: "A. Kouassi (2019"}, "", [oa("Autre chose", 2019, ["Jean Dupont"], 3)]).join(" | "), "rien | ", "introuvable");

// 5. Édition de l’année citée (Open Library) : éditeur et ville ; à défaut, ville de l’éditeur connu
const mbembe = ol("De la postcolonie", 2000, ["Achille Mbembe"], 9);
E.appliquerEdition(mbembe, [{publish_date: "2005", publishers: ["Hece Yayinlari"], publish_places: ["Istanbul"]}, {publish_date: "2000", publishers: ["Karthala"], publish_places: ["Paris"]}], "2000");
egal(`${mbembe.publisher} | ${mbembe.city}`, "Karthala | Paris", "édition de l’année citée");
const ostromFiche = oa("Governing the Commons", 1990, ["Elinor Ostrom"], 1, {source: {host_organization_name: "Cambridge University Press"}});
egal(`${ostromFiche.publisher} | ${ostromFiche.city}`, "Cambridge University Press | Cambridge", "ville de l’éditeur");

// 6. Un livre rangé parmi les « articles » par OpenAlex (sans revue, volume ni pages) redevient un livre
egal(oa("Discours et analyse du discours : une introduction", 2014, ["Dominique Maingueneau"], 14, {type: "article"}).type, "book", "livre mal classé");
egal(oa("Framing", 1993, ["Robert M. Entman"], 16164, {type: "article", source: {display_name: "Journal of Communication"}, biblio: {volume: "43", first_page: "51", last_page: "58"}}).type, "article", "vrai article");

// 7. Citation de la phrase, et particule dans les citations du texte
egal(E.findCitations("Comme l’a montré T. A. van Dijk (2008, p. 12), et l’œuvre de Mbembe (2000).").map(c => c.family).join(" | "), "van Dijk | Mbembe", "particules");
egal(/postcolonie/.test(E.contexteCitation("Intro. Pour l’Afrique, A. Mbembe (2000) a décrit la postcolonie. Suite.", "A. Mbembe (2000")), true, "contexte de la citation");

console.log(err ? `erreurs : ${err}` : "erreurs : aucune");
