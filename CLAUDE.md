# BiblioCard : contexte pour Claude Code

## Le projet en bref

BiblioCard est une application web pour les étudiants et chercheurs, d’abord dans l’espace universitaire francophone africain (CAMES), puis à l’international. L’étudiant dépose son mémoire ou sa thèse (Word ou PDF) : l’outil en tire la bibliographie, la met en forme dans la norme choisie, la contrôle et peut corriger le fichier Word lui-même. Le module **Lian’Z** permet de rédiger par dictée, avec un contrôle des similitudes.

Porteur du projet : VEHI Zoh Junior, doctorant en linguistique (analyse du discours des médias) à Abidjan. Il construit seul, sans équipe de développement. Il veut présenter BiblioCard au comité scientifique de son université comme une solution innovante et structurante, et en faire l’outil de référence du domaine.

## Contraintes à respecter absolument

- **Uniquement des outils gratuits.** Aucun service payant. **Pas de Netlify.** Hébergement : GitHub Pages (tests, usage non commercial) ou Cloudflare Pages (usage commercial). Base de données : Supabase, offre gratuite.
- **Pas d’étape de compilation ni de framework.** HTML, CSS et JavaScript simples, chargés tels quels. Les bibliothèques externes viennent de CDN, à une version fixée : mammoth 1.6.0, pdf.js 3.11.174, JSZip 3.10.1 (cdnjs), Tesseract.js 5.1.1 et transformers.js 3.0.2 (jsDelivr), office.js (Microsoft).
- **Confidentialité.** Les documents de l’utilisateur sont lus dans le navigateur et ne sont jamais envoyés ni conservés en ligne. Seules les références extraites sont enregistrées. Toute nouvelle fonction doit respecter ce principe ; si une donnée doit sortir de l’appareil, l’indiquer dans la section « Méthode et éthique ».
- **Intégrité scientifique.** L’outil n’écrit jamais à la place de l’étudiant. Il met en forme, vérifie et signale. La dictée transcrit fidèlement, sans reformuler.
- **Honnêteté.** Ne jamais annoncer comme fiable ce qui n’a pas été testé. Les références analysées automatiquement portent la mention « À relire ».

## Structure des fichiers

```
index.html              structure de la page
css/bibliocard.css      styles (variables de couleur, modes clair et sombre)
js/moteur.js            moteur pur, sans DOM : normes, lecture des références,
                        contrôles, analyse, fiabilité, similitudes. Exporte ses
                        fonctions pour Node (module.exports) : testable seul.
js/i18n-en.js           dictionnaire anglais (window.I18N_EN : exact, re, frag)
js/app.js               interface et logique de l’application
sw.js                   service worker (hors connexion) — incrémenter CACHE à
                        chaque modification des fichiers
manifest.webmanifest    installation sur téléphone
addin/                  module pour Microsoft Word (manifest.xml, taskpane.html)
tests/                  tests automatiques (jsdom) : npm install, puis npm test
LISEZ-MOI.txt           mode d’emploi pour l’utilisateur (mise en ligne, Supabase,
                        module Word)
```

Les scripts sont des scripts classiques qui partagent la portée globale, chargés dans cet ordre : `i18n-en.js`, `moteur.js`, `app.js`. Une version « tout-en-un » (un seul fichier HTML) existe aussi comme démonstration dans Claude ; **la version de ce dossier fait désormais référence**.

## Disposition de l’interface

Inspirée de l’application Claude :
- **Centre** : uniquement la conversation (`#thread`). Chaque demande (fichier déposé, référence collée, commande comme « passe en APA ») devient un message ; l’application répond avec un aperçu et des boutons d’action. Fonctions clés : `post()`, `renderThread()`, `appBody()`, `intent()`, `runIntent()`, `runAct()`.
- **Bas** : barre de saisie (`#composer`) avec + (ajouter), pastille de norme, micro, bouton rond (rédaction Lian’Z, ou envoi quand il y a du texte).
- **Droite** : volet des résultats (`#side`) : bibliographie et indicateur, À faire, Contrôles et existence, Analyse et fiabilité. `openSide()`, `closeSide()`, groupes `SGROUPS`.
- **Gauche** : menu (`#dash`) : nouveau projet, projets récents, navigation, réglages. `openDash()`, `dashTab()`, groupes `DGROUPS`. `openDash(nom)` redirige vers le volet de droite quand la section y appartient.

