/* RELAIS SCIENTUS : lecture des informations bibliographiques publiques d’une page de présentation d’éditeur.
   À installer sur un compte Cloudflare gratuit (Workers), au nom du propriétaire de SCIENTUS.

   Pourquoi : un navigateur interdit à une page web (SCIENTUS) de lire la page d’un autre site. Ce relais lit la
   page de présentation à sa place et ne renvoie QUE les champs de bibliographie que l’éditeur y publie dans ses
   balises (citation_*, Dublin Core, PRISM) : titre, auteurs, revue ou ouvrage, volume, numéro, pages, éditeur,
   année, DOI, ISBN, université. Jamais le résumé, les mots clés, l’adresse e-mail ou l’affiliation des auteurs.

   Règles :
   - n’accepte que les demandes de SCIENTUS (ORIGINES) et la méthode GET ;
   - adresse demandée : un DOI (résolu par doi.org) ou une page web publique en https ; jamais une adresse privée ;
   - respecte les éditeurs : une page protégée contre les robots (403, 429, défi anti-robot) n’est jamais
     contournée, le relais répond simplement « bloque » ;
   - garde chaque réponse 30 jours en mémoire, pour ne pas solliciter deux fois l’éditeur. */
const ORIGINES = ["https://vehizohjunior.github.io", "http://localhost:5240"];
const AGENT = "SCIENTUS-relais/1.0 (+https://vehizohjunior.github.io/BiblioCard/; métadonnées bibliographiques publiques)";
const TAILLE_MAX = 1500000;