## Données et enregistrement

- `state` : réglages globaux et données du projet ouvert. Les clés propres à un projet sont listées dans `PKEYS` (références, norme, profil, existence, commentaires, brouillon, conversation) ; les clés globales dans `GKEYS`. `syncCurrent()` recopie le projet ouvert dans `state.projects`, `loadProject()` fait l’inverse.
- Enregistrement : `save()` (avec délai) écrit dans `localStorage` (clé `bibliocard.v3`), puis :
  - dans Claude, la base de l’artefact via `window.claude.use("db")` ;
  - sur le site, Supabase si l’utilisateur est connecté (`sync.push()`, table `bibliotheques`).
- `cap(nom)` renvoie `null` hors de Claude : toutes les fonctions propres à Claude (IA `sample`, `db`, `user`, `downloads`) doivent avoir un repli. Ne pas les supprimer, elles servent la démonstration dans Claude.
- Documents de comparaison et enregistrements de voix : IndexedDB (`bibliocard`, réserves `corpus` et `voix`).
- Le fichier Word d’origine (`f.buf`) n’est gardé qu’en mémoire, pour la correction du document.

## Le moteur (js/moteur.js)

- Modèle d’une référence : `blank()` — type (`article`, `book`, `chapter`, `thesis`, `report`, `webpage`), `authors` (tableau de `{family, given}`), `title`, `year`, `container`, `volume`, `issue`, `pages`, `city`, `publisher`, `edition`, `translator`, `editors`, `genre`, `url`, `doi`, `isbn`, `accessed`, `origin`, `file`.
- Normes dans `STYLES` : `cames` (NORCAMES/LSH, avec profils de revues `CAMES_PROFILES`), `apa`, `iso`, `chicago`, `mla`, `vancouver` (numérotée : `numberSources()`), `notes` (notes de bas de page à la française). Chaque norme a `bib()` et `cite()`. Les sorties sont du HTML échappé (`esc`, `I` pour l’italique).
- Lecture : `findBibSection()`, `splitReferences()`, `parseRefHeuristic()` (l’italique de Word est marqué ⟦…⟧), `parseBibtex()`, `parseRis()`, `fromCrossref()`.
- Contrôles : `checks()` (champs manquants selon la norme), `verify()` (citations auteur-date), `verifyNumeric()` (citations [n]) ; dans l’interface, toujours passer par `verifyAny()`.
- Indicateurs : `conformity()`, `analyze()`, `evalRecords()`, `evalStats()`.
- Lian’Z : `applyVoice()` (commandes vocales), `compareTexts()`, `internalRepeats()`, `pickProbes()`.

## La norme NORCAMES/LSH (document officiel, lu le 2026-10-24)

Source : « Normes d’édition des revues de lettres et sciences humaines dans le système CAMES (NORCAMES/LSH) », 2 pages, fourni par le porteur (DownloadsNORMES-EDITORIALES_CAMES.pdf, non versé au dépôt). `tests/test-norcames.js` reproduit ses exemples mot pour mot.

- **Référence** : NOM Prénom(s), Année, Zone titre, Lieu de publication, Zone Éditeur, pages (p.) pour un article. Ordre alphabétique des noms.
- **Zone titre** : article en romain entre guillemets ; ouvrage, mémoire, thèse, rapport, revue ou journal en italique. Traduction ou réédition juste après le titre (« trad. X », « 2nde éd. »). Tout ce qui est entre l’année et le lieu est le titre : virgules et sous-titres compris (`camesTitleZone`).
- **Zone Éditeur** : maison d’édition (ouvrage) ; nom et numéro/volume de la revue (article).
- **Citation dans le texte** : « (S. Diakité, 1985, p. 105) » ou « M. Ascher (1998, p. 223) », toujours avec l’initiale du prénom. Contrôle : `verify().noInitial`, tâche « citations sans l’initiale du prénom » (norme CAMES seulement).
- **Hors bibliographie** (non contrôlé à ce jour) : structure de l’article (Titre, Prénom et Nom, Institution, adresse électronique, Résumé, Mots clés, Abstract, Key words, Introduction, [Méthodologie, Résultats et Discussion,] Conclusion, Références bibliographiques) ; parties titrées et numérotées 1., 1.1., 2.2.1 (sauf introduction, conclusion, bibliographie) ; citations en romain entre guillemets, au-delà de trois lignes en retrait, interligne 1, police diminuée d’un point (Book Antiqua) ; sources historiques, références orales et notes explicatives numérotées en continu en bas de page. La typographie est fixée par chaque revue (profils `CAMES_PROFILES`).

## Conventions

- **Interface en français, tutoiement**, phrases courtes. Typographie française : apostrophe typographique ’, guillemets « » avec espaces insécables (`NB`), espace insécable avant ; : ! ?
- **Toute nouvelle chaîne d’interface doit être ajoutée à `js/i18n-en.js`** : dans `exact` pour un texte fixe, dans `re` pour un texte avec des nombres ou des noms. Les contenus de l’utilisateur (titres, noms, références) sont exclus de la traduction : classes `.ref`, `.c`, attribut `data-notr`.
- Les références restent rédigées selon leur norme, quelle que soit la langue de l’interface.
- Accessibilité : chaque champ a un libellé, chaque bouton à icône un `aria-label`. Contraste minimum 4,5 pour 1 ; vérifier les modes clair et sombre.
- Mobile d’abord : la plupart des utilisateurs sont sur téléphone, parfois avec une connexion faible.

## Tests

`cd tests && npm install && npm test`. Les tests chargent l’application dans jsdom via `tests/charger.js`, qui reconstitue un fichier unique à partir des modules. Chaque test se termine par la ligne `erreurs : aucune` quand tout va bien ; `lancer.js` affiche le bilan.

Règle : **après chaque modification, relancer `npm test` ; pour chaque nouvelle fonction, ajouter un test** `tests/test-*.js`. Pour les vérifications visuelles et d’accessibilité, Playwright et axe-core ont été utilisés (captures au format téléphone 412 × 880, modes clair et sombre).

## Tests en conditions réelles

En ligne sur https://vehizohjunior.github.io/BiblioCard/ (dépôt VehiZohJunior/BiblioCard, branche main, racine). Résultats du 2026-10-24 :

- **Fait : existence (OpenAlex, HAL, CrossRef) et DOI.** Référence vraie trouvée, référence inventée « introuvable », faux DOI et DOI d’une autre publication « suspects ». HAL répond depuis le site.
- **Fait : similitudes.** Passage copié de Wikipédia repéré (82 mots, source nommée) ; texte original 0 % ; même passage entre guillemets avec source non signalé.
- **Fait : PDF scanné (Tesseract).** Page scannée lue sans faute en quelques secondes. Corrigé : Tesseract met une ligne vide avant les lignes en retrait, les références étaient coupées en deux (test `tests/test-pdf-scanne.js`). Pas encore essayé : vrai scan de mauvaise qualité, photo au téléphone.
- **Fait : hors connexion.** Serveur coupé, l’app se recharge avec moteur, mammoth, pdf.js et JSZip. Le service worker ne s’inscrit qu’en https.
- **Fait en partie : Whisper.** Modèle téléchargé (21 s) ; voix de synthèse française transcrite avec une seule erreur (« médias ivoiriens » → « médiasivariens »), 12 s pour 6 s d’audio. Reste : un vrai micro, de vraies voix ivoiriennes, le moteur « Direct ».
- **Reste : Supabase** (compte du porteur), **module Word** (vrai Word), **installation sur téléphone**.

## Pistes pour la suite

- Constituer le corpus de fiabilité : au moins 200 références relues, issues de vrais mémoires ivoiriens, pour publier un taux mesuré.
- Correction des citations dans le texte du document Word (aujourd’hui, seule la bibliographie est remplacée).
- Faire valider les profils de revues par leurs rédactions (Akofena, Kurukan Fuga…).
- Modèle de dictée pour les langues ivoiriennes, à partir du corpus collecté par le module de voix (lien direct avec le profil de linguiste computationnel du porteur).
- Le support de présentation pour le comité scientifique se prépare dans le chat Claude, pas ici.