// balises gardées, et le champ de SCIENTUS auquel chacune correspond
const BALISES = {
  "citation_title": "titre", "dc.title": "titre",
  "citation_author": "auteurs", "dc.creator": "auteurs",
  "citation_journal_title": "revue", "prism.publicationname": "revue", "citation_conference_title": "revue",
  "citation_inbook_title": "ouvrage", "citation_book_title": "ouvrage",
  "citation_volume": "volume", "prism.volume": "volume",
  "citation_issue": "numero", "prism.number": "numero", "prism.issueidentifier": "numero",
  "citation_firstpage": "pageDebut", "prism.startingpage": "pageDebut",
  "citation_lastpage": "pageFin", "prism.endingpage": "pageFin",
  "citation_publisher": "editeur", "dc.publisher": "editeur",
  "citation_publication_date": "date", "citation_date": "date", "citation_year": "date", "citation_cover_date": "date", "citation_online_date": "dateEnLigne", "dc.date": "date", "prism.publicationdate": "date",
  "citation_doi": "doi", "prism.doi": "doi", "dc.identifier": "identifiant",
  "citation_isbn": "isbn",
  "citation_dissertation_institution": "universite", "citation_technical_report_institution": "institution",
};
// plateformes de diffusion : ce ne sont pas les éditeurs scientifiques
const PLATEFORMES = /pers[ée]e|portail des revues|cairn|jstor|openedition|[ée]rudit|project muse|scielo|ajol|african journals online/i;
const entites = t => String(t).replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(+n)).replace(/&#x([\da-f]+);/gi, (m, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&quot;/g, "\"").replace(/&apos;|&#39;/g, "’").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
function lireMetaEditeur(html){
  const tete = String(html).slice(0, TAILLE_MAX).split(/<\/head>/i)[0];
  const brut = {};
  for(const m of tete.matchAll(/<meta\b[^>]*>/gi)){
    const attr = {}; for(const a of m[0].matchAll(/([\w:.-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) attr[a[1].toLowerCase()] = a[3] !== undefined ? a[3] : a[4];
    const nom = String(attr.name || attr.property || "").toLowerCase(), champ = BALISES[nom];
    const val = entites(attr.content || "").replace(/\s+/g, " ").trim();
    if(!champ || !val || val.length > 400) continue;
    (brut[champ] = brut[champ] || []).push(val);
  }
  const un = k => (brut[k] || [])[0] || "";
  const f = {titre: un("titre"), auteurs: [...new Set(brut.auteurs || [])].slice(0, 100), revue: un("revue"), ouvrage: un("ouvrage"),
    volume: un("volume"), numero: un("numero"), editeur: (brut.editeur || []).find(e => !PLATEFORMES.test(e)) || "",
    annee: ((un("date") || un("dateEnLigne")).match(/\b(1[5-9]\d{2}|20\d{2})\b/) || [""])[0], isbn: un("isbn"), universite: un("universite") || un("institution"),
    doi: un("doi") || ((brut.identifiant || []).map(x => (x.match(/10\.\d{4,9}\/\S+/) || [""])[0]).find(Boolean) || "")};
  const d = un("pageDebut"), fin = un("pageFin"); f.pages = d && fin && d !== fin ? `${d}-${fin}` : d;
  // Dublin Core (Persée) : « isPartOf » donne la revue, à côté d’un ISSN et d’identifiants
  if(!f.revue) for(const m of tete.matchAll(/<meta\b[^>]*>/gi)){ const n = (m[0].match(/name\s*=\s*"([^"]*)"/i) || [])[1]; const c = (m[0].match(/content\s*=\s*"([^"]*)"/i) || [])[1];
    if(/^dc\.ispartof$/i.test(n || "") && c && /\p{L}{3,}\s+\p{L}/u.test(entites(c)) && !/_/.test(c)){ f.revue = entites(c).trim(); break; } }
  f.doi = f.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
  return f.titre ? f : null;
}
// jamais une adresse du réseau privé ou de la machine elle-même
function adressePublique(u){
  if(u.protocol !== "https:" && u.protocol !== "http:") return false;
  const h = u.hostname.toLowerCase();
  if(!h.includes(".") || /^(localhost|.*\.local|.*\.internal|.*\.lan)$/.test(h)) return false;
  if(/^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.startsWith("[") || h.includes(":")) return false; // adresse IP brute
  return true;
}
const reponse = (corps, statut, origine) => new Response(JSON.stringify(corps), {status: statut, headers: {"Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": origine || ORIGINES[0], "Vary": "Origin", "Cache-Control": "public, max-age=2592000"}});
async function traiter(req){
  const origine = req.headers.get("Origin") || "";
  if(req.method === "OPTIONS") return new Response(null, {status: 204, headers: {"Access-Control-Allow-Origin": ORIGINES.includes(origine) ? origine : ORIGINES[0], "Access-Control-Allow-Methods": "GET", "Vary": "Origin"}});
  if(req.method !== "GET") return reponse({erreur: "méthode refusée"}, 405);
  if(!ORIGINES.includes(origine)) return reponse({erreur: "origine refusée"}, 403);
  const q = new URL(req.url).searchParams, doi = (q.get("doi") || "").trim(), url = (q.get("url") || "").trim();
  let cible;
  if(doi){ if(!/^10\.\d{4,9}\/\S{1,300}$/.test(doi)) return reponse({erreur: "DOI invalide"}, 400, origine); cible = new URL("https://doi.org/" + doi.split("/").map(encodeURIComponent).join("/")); }
  else { try{ cible = new URL(url); }catch(e){ return reponse({erreur: "adresse invalide"}, 400, origine); } if(!adressePublique(cible)) return reponse({erreur: "adresse refusée"}, 400, origine); }
  const ctl = new AbortController(); const minuteur = setTimeout(() => ctl.abort(), 12000);
  try{
    const r = await fetch(cible.toString(), {redirect: "follow", signal: ctl.signal, headers: {"User-Agent": AGENT, "Accept": "text/html,application/xhtml+xml", "Accept-Language": "fr,en;q=0.8"}});
    // les redirections ne doivent pas mener vers une adresse privée
    let finale; try{ finale = new URL(r.url || cible.toString()); }catch(e){ finale = cible; }
    if(!adressePublique(finale)) return reponse({erreur: "adresse refusée"}, 400, origine);
    if(r.status === 403 || r.status === 429 || r.status === 503) return reponse({bloque: true, page: finale.toString()}, 200, origine);
    if(!r.ok) return reponse({introuvable: true, statut: r.status}, 200, origine);
    if(!/html/i.test(r.headers.get("Content-Type") || "")) return reponse({introuvable: true}, 200, origine);
    const html = (await r.text()).slice(0, TAILLE_MAX);
    if(/anubis_challenge|challenge-platform|cf-chl|Just a moment\.\.\.|Client Challenge|captcha/i.test(html.slice(0, 20000)) && !/citation_title/i.test(html)) return reponse({bloque: true, page: finale.toString()}, 200, origine);
    const fiche = lireMetaEditeur(html);
    return reponse(fiche ? {fiche, page: finale.toString()} : {introuvable: true, page: finale.toString()}, 200, origine);
  }catch(e){ return reponse({erreur: "page injoignable"}, 200, origine); }
  finally { clearTimeout(minuteur); }
}
export default {
  async fetch(req, env, ctx){
    // mémoire de 30 jours (Cloudflare) : la même page n’est jamais redemandée à l’éditeur
    const cache = typeof caches !== "undefined" ? caches.default : null;
    const u = new URL(req.url); u.searchParams.set("_origine", req.headers.get("Origin") || ""); // une réponse par origine (en-tête CORS)
    const cle = new Request(u.toString(), {method: "GET"});
    if(cache && req.method === "GET"){ const c = await cache.match(cle); if(c) return c; }
    const rep = await traiter(req);
    if(cache && req.method === "GET" && rep.status === 200 && ctx && ctx.waitUntil) ctx.waitUntil(cache.put(cle, rep.clone()));
    return rep;
  },
};
