/* BiblioCard : moteur (normes, analyse, contrôles) — sans dépendance au navigateur, testable avec Node — généré depuis la version autonome, ne pas modifier à la main sans relancer les tests */

const NB = "\u00A0";
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const I = s => s ? `<i>${esc(s)}</i>` : "";
const stripHtml = h => String(h).replace(/<[^>]+>/g,"").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&amp;/g,"&");
const norm = s => String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const J = (parts, sep) => parts.filter(p => p && stripHtml(p).trim()).join(sep);
const dash = p => String(p||"").replace(/\s*[-–—]+\s*/,"–");
const hy = p => String(p||"").replace(/\s*[-–—]+\s*/,"-");
// ajoute un point final sans doubler la ponctuation
const dot = h => { const t = stripHtml(h).trim(); return !t ? "" : /[.?!]$/.test(t) ? h : h + "."; };

const PARTICLES = ["de","du","des","da","di","van","von","le","la","ben","ould","el","al","dos","del"];
function parseAuthor(raw){
  raw = String(raw||"").trim().replace(/\s+/g," ");
  if(!raw) return null;
  if(raw.includes(",")){ const [f,...g] = raw.split(","); return {family:f.trim(), given:g.join(",").trim()}; }
  const p = raw.split(" ");
  if(p.length === 1) return {family:p[0], given:""};
  // NOM Prénom (style CAMES) : mots entièrement en majuscules = nom
  // (une initiale comme « S. » ou « K.-E. » n’est pas un nom)
  const caps = p.filter(w => w.length > 1 && w === w.toLocaleUpperCase("fr") && /\p{L}/u.test(w) && !/^(?:\p{Lu}\.-?)+$/u.test(w));
  if(caps.length && caps.length < p.length){
    const fam = caps.map(titleCase).join(" ");
    return {family:fam, given:p.filter(w => !caps.includes(w)).join(" ")};
  }
  let i = p.length - 1;
  while(i > 1 && PARTICLES.includes(p[i-1].toLowerCase())) i--;
  return {family:p.slice(i).join(" "), given:p.slice(0,i).join(" ")};
}
const authorToInput = a => a.family.includes(" ") || !a.given ? (a.given ? `${a.family}, ${a.given}` : a.family) : `${a.given} ${a.family}`;
const initials = g => String(g||"").split(/\s+/).filter(Boolean)
  .map(w => w.split("-").filter(Boolean).map(x => x.charAt(0).toLocaleUpperCase("fr") + ".").join("-")).join(" ");
const fullName = a => a.given ? `${a.given} ${a.family}` : a.family;
const lbl = s => s._label || s.year || "s.d.";

function listJoin(names, sep, last){ if(names.length <= 1) return names.join(""); return names.slice(0,-1).join(sep) + last + names[names.length-1]; }

/* ---------- NORCAMES / LSH ---------- */
/* Profils de revues : NORCAMES officiel et variantes publiées par les revues */
const CAMES_PROFILES = {
  norcames: {name:"NORCAMES officiel", src:"« Normes d’édition des revues de LSH dans le système CAMES »", upper:true, nameComma:false, yearParen:false, headSep:", ", placeSep:", ", pagesPrefix:"p.", quotes:"fr", inJournal:false},
  kurukan:  {name:"Revue Kurukan Fuga", src:"Consignes aux auteurs de la revue (norme CAMES)", upper:false, nameComma:true, yearParen:true, headSep:". ", placeSep:": ", pagesPrefix:"pp.", quotes:"en", inJournal:true},
};
function camesAuthors(a, o){
  const one = x => { const f = o.upper ? x.family.toLocaleUpperCase("fr") : x.family; return x.given ? (o.nameComma ? `${f}, ${x.given}` : `${f} ${x.given}`) : f; };
  return listJoin(a.map(one), o.nameComma ? " ; " : ", ", " et ");
}
function camesBib(s, prof){
  const o = {...CAMES_PROFILES.norcames, ...(prof || {})};
  const y = o.yearParen ? `(${lbl(s)})` : lbl(s);
  const q = t => o.quotes === "en" ? `“${esc(t)}”` : `«${NB}${esc(t)}${NB}»`;
  const vi = J([s.volume && `vol.${NB}${esc(s.volume)}`, s.issue && `n°${NB}${esc(s.issue)}`], ", ");
  const pg = s.pages && `${o.pagesPrefix}${NB}${esc(hy(s.pages))}`;
  const place = o.placeSep === ", " ? [esc(s.city), esc(s.publisher)] : [J([esc(s.city), esc(s.publisher)], o.placeSep)];
  const cont = c => c ? (o.inJournal ? `in ${I(c)}` : I(c)) : "";
  const trad = s.translator && `trad. ${esc(s.translator)}`;
  let body;
  switch(s.type){
    case "article": body = [q(s.title), cont(s.container), vi, esc(s.city), pg]; break;
    case "chapter": body = [q(s.title), s.container && `in ${I(s.container)}`, s.editors && `sous la dir. de ${esc(s.editors)}`, ...place, pg]; break;
    case "thesis": body = [I(s.title), esc(s.genre || "Thèse de doctorat"), ...place]; break;
    case "webpage": body = [q(s.title), I(s.container), s.url && esc(s.url) + (s.accessed ? ` (consulté le ${esc(s.accessed)})` : "")]; break;
    default: body = [I(s.title), trad, esc(s.edition), ...place];
  }
  const B = J(body, ", ");
  if(!s.authors.length) return dot(J([J(body.slice(0,1), ""), esc(y), J(body.slice(1), ", ")], o.headSep));
  return dot(J([esc(camesAuthors(s.authors, o)), esc(y), B], o.headSep));
}
function camesCite(s, page, mode){
  const n = s.authors.map(a => a.given ? `${initials(a.given)} ${a.family}` : a.family);
  const who = n.length === 0 ? I(shortTitle(s)) : n.length === 1 ? esc(n[0]) : n.length === 2 ? esc(`${n[0]} et ${n[1]}`) : esc(`${n[0]} et al.`);
  const pg = page ? `, p.${NB}${esc(page)}` : "";
  return mode === "narratif" ? `${who} (${esc(lbl(s))}${pg})` : `(${who}, ${esc(lbl(s))}${pg})`;
}
const shortTitle = s => String(s.title||"Sans titre").split(/[.:?!]/)[0].split(" ").slice(0,4).join(" ");

/* ---------- APA 7 ---------- */
function apaAuthors(a){
  const f = a.map(x => x.given ? `${x.family}, ${initials(x.given)}` : x.family);
  if(f.length <= 1) return f.join("");
  if(f.length > 20) return f.slice(0,19).join(", ") + ", … " + f[f.length-1];
  return f.slice(0,-1).join(", ") + ", & " + f[f.length-1];
}
function apaBib(s){
  const A = apaAuthors(s.authors), Y = `(${esc(lbl(s))}).`;
  const doi = s.doi ? `https://doi.org/${esc(s.doi)}` : esc(s.url);
  const ed = s.edition ? ` (${esc(s.edition)})` : "";
  let T, R = "";
  switch(s.type){
    case "article":
      T = dot(esc(s.title));
      R = J([I(s.container) + (s.volume ? ", " + I(s.volume) + (s.issue ? `(${esc(s.issue)})` : "") : (s.issue ? `, (${esc(s.issue)})` : "")), s.pages && esc(dash(s.pages))], ", ");
      R = R && dot(R); break;
    case "chapter":
      T = dot(esc(s.title));
      R = J([`In ${s.editors ? esc(s.editors) + " (Éd.), " : ""}${I(s.container)}${s.pages ? ` (pp. ${esc(dash(s.pages))})` : ""}.`, s.publisher && dot(esc(s.publisher))], " "); break;
    case "thesis":
      T = I(s.title) + ` [${esc(s.genre || "Thèse de doctorat")}${s.publisher ? ", " + esc(s.publisher) : ""}].`; break;
    case "webpage":
      T = dot(I(s.title)); R = s.container ? dot(esc(s.container)) : ""; break;
    default:
      T = dot(I(s.title) + ed); R = s.publisher ? dot(esc(s.publisher)) : "";
  }
  const lead = A ? `${dot(esc(A))} ${Y} ${T}` : `${T} ${Y}`;
  return J([lead, R, doi], " ");
}
function apaCite(s, page){
  const f = s.authors.map(a => a.family);
  const who = f.length === 0 ? I(shortTitle(s)) : f.length === 1 ? esc(f[0]) : f.length === 2 ? esc(`${f[0]} & ${f[1]}`) : esc(`${f[0]} et al.`);
  return `(${who}, ${esc(lbl(s))}${page ? `, p.${NB}${esc(page)}` : ""})`;
}

/* ---------- MLA 9 ---------- */
function mlaAuthors(a){
  if(!a.length) return "";
  const first = a[0].given ? `${a[0].family}, ${a[0].given}` : a[0].family;
  if(a.length === 1) return first;
  if(a.length === 2) return `${first}, and ${fullName(a[1])}`;
  return `${first}, et al`;
}
function mlaBib(s){
  const A = mlaAuthors(s.authors);
  const q = `“${esc(s.title)}.”`;
  const doi = s.doi ? `https://doi.org/${esc(s.doi)}` : esc(s.url);
  let parts;
  switch(s.type){
    case "article": parts = [q, dot(J([I(s.container), s.volume && `vol. ${esc(s.volume)}`, s.issue && `no. ${esc(s.issue)}`, esc(s.year), s.pages && `pp. ${esc(dash(s.pages))}`], ", ")), doi && dot(doi)]; break;
    case "chapter": parts = [q, dot(J([I(s.container), s.editors && `edited by ${esc(s.editors)}`, esc(s.publisher), esc(s.year), s.pages && `pp. ${esc(dash(s.pages))}`], ", "))]; break;
    case "thesis": parts = [dot(I(s.title)), dot(esc(s.year)), dot(J([esc(s.publisher), esc(s.genre || "PhD dissertation")], ", "))]; break;
    case "webpage": parts = [q, dot(J([I(s.container), esc(s.year), esc(s.url)], ", "))]; break;
    default: parts = [dot(I(s.title)), dot(J([esc(s.edition), esc(s.publisher), esc(s.year)], ", "))];
  }
  return J([A && dot(esc(A)), ...parts], " ");
}
function mlaCite(s, page){
  const f = s.authors.map(a => a.family);
  const who = f.length === 0 ? I(shortTitle(s)) : f.length === 1 ? esc(f[0]) : f.length === 2 ? esc(`${f[0]} and ${f[1]}`) : esc(`${f[0]} et al.`);
  return `(${who}${page ? " " + esc(page) : ""})`;
}

/* ---------- Chicago 17 (auteur-date) ---------- */
function chiAuthors(a){
  if(!a.length) return "";
  const n = a.map((x,i) => i === 0 ? (x.given ? `${x.family}, ${x.given}` : x.family) : fullName(x));
  if(n.length === 1) return n[0];
  if(n.length === 2) return `${n[0]} and ${n[1]}`;
  return n.slice(0,-1).join(", ") + ", and " + n[n.length-1];
}
function chiBib(s){
  const A = chiAuthors(s.authors), Y = dot(esc(lbl(s)));
  const q = `“${esc(s.title)}.”`;
  const pub = J([esc(s.city), esc(s.publisher)], ": ");
  const doi = s.doi ? `https://doi.org/${esc(s.doi)}` : esc(s.url);
  let parts;
  switch(s.type){
    case "article": parts = [q, dot(I(s.container) + (s.volume ? " " + esc(s.volume) + (s.issue ? ` (${esc(s.issue)})` : "") : (s.issue ? `, no. ${esc(s.issue)}` : "")) + (s.pages ? `: ${esc(dash(s.pages))}` : "")), doi && dot(doi)]; break;
    case "chapter": parts = [q, dot(J([`In ${I(s.container)}`, s.editors && `edited by ${esc(s.editors)}`, esc(dash(s.pages))], ", ")), pub && dot(pub)]; break;
    case "thesis": parts = [q, dot(J([esc(s.genre || "PhD diss."), esc(s.publisher)], ", "))]; break;
    case "webpage": parts = [q, s.container && dot(esc(s.container)), s.url && dot(esc(s.url))]; break;
    default: parts = [dot(I(s.title)), s.edition && dot(esc(s.edition)), pub && dot(pub)];
  }
  if(!A){ const [t, ...r] = parts; return J([t, Y, ...r], " "); }
  return J([dot(esc(A)), Y, ...parts], " ");
}
function chiCite(s, page){
  const f = s.authors.map(a => a.family);
  const who = f.length === 0 ? I(shortTitle(s)) : f.length === 1 ? esc(f[0]) : f.length === 2 ? esc(`${f[0]} and ${f[1]}`) : f.length === 3 ? esc(`${f[0]}, ${f[1]}, and ${f[2]}`) : esc(`${f[0]} et al.`);
  return `(${who} ${esc(lbl(s))}${page ? ", " + esc(page) : ""})`;
}

/* ---------- ISO 690 (auteur-date, usage universitaire français) ---------- */
function isoAuthors(a){ return listJoin(a.map(x => x.given ? `${x.family.toLocaleUpperCase("fr")}, ${x.given}` : x.family.toLocaleUpperCase("fr")), ", ", " et "); }
function isoBib(s){
  const A = isoAuthors(s.authors);
  const pub = J([esc(s.city), esc(s.publisher)], `${NB}: `);
  const doi = s.doi ? `DOI${NB}: ${esc(s.doi)}` : "";
  let parts;
  switch(s.type){
    case "article": parts = [dot(esc(s.title)), dot(I(s.container)), dot(J([s.volume && `vol.${NB}${esc(s.volume)}`, s.issue && `n°${NB}${esc(s.issue)}`, s.pages && `p.${NB}${esc(hy(s.pages))}`], ", ")), doi && dot(doi)]; break;
    case "chapter": parts = [dot(esc(s.title)), dot(`In${NB}: ${s.editors ? esc(s.editors) + " (dir.), " : ""}${I(s.container)}`), dot(J([pub, s.pages && `p.${NB}${esc(hy(s.pages))}`], ", "))]; break;
    case "thesis": parts = [dot(I(s.title)), dot(esc(s.genre || "Thèse de doctorat")), pub && dot(pub)]; break;
    case "webpage": parts = [dot(esc(s.title)), s.container && dot(`${I(s.container)} [en ligne]`), s.accessed && `[Consulté le ${esc(s.accessed)}].`, s.url && `Disponible à l’adresse${NB}: ${esc(s.url)}`]; break;
    default: parts = [dot(I(s.title)), s.edition && dot(esc(s.edition)), pub && dot(pub), s.isbn && `ISBN${NB}${esc(s.isbn)}.`];
  }
  if(!A){ const [t, ...r] = parts; return J([t, dot(esc(lbl(s))), ...r], " "); }
  return J([dot(J([esc(A), esc(lbl(s))], ", ")), ...parts], " ");
}
function isoCite(s, page){
  const f = s.authors.map(a => a.family);
  const who = f.length === 0 ? I(shortTitle(s)) : f.length === 1 ? esc(f[0]) : f.length === 2 ? esc(`${f[0]} et ${f[1]}`) : esc(`${f[0]} et al.`);
  return `(${who}, ${esc(lbl(s))}${page ? `, p.${NB}${esc(page)}` : ""})`;
}

/* ---------- Vancouver (numérotée, sciences de la santé) ---------- */
function vanAuthors(a){
  const f = a.map(x => x.given ? `${x.family} ${initials(x.given).replace(/[.\s-]/g, "")}` : x.family);
  return f.length > 6 ? f.slice(0, 6).join(", ") + ", et al" : f.join(", ");
}
function vanBib(s){
  const A = vanAuthors(s.authors), n = s._num ? `${s._num}. ` : "";
  const pub = J([esc(s.city), esc(s.publisher)], ": ");
  const pg = s.pages ? esc(String(s.pages).replace(/\s*[-–]\s*/, "-")) : "";
  let parts;
  switch(s.type){
    case "article": parts = [dot(esc(s.title)), dot(esc(s.container)) + " " + esc(s.year || "") + (s.volume ? `;${esc(s.volume)}` : "") + (s.issue ? `(${esc(s.issue)})` : "") + (pg ? `:${pg}` : "") + ".", s.doi && `doi:${esc(s.doi)}`]; break;
    case "chapter": parts = [dot(esc(s.title)), dot(`In: ${s.editors ? esc(s.editors) + ", editor. " : ""}${esc(s.container)}`), `${pub ? pub + "; " : ""}${esc(s.year || "")}.`, pg && `p. ${pg}.`]; break;
    case "thesis": parts = [`${esc(s.title)} [${esc((s.genre || "Thèse de doctorat").toLocaleLowerCase("fr"))}].`, `${pub ? pub + "; " : ""}${esc(s.year || "")}.`]; break;
    case "webpage": parts = [`${esc(s.title)} [Internet].`, s.container && dot(esc(s.container)), `${esc(s.year || "")}${s.accessed ? ` [cité le ${esc(s.accessed)}]` : ""}.`, s.url && `Disponible sur : ${esc(s.url)}`]; break;
    default: parts = [dot(esc(s.title)), s.edition && dot(esc(s.edition)), `${pub ? pub + "; " : ""}${esc(s.year || "")}.`];
  }
  return n + J([A && dot(esc(A)), ...parts], " ");
}
function vanCite(s, page){ return `[${s._num || "?"}${page ? `, p.${NB}${esc(page)}` : ""}]`; }

/* ---------- Notes de bas de page (usage français en lettres, histoire, droit) ---------- */
function notesAuthorsBib(a){ return listJoin(a.map(x => x.given ? `${x.family.toLocaleUpperCase("fr")} ${x.given}` : x.family.toLocaleUpperCase("fr")), ", ", " et "); }
function notesBody(s){
  const pub = [esc(s.city), esc(s.publisher)];
  switch(s.type){
    case "article": return [`«${NB}${esc(s.title)}${NB}»`, I(s.container), s.volume && `vol.${NB}${esc(s.volume)}`, s.issue && `n°${NB}${esc(s.issue)}`, esc(s.year)];
    case "chapter": return [`«${NB}${esc(s.title)}${NB}»`, s.container && `in ${s.editors ? esc(s.editors) + " (dir.), " : ""}${I(s.container)}`, ...pub, esc(s.year)];
    case "thesis": return [I(s.title), esc(s.genre || "Thèse de doctorat"), ...pub, esc(s.year)];
    case "webpage": return [`«${NB}${esc(s.title)}${NB}»`, I(s.container), esc(s.year), s.url && `[en ligne] ${esc(s.url)}`];
    default: return [I(s.title), esc(s.edition), ...pub, esc(s.year)];
  }
}
function notesBib(s){ return dot(J([esc(notesAuthorsBib(s.authors)), ...notesBody(s), (s.type === "article" || s.type === "chapter") && s.pages && `p.${NB}${esc(hy(s.pages))}`], ", ")); }
// première citation en note : Prénom NOM, Titre, Lieu, Éditeur, année, p. X.
function notesCite(s, page, mode){
  const who = listJoin(s.authors.map(a => a.given ? `${a.given} ${a.family}` : a.family), ", ", " et ");
  const pg = page ? `p.${NB}${esc(page)}` : "";
  if(mode === "ibid") return dot(J(["<i>Ibid.</i>", pg], ", "));
  if(mode === "court"){ const t = shortTitle(s); return dot(J([esc(s.authors.map(a => a.given ? `${initials(a.given)} ${a.family}` : a.family).join(", ")), `${I(t)}${t !== s.title ? "…" : ""}`, "<i>op. cit.</i>", pg], ", ")); }
  return dot(J([esc(who), ...notesBody(s), pg], ", "));
}

const STYLES = {
  cames:   {name:"CAMES", full:"NORCAMES/LSH", bib:camesBib, cite:camesCite, authorDate:true, narrative:true, needCity:true},
  apa:     {name:"APA 7", full:"APA 7e édition", bib:apaBib, cite:apaCite, authorDate:true},
  iso:     {name:"ISO 690", full:"ISO 690 auteur-date", bib:isoBib, cite:isoCite, authorDate:true, needCity:true},
  chicago: {name:"Chicago", full:"Chicago auteur-date", bib:chiBib, cite:chiCite, authorDate:true, needCity:true},
  mla:     {name:"MLA 9", full:"MLA 9e édition", bib:mlaBib, cite:mlaCite, authorDate:false},
  vancouver: {name:"Vancouver", full:"Vancouver (numérotée)", bib:vanBib, cite:vanCite, authorDate:false, numeric:true, needCity:true},
  notes:   {name:"Notes", full:"Notes de bas de page (usage français)", bib:notesBib, cite:notesCite, authorDate:false, needCity:true, footnote:true},
};

/* ---------- tri, désambiguïsation, contrôles ---------- */
const familyKey = s => norm(s.authors.map(a => a.family).join(" ")) || norm(s.title);
function sortSources(list){
  return [...list].sort((a,b) => familyKey(a).localeCompare(familyKey(b), "fr") || String(a.year||"").localeCompare(String(b.year||"")) || norm(a.title).localeCompare(norm(b.title), "fr"));
}
function numberSources(list, texts){
  const pos = {};
  (texts || []).forEach(t => { const W = norm(t); list.forEach(s => { const fam = s.authors[0] ? norm(s.authors[0].family) : ""; if(!fam || pos[s.id] !== undefined) return; const re = new RegExp("\\b" + fam.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b.{0,60}?\\b" + (s.year || "") + "\\b"); const m = W.match(re); if(m) pos[s.id] = m.index; }); });
  const ordered = [...list].sort((a, b) => (pos[a.id] ?? 1e12) - (pos[b.id] ?? 1e12) || (a._order ?? 0) - (b._order ?? 0));
  return ordered.map((s, i) => ({...s, _num: i + 1, _label: s.year || "s.d."}));
}
/* citations numérotées [3], [1, 4], [2-5] */
function findNumericCites(text){
  const nums = new Set(); const raws = []; let m; const re = /\[(\d{1,3}(?:\s*[-–,]\s*\d{1,3})*)(?:,\s*p+\.\s*[\d-]+)?\]/g;
  while((m = re.exec(text))){ raws.push(m[0]); m[1].split(/\s*,\s*/).forEach(part => { const r = part.split(/\s*[-–]\s*/).map(Number); if(r.length === 2 && r[1] >= r[0] && r[1] - r[0] < 50){ for(let k = r[0]; k <= r[1]; k++) nums.add(k); } else nums.add(r[0]); }); }
  return {nums, raws};
}
function verifyNumeric(text, numbered){
  const {nums, raws} = findNumericCites(text);
  const byNum = new Map(numbered.map(s => [s._num, s]));
  const missing = [...nums].filter(n => !byNum.has(n)).map(n => ({c: {raw: `[${n}]`, family: "", year: ""}}));
  const ok = [...nums].filter(n => byNum.has(n)).map(n => ({c: {raw: `[${n}]`}, s: byNum.get(n)}));
  const unused = numbered.filter(s => !nums.has(s._num));
  return {ok, missing, yearOff: [], unused, total: raws.length, numeric: true};
}
function withLabels(sorted, authorDate){
  const groups = {};
  sorted.forEach(s => { const k = familyKey(s) + "|" + (s.year||""); (groups[k] = groups[k] || []).push(s.id); });
  return sorted.map(s => {
    const g = groups[familyKey(s) + "|" + (s.year||"")];
    return {...s, _label: authorDate && g.length > 1 && s.year ? s.year + "abcdefghijklmnop"[g.indexOf(s.id)] : (s.year || "s.d.")};
  });
}
const TYPE_LABEL = {article:"Article", book:"Livre", chapter:"Chapitre", thesis:"Thèse ou mémoire", report:"Rapport", webpage:"Page web"};
function checks(s, styleKey, all){
  const m = [];
  const st = STYLES[styleKey];
  if(!s.title) m.push({f:"title", t:"Titre manquant"});
  if(!s.authors.length) m.push({f:"authors", t:"Auteur manquant"});
  if(!s.year) m.push({f:"year", t:"Année manquante (s.d.)"});
  else if(!/^\d{4}$/.test(s.year)) m.push({f:"year", t:"Année à vérifier"});
  if(s.type === "article"){ if(!s.container) m.push({f:"container", t:"Revue manquante"}); if(!s.pages) m.push({f:"pages", t:"Pages manquantes"}); }
  if(s.type === "book" || s.type === "report"){ if(!s.publisher) m.push({f:"publisher", t:"Éditeur manquant"}); if(st.needCity && !s.city) m.push({f:"city", t:`Ville exigée en ${st.name}`}); }
  if(s.type === "chapter"){ if(!s.container) m.push({f:"container", t:"Ouvrage manquant"}); if(!s.pages) m.push({f:"pages", t:"Pages manquantes"}); if(!s.publisher) m.push({f:"publisher", t:"Éditeur manquant"}); }
  if(s.type === "thesis" && !s.publisher) m.push({f:"publisher", t:"Université manquante"});
  if(s.type === "webpage"){ if(!s.url) m.push({f:"url", t:"URL manquante"}); if(!s.accessed) m.push({f:"accessed", t:"Date de consultation"}); }
  if(all){
    const dup = all.find(o => o.id !== s.id && ((s.doi && o.doi && norm(o.doi) === norm(s.doi)) || (norm(o.title) && norm(o.title) === norm(s.title) && o.year === s.year)));
    if(dup) m.push({f:null, t:"Doublon probable"});
  }
  return m;
}

/* ---------- analyse heuristique d’une référence rédigée ---------- */
// KI-ZERBO → Ki-Zerbo, N'GUESSAN → N'Guessan
function titleCase(w){ return w.toLocaleLowerCase("fr").replace(/(^|[-'’\s])(\p{Ll})/gu, (m, a, b) => a + b.toLocaleUpperCase("fr")); }
function splitAuthorsText(t){
  t = t.replace(/[\s(,;:]+$/,"").replace(/([\p{Ll}]{2})\.$/u,"$1").trim();
  if(!t) return [];
  const apa = [...t.matchAll(/([\p{Lu}][\p{L}'’ -]+?),\s((?:\p{Lu}\.[\s-]?)+)/gu)];
  if(apa.length) return apa.map(m => ({family:m[1].trim(), given:m[2].trim()}));
  if(t.includes(";")) return t.split(";").map(parseAuthor).filter(Boolean);
  // ISO / MLA : "NOM, Prénom et NOM, Prénom"
  const iso = [...t.matchAll(/([\p{Lu}][\p{Lu}'’ -]{1,}),\s([\p{L}][\p{L}. -]*?)(?=\s(?:et|and|&)\s|,\s[\p{Lu}]{2}|$)/gu)];
  if(iso.length) return iso.map(m => ({family:titleCase(m[1].trim()), given:m[2].trim()}));
  // Chicago / MLA : "Nom, Prénom" (nom en minuscules), suivi éventuellement de "et Prénom Nom"
  const inv = /^((?:(?:[DdLl][aeu]s?|[Vv][ao]n|[Dd][aei]l?|[Bb]en|[Oo]uld|[Ee]l)\s+)*[\p{Lu}][\p{L}'’-]+),\s+([\p{Lu}][\p{L}'’.-]*(?:[\s-][\p{Lu}][\p{L}'’.-]*){0,2})$/u;
  const chunks = t.split(/,?\s+(?:et|and|&)\s+/);
  if(inv.test(chunks[0])) return chunks.map(c => { const m = c.match(inv); return m ? {family:m[1], given:m[2]} : parseAuthor(c); }).filter(Boolean);
  return t.split(/,\s|\s+(?:et|and|&)\s+/).map(parseAuthor).filter(Boolean);
}
const stripMarks = t => String(t||"").replace(/[⟦⟧]/g,"");
function parseRefHeuristic(line){
  const italics = [...String(line).matchAll(/⟦([^⟧]+)⟧/g)].map(m => m[1].replace(/[\s.,]+$/,"").trim()).filter(x => x.length > 2);
  const raw = stripMarks(line).replace(/\s+/g," ").trim();
  const s = blank();
  s.origin = "Analyse automatique";
  const doi = raw.match(/10\.\d{4,9}\/[^\s"<>]+/); if(doi) s.doi = doi[0].replace(/[).,;]+$/,"");
  const url = raw.match(/https?:\/\/[^\s<>"]+/); if(url && !/doi\.org/.test(url[0])) s.url = url[0].replace(/[).,;]+$/,"");
  const ym = raw.match(/\((1[5-9]\d{2}|20\d{2})[a-z]?\)/) || raw.match(/(?:^|[\s,.])(1[5-9]\d{2}|20\d{2})[a-z]?(?=[\s,.)]|$)/);
  let rest = raw;
  if(ym){
    s.year = ym[1];
    const at = raw.indexOf(ym[0]);
    s.authors = splitAuthorsText(raw.slice(0, at));
    rest = raw.slice(at + ym[0].length).replace(/^[\s).,:]+/,"")
      .replace(/^\[\d{4}\][\s).,:]*/,""); // date de première édition : « 2002 [1961] »
  }
  // un titre entre guillemets ouvre la référence ; des guillemets plus loin sont un mot cité dans un titre de livre
  const q = rest.match(/^[«“"]\s?([^»”"]+?)\s?[»”"]/);
  if(q){
    s.title = q[1].replace(/[.,]$/,"").trim();
    const after = rest.slice(rest.indexOf(q[0]) + q[0].length).replace(/^[\s.,]+/,"");
    if(/^(in|dans)\b\s*:?/i.test(after)){ s.type = "chapter"; s.container = after.replace(/^(in|dans)\s*:?\s*/i,"").split(/[,.]\s/)[0]; }
    else { s.type = "article"; s.container = after.split(/,\s|\.\s/)[0].replace(/\s?\d+\s?\(.*$/,"").trim(); }
    rest = after;
  } else if(/\d+\s?\(\d+\)|,\s?\d+,\s?\d+\s?[-–]\s?\d+/.test(rest)){
    const m2 = rest.match(/^(.+?[^.\s]{2})\.\s+([^,]+?),\s?\d/);
    s.type = "article";
    if(m2){ s.title = m2[1].trim(); s.container = m2[2].trim(); rest = rest.slice(m2[0].length - 1); }
    else s.title = rest.split(/\.\s/)[0];
  } else {
    const it0 = italics[0], at0 = it0 ? rest.indexOf(it0) : -1;
    if(at0 >= 0 && at0 < 6){ s.title = it0; s.type = "book"; rest = rest.slice(at0 + it0.length); }
    else { const seg = rest.split(/\.\s|,\s/); s.title = (seg[0] || "").trim(); s.type = "book"; rest = rest.slice(s.title.length); }
  }
  // thèse en APA : « Titre [Thèse de doctorat, Université…] »
  const br = s.title.indexOf(" ["); if(br > 0){ rest = s.title.slice(br) + " " + rest; s.title = s.title.slice(0, br).trim(); }
  const pg = rest.match(/p{1,2}\.?\s?(\d+\s?[-–]\s?\d+)/) || (s.type !== "book" && rest.match(/(?:,|:)\s?(\d+\s?[-–]\s?\d+)/)); if(pg) s.pages = pg[1].replace(/\s/g,"");
  const vol = rest.match(/vol\.?\s?(\d+)/i) || rest.match(/(?:^|,\s)(\d+)\s?\(\d+\)/); if(vol) s.volume = vol[1];
  const iss = rest.match(/n[°o]\.?\s?(\d+)/i) || rest.match(/\d+\s?\((\d+)\)/); if(iss) s.issue = iss[1];
  if(/th[èe]se|dissertation|m[ée]moire/i.test(raw)){ s.type = "thesis"; const g = raw.match(/(Th[èe]se de doctorat|M[ée]moire de master|PhD dissertation|Doctoral dissertation)/i); if(g) s.genre = g[1]; }
  const bracket = rest.match(/\[(?:Th[èe]se|M[ée]moire|PhD|Doctoral|Master)[^,\]]*,\s*([^\]]+)\]/i); // APA : [Thèse de doctorat, Université…]
  if(bracket){ s.publisher = bracket[1].trim(); }
  else if(s.type === "book" || s.type === "thesis" || s.type === "chapter"){
    const cp = rest.match(/([\p{Lu}][\p{L} -]{1,30})\s?:\s?([^,.;]{2,60})/u);
    if(cp){ s.city = cp[1].trim(); s.publisher = cp[2].trim(); }
    else if(/^(?:Th[èe]se|M[ée]moire)/i.test(rest) === false && (() => {
      // APA : « Titre. Sous-titre, avec virgules. Éditeur. » : l’éditeur est la dernière phrase
      const sents = rest.replace(/^[\s.,:;]+/,"").replace(/[.\s]+$/,"").split(/\.\s+(?=\p{Lu})/u);
      const last = sents[sents.length - 1];
      if(sents.length > 1 && !/[,\d[\]]/.test(last)){ s.publisher = last.trim(); return true; }
      return false;
    })()){ /* éditeur trouvé */ }
    else {
      const segs = rest.split(/,\s/).map(x => x.replace(/^[\s.,:;]+/,"").replace(/[.]$/,"").trim()).filter(x => x && !/\d/.test(x) && !/^(in|dans)\b/i.test(x));
      if(segs.length >= 2){
        s.city = segs[segs.length-2]; s.publisher = segs[segs.length-1];
        // « Université X, Abidjan » : l’établissement est l’éditeur, même placé avant la ville
        if(/universit|[ée]cole|institut|presses/i.test(s.city) && !/universit|[ée]cole|institut|presses/i.test(s.publisher)) [s.city, s.publisher] = [s.publisher, s.city];
      }
      else if(segs.length === 1 && segs[0] !== s.title) s.publisher = segs[0];
    }
  }
  if(italics.length){
    const it = italics[0];
    if(s.type === "article" || s.type === "chapter"){ if(norm(it) !== norm(s.title)) s.container = it; }
    else if(s.type === "book" || s.type === "thesis"){
      if(norm(it) !== norm(s.title) && norm(raw).indexOf(norm(it)) > norm(raw).indexOf(norm(s.title)) && /\d+\s?\(\d+\)|vol\.|n°|pp?\./i.test(raw.slice(raw.indexOf(it)))){ s.type = "article"; s.container = it; }
      else s.title = it;
    }
  }
  if(s.url && !s.container && s.type === "book" && !s.publisher){ s.type = "webpage"; try{ s.container = new URL(s.url).hostname.replace(/^www\./,""); }catch(e){} }
  return s;
}
function blank(){ return {id: "s" + Math.random().toString(36).slice(2,10), type:"article", authors:[], title:"", year:"", container:"", volume:"", issue:"", pages:"", city:"", publisher:"", edition:"", translator:"", editors:"", genre:"", url:"", doi:"", isbn:"", accessed:"", origin:"Saisie manuelle"}; }

/* ---------- lecture d’un document : section bibliographie + découpage ---------- */
const YEAR_RE = /(1[5-9]\d{2}|20\d{2}|s\.\s?d\.|n\.\s?d\.)/;
function findBibSection(text){
  const head = /^[ \t]*(?:[IVX\d]+[.)-]?\s*)?(r[ée]f[ée]rences bibliographiques|r[ée]f[ée]rences|bibliographie(?:\s+(?:g[ée]n[ée]rale|s[ée]lective|indicative))?|sources et bibliographie|ouvrages cit[ée]s|works cited|references|bibliography|webographie)[ \t]*:?[ \t]*$/gim;
  let m, last = null;
  while((m = head.exec(stripMarks(text)))) last = m;
  if(!last) return null;
  // positions identiques dans le texte marqué : on cherche le même titre dans le texte d’origine
  const idx = text.lastIndexOf(last[0].trim());
  const start = idx + last[0].trim().length;
  let section = text.slice(start);
  const end = section.search(/^[ \t]*(?:[IVX\d]+[.)-]?\s*)?(annexes?|table des mati[èe]res|index|glossaire|appendix|appendices|liste des (?:tableaux|figures|sigles))\b[^\n]{0,40}$/im);
  if(end > 0) section = section.slice(0, end);
  return {body: text.slice(0, idx), section};
}
function splitReferences(text){
  const lines = String(text).split(/\n/).map(l => l.trim());
  const start = /^(?:\[\d+\]|\d{1,3}[.)]\s)|^⟦?[\p{Lu}][\p{L}'’-]+(?:\s[\p{Lu}][\p{L}'’-]+)*(?:,|\s+[\p{Lu}][\p{Ll}]|\s+\(|\s+et\s|\s+\p{Lu}\.)/u;
  const refs = []; let cur = "", gap = false;
  const push = () => { if(cur) refs.push(cur); cur = ""; };
  lines.forEach(l => {
    if(!l){ gap = true; return; }
    // Après une ligne vide : la reconnaissance de caractères (PDF scanné) en met une avant la ligne en retrait
    // qui continue la référence. On recolle si la référence s’arrêtait sur une virgule ou si la ligne commence en minuscule.
    if(gap){ gap = false; if(cur && !(/[,;:«–-]\s*$/.test(stripMarks(cur)) || (/^\p{Ll}/u.test(l) && !start.test(l)))) push(); }
    if(cur && start.test(l) && /[.)»”]\s*$/.test(stripMarks(cur)) && YEAR_RE.test(cur)) { push(); cur = l; }
    else cur = cur ? cur + " " + l : l;
  });
  push();
  return refs.map(r => r.replace(/^(?:\[\d+\]|\d{1,3}[.)])\s*/,"").replace(/(\p{Ll})-\s+(\p{Ll})/gu,"$1$2").replace(/\s+/g," ").trim())
    .filter(r => stripMarks(r).length > 20 && YEAR_RE.test(r) && !/^(page|p\.)\s?\d+$/i.test(r));
}

/* ---------- import BibTeX / RIS ---------- */
const TEX = [[/\\'\{?e\}?/g,"é"],[/\\`\{?e\}?/g,"è"],[/\\\^\{?e\}?/g,"ê"],[/\\`\{?a\}?/g,"à"],[/\\\^\{?o\}?/g,"ô"],[/\\c\{?c\}?/g,"ç"],[/\\"\{?o\}?/g,"ö"],[/\\"\{?u\}?/g,"ü"],[/\\'\{?E\}?/g,"É"],[/\\&/g,"&"]];
const untex = v => { TEX.forEach(([r,c]) => v = v.replace(r,c)); return v.replace(/[{}]/g,"").replace(/\s+/g," ").trim(); };
function parseBibtex(txt){
  const out = []; let i = 0;
  while((i = txt.indexOf("@", i)) !== -1){
    const m = txt.slice(i).match(/^@(\w+)\s*\{\s*([^,]*),/); if(!m){ i++; continue; }
    let j = i + m[0].length, depth = 1, start = j;
    while(j < txt.length && depth > 0){ if(txt[j] === "{") depth++; else if(txt[j] === "}") depth--; j++; }
    const body = txt.slice(start, j-1); i = j;
    const f = {}; let k = 0;
    while(k < body.length){
      const fm = body.slice(k).match(/^\s*,?\s*([\w-]+)\s*=\s*/); if(!fm) break;
      k += fm[0].length; let val = "";
      if(body[k] === "{"){ let d = 1, s0 = ++k; while(k < body.length && d > 0){ if(body[k] === "{") d++; else if(body[k] === "}") d--; k++; } val = body.slice(s0, k-1); }
      else if(body[k] === '"'){ const e = body.indexOf('"', k+1); val = body.slice(k+1, e); k = e + 1; }
      else { const e = body.slice(k).search(/[,}\n]/); val = body.slice(k, e < 0 ? undefined : k + e); k += e < 0 ? body.length : e; }
      f[fm[1].toLowerCase()] = untex(val);
    }
    const t = m[1].toLowerCase();
    const s = blank();
    s.type = {article:"article", book:"book", incollection:"chapter", inbook:"chapter", phdthesis:"thesis", mastersthesis:"thesis", techreport:"report", misc: f.url ? "webpage" : "book", online:"webpage"}[t] || "book";
    s.authors = (f.author || "").split(/\s+and\s+/).map(parseAuthor).filter(Boolean);
    s.title = f.title || ""; s.year = (f.year || f.date || "").slice(0,4);
    s.container = f.journal || f.booktitle || f.journaltitle || ""; s.volume = f.volume || ""; s.issue = f.number || "";
    s.pages = (f.pages || "").replace(/--/,"-"); s.publisher = f.publisher || f.school || f.institution || ""; s.city = f.address || f.location || "";
    s.doi = f.doi || ""; s.url = f.url || ""; s.isbn = f.isbn || ""; s.edition = f.edition || ""; s.editors = (f.editor || "").replace(/\s+and\s+/g, ", ");
    if(t === "mastersthesis") s.genre = "Mémoire de master";
    s.origin = "Import BibTeX"; out.push(s);
  }
  return out;
}
function parseRis(txt){
  const out = []; let s = null;
  txt.split(/\r?\n/).forEach(line => {
    const m = line.match(/^([A-Z][A-Z0-9])\s{2}-\s?(.*)$/); if(!m) return;
    const [_, tag, v] = m;
    if(tag === "TY"){ s = blank(); s.origin = "Import RIS"; s.type = {JOUR:"article", JFULL:"article", BOOK:"book", CHAP:"chapter", THES:"thesis", RPRT:"report", ELEC:"webpage", WEB:"webpage"}[v.trim()] || "book"; return; }
    if(!s) return;
    if(tag === "ER"){ out.push(s); s = null; return; }
    if(tag === "AU" || tag === "A1"){ const a = parseAuthor(v); if(a) s.authors.push(a); }
    else if(tag === "A2" || tag === "ED") s.editors = s.editors ? s.editors + ", " + v.trim() : v.trim();
    else if(tag === "TI" || tag === "T1") s.title = v.trim();
    else if(tag === "T2" || tag === "JO" || tag === "JF" || tag === "BT") s.container = s.container || v.trim();
    else if(tag === "PY" || tag === "Y1" || tag === "DA") s.year = s.year || (v.match(/\d{4}/) || [""])[0];
    else if(tag === "VL") s.volume = v.trim(); else if(tag === "IS") s.issue = v.trim();
    else if(tag === "SP") s.pages = v.trim(); else if(tag === "EP") s.pages = s.pages ? s.pages + "-" + v.trim() : v.trim();
    else if(tag === "PB") s.publisher = v.trim(); else if(tag === "CY") s.city = v.trim();
    else if(tag === "DO") s.doi = v.trim(); else if(tag === "UR") s.url = v.trim(); else if(tag === "SN") s.isbn = v.trim();
  });
  return out;
}

/* ---------- export ---------- */
function toBibtex(list){
  const T = {article:"article", book:"book", chapter:"incollection", thesis:"phdthesis", report:"techreport", webpage:"misc"};
  const used = {};
  return list.map(s => {
    let key = (norm(s.authors[0]?.family || s.title).split(" ")[0] || "ref") + (s.year || "");
    used[key] = (used[key] || 0) + 1; if(used[key] > 1) key += "abcdefghij"[used[key]-2];
    const b = v => String(v).replace(/[{}]/g,"");
    const f = [["author", s.authors.map(a => a.given ? `${a.family}, ${a.given}` : a.family).join(" and ")], ["title", s.title], ["year", s.year],
      [s.type === "article" ? "journal" : "booktitle", s.type === "article" || s.type === "chapter" ? s.container : ""],
      ["volume", s.volume], ["number", s.issue], ["pages", s.pages && s.pages.replace(/[-–]/,"--")],
      [s.type === "thesis" ? "school" : s.type === "report" ? "institution" : "publisher", s.publisher], ["address", s.city],
      ["editor", s.editors], ["edition", s.edition], ["doi", s.doi], ["url", s.url], ["isbn", s.isbn], ["urldate", s.accessed]]
      .filter(([,v]) => v).map(([k,v]) => `  ${k} = {${b(v)}}`).join(",\n");
    return `@${T[s.type] || "misc"}{${key},\n${f}\n}`;
  }).join("\n\n");
}
function toRis(list){
  const T = {article:"JOUR", book:"BOOK", chapter:"CHAP", thesis:"THES", report:"RPRT", webpage:"ELEC"};
  return list.map(s => {
    const L = [["TY", T[s.type] || "GEN"], ...s.authors.map(a => ["AU", a.given ? `${a.family}, ${a.given}` : a.family]), ["TI", s.title], ["T2", s.container], ["PY", s.year],
      ["VL", s.volume], ["IS", s.issue], ["SP", (s.pages||"").split(/[-–]/)[0]], ["EP", (s.pages||"").split(/[-–]/)[1]], ["PB", s.publisher], ["CY", s.city],
      ["DO", s.doi], ["UR", s.url], ["SN", s.isbn], ["ER", " "]];
    return L.filter(([k,v]) => v).map(([k,v]) => `${k}  - ${v}`).join("\n");
  }).join("\n\n") + "\n";
}

/* ---------- vérificateur texte ↔ bibliographie ---------- */
const STOP = new Set(["Le","La","Les","Un","Une","En","Dans","Selon","Depuis","Avant","Après","Vers","Entre","The","In","Since","From","Au","Aux","Du","Des","De","Cf","Voir","See","Ibid","Op","Loi","Décret","Article","Art","Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"]);
function findCitations(text){
  const found = [];
  const add = (fam, yr, raw) => { fam = fam.replace(/[’']s$/,""); if(!fam || STOP.has(fam) || fam.length < 2) return; found.push({family:fam, year:yr, raw:raw.trim()}); };
  const re1 = /\(([^()]{2,160}?)\)/g; let m;
  while((m = re1.exec(text))){
    m[1].split(/;/).forEach(part => {
      const p = part.match(/(?:\p{Lu}\.[\s-]?)*\s*(?:(?:de|du|van|von|da|di|le|la)\s)?(\p{Lu}[\p{L}'’-]+)(?:\s+(?:et|and|&)\s+(?:\p{Lu}\.[\s-]?)*\s*\p{Lu}[\p{L}'’-]+)?(?:\s+et\s+al\.?)?,?\s+(1[5-9]\d{2}|20\d{2})([a-z]?)/u);
      if(p) add(p[1], p[2] + p[3], part);
    });
  }
  const re2 = /(?:\p{Lu}\.[\s-]?)*\s*(\p{Lu}[\p{L}'’-]+)(?:\s+et\s+al\.?)?\s+\((1[5-9]\d{2}|20\d{2})([a-z]?)/gu;
  while((m = re2.exec(text))) add(m[1], m[2] + m[3], m[0]);
  const seen = new Set();
  return found.filter(c => { const k = norm(c.family) + c.year; if(seen.has(k)) return false; seen.add(k); return true; });
}
function verify(text, labeled){
  const cites = findCitations(text);
  const ok = [], missing = [], yearOff = [];
  const used = new Set();
  cites.forEach(c => {
    const exact = labeled.find(s => s.authors.some(a => norm(a.family) === norm(c.family)) && (s._label === c.year || (s.year === c.year && !/[a-z]$/.test(c.year))));
    if(exact){ ok.push({c, s:exact}); used.add(exact.id); return; }
    const sameName = labeled.find(s => s.authors.some(a => norm(a.family) === norm(c.family)));
    if(sameName){ yearOff.push({c, s:sameName}); used.add(sameName.id); return; }
    missing.push({c});
  });
  const unused = labeled.filter(s => !used.has(s.id));
  return {ok, missing, yearOff, unused, total:cites.length};
}

/* ---------- CrossRef ---------- */
function fromCrossref(it){
  const s = blank();
  s.type = {"journal-article":"article", "book":"book", "monograph":"book", "edited-book":"book", "book-chapter":"chapter", "dissertation":"thesis", "report":"report", "posted-content":"article", "proceedings-article":"chapter"}[it.type] || "article";
  s.authors = (it.author || []).map(a => ({family: a.family || a.name || "", given: a.given || ""})).filter(a => a.family);
  s.title = stripHtml((it.title || [""])[0] || "");
  s.container = stripHtml((it["container-title"] || [""])[0] || "");
  const dp = (it.issued || it.published || it["published-print"] || it["published-online"] || {})["date-parts"];
  s.year = dp && dp[0] && dp[0][0] ? String(dp[0][0]) : "";
  s.volume = it.volume || ""; s.issue = it.issue || ""; s.pages = it.page || "";
  s.publisher = it.publisher || ""; s.city = it["publisher-location"] || "";
  s.doi = it.DOI || ""; s.isbn = (it.ISBN || [""])[0];
  s.editors = (it.editor || []).map(e => [e.given, e.family].filter(Boolean).join(" ")).join(", ");
  s.origin = "CrossRef";
  return s;
}
/* ---------- indicateurs : conformité et profil de la bibliographie ---------- */
const REQ = {article:["authors","title","year","container","pages"], book:["authors","title","year","publisher","city"], chapter:["authors","title","year","container","publisher","pages"], thesis:["authors","title","year","publisher"], report:["authors","title","year","publisher"], webpage:["title","url","accessed"]};
function conformity(list, styleKey){
  if(!list.length) return {score:0, complete:0, total:0};
  let ok = 0, fieldsOk = 0, fieldsAll = 0;
  list.forEach(s => {
    const m = checks(s, styleKey, list);
    if(!m.length) ok++;
    const req = REQ[s.type] || REQ.book;
    fieldsAll += req.length;
    fieldsOk += req.filter(f => !m.some(x => x.f === f) && !(f === "city" && !STYLES[styleKey].needCity && false)).length;
  });
  // score : 70 % complétude des champs + 30 % de références entièrement conformes
  return {score: Math.round(100 * (0.7 * fieldsOk / fieldsAll + 0.3 * ok / list.length)), complete: ok, total: list.length};
}
const FR_W = /\b(le|la|les|des|du|de|et|en|une|un|pour|dans|sur|au|aux|est|leurs?|entre)\b/gi;
const EN_W = /\b(the|of|and|in|a|an|for|on|to|with|from|toward|towards|between|its)\b/gi;
function langOf(t){ const f = (String(t).match(FR_W) || []).length, e = (String(t).match(EN_W) || []).length; return f > e ? "fr" : e > f ? "en" : "autre"; }
function analyze(list, now = new Date().getFullYear()){
  const n = list.length;
  const years = list.map(s => parseInt(s.year, 10)).filter(y => y > 1400 && y <= now + 1).sort((a,b) => a - b);
  const byType = {}; list.forEach(s => byType[s.type] = (byType[s.type] || 0) + 1);
  const decades = {}; years.forEach(y => { const d = Math.floor(y / 10) * 10; decades[d] = (decades[d] || 0) + 1; });
  const lang = {fr:0, en:0, autre:0}; list.forEach(s => lang[langOf(s.title + " " + s.container)]++);
  const recent = years.filter(y => y >= now - 10).length;
  const median = years.length ? years[Math.floor(years.length / 2)] : null;
  const notes = [];
  if(years.length >= 5 && recent / years.length < 0.2) notes.push(`Seulement ${Math.round(100 * recent / years.length)} % de références de moins de dix ans : la revue de littérature gagnerait à être actualisée.`);
  if(n >= 8 && (byType.article || 0) / n < 0.2) notes.push("Peu d’articles de revues : les travaux récents d’un domaine y paraissent souvent en premier.");
  if(n >= 8 && lang.en === 0) notes.push("Aucune référence en anglais : selon ton domaine, la littérature internationale peut renforcer ton cadre théorique.");
  if(n >= 8 && lang.fr === 0) notes.push("Aucune référence en français : pense aux travaux produits dans l’espace francophone et CAMES.");
  const authors = {}; list.forEach(s => s.authors.forEach(a => { const k = a.family; authors[k] = (authors[k] || 0) + 1; }));
  const top = Object.entries(authors).sort((a,b) => b[1] - a[1]).filter(x => x[1] > 1).slice(0, 5);
  return {n, byType, decades, lang, recent, median, min: years[0], max: years[years.length - 1], dated: years.length, top, notes};
}
/* ---------- existence des références : comparaison avec les bases ouvertes ---------- */
function simTitle(a, b){
  const tok = x => new Set(norm(x).split(" ").filter(w => w.length > 2));
  const A = tok(a), B = tok(b); if(!A.size || !B.size) return 0;
  let i = 0; A.forEach(w => { if(B.has(w)) i++; });
  const dice = 2 * i / (A.size + B.size);
  // titre cité sans son sous-titre : « Covenants with and without a sword » ⊂ « …: Self-Governance Is Possible »
  const small = Math.min(A.size, B.size);
  return small >= 3 && i === small ? Math.max(dice, .9) : dice;
}
function judge(s, cands){
  let best = null, bs = -1;
  (cands || []).forEach(c => {
    const t = simTitle(s.title, c.title);
    const au = s.authors.length > 0 && (c.authors || []).some(f => s.authors.some(a => norm(a.family) && (norm(f) === norm(a.family) || norm(f).endsWith(" " + norm(a.family)) || norm(f).split(" ").pop() === norm(a.family).split(" ").pop())));
    const yr = !!(s.year && c.year && Math.abs(+s.year - +c.year) <= 1);
    const sc = t + (au ? .25 : 0) + (yr ? .15 : 0);
    if(sc > bs){ bs = sc; best = {...c, t, au, yr}; }
  });
  if(best && best.t >= .85 && (best.au || best.yr)) return {v:"found", best};
  // « proche » = même auteur ou même année avec un titre voisin ; un titre voisin d’un autre auteur à une autre date est une autre œuvre
  if(best && best.t >= .6 && (best.au || best.yr)) return {v:"close", best};
  return {v:"none", best:null};
}
const EXIST_LABEL = {found:"Trouvée", close:"Publication proche", none:"Introuvable", suspect:"Suspecte"};
/* ---------- mesure de fiabilité : analyse automatique comparée à la fiche relue ---------- */
const EVAL_FIELDS = [["type","Type"],["authors","Auteurs"],["title","Titre"],["year","Année"],["container","Revue ou ouvrage"],["volume","Volume"],["issue","Numéro"],["pages","Pages"],["city","Ville"],["publisher","Éditeur"],["doi","DOI"]];
function snapshot(s){ const o = {}; EVAL_FIELDS.forEach(([k]) => o[k] = k === "authors" ? s.authors.map(a => ({family:a.family, given:a.given})) : (s[k] || "")); return o; }
function fieldKey(k, v){
  if(k === "authors") return (v || []).map(a => norm(a.family) + ":" + norm(initials(a.given)).replace(/\s/g,"")).join("|");
  if(k === "pages") return String(v || "").replace(/\D+/g, "-").replace(/^-|-$/g, "");
  return norm(v);
}
function evalRecords(list){
  return list.filter(s => s._orig && s._validated).map(s => {
    const fields = {};
    EVAL_FIELDS.forEach(([k]) => { const a = fieldKey(k, s._orig[k]), b = fieldKey(k, k === "authors" ? s.authors : s[k]); if(a || b) fields[k] = a === b; });
    return {method: s._method === "Analyse par l’IA" ? "ia" : "auto", type: s.type, fields};
  });
}
function evalStats(records){
  const per = {}; let ok = 0, tot = 0, full = 0; const byMethod = {};
  records.forEach(r => {
    const vals = Object.values(r.fields); const allOk = vals.every(Boolean);
    if(allOk) full++;
    const m = byMethod[r.method] = byMethod[r.method] || {n:0, full:0, ok:0, tot:0}; m.n++; if(allOk) m.full++;
    Object.entries(r.fields).forEach(([k, v]) => { per[k] = per[k] || {ok:0, tot:0}; per[k].tot++; tot++; m.tot++; if(v){ per[k].ok++; ok++; m.ok++; } });
  });
  return {n: records.length, fieldAcc: tot ? ok / tot : 0, refAcc: records.length ? full / records.length : 0, per, byMethod};
}
/* ================= LIAN’Z : dictée et similitudes ================= */
/* commandes vocales : la transcription reste fidèle, seules les commandes deviennent ponctuation */
const VOICE_CMDS = [
  [/\b(nouveau paragraphe|new paragraph)\b/gi, "\n\n"],
  [/\bpoint (?:à|a) la ligne\b/gi, ".\n\n"],
  [/\b(retour (?:à|a) la ligne|(?:à|a) la ligne|new line)\b/gi, "\n"],
  [/\bpoints? d['’ ]interrogation\b|\bquestion mark\b/gi, "?"],
  [/\bpoints? d['’ ]exclamation\b|\bexclamation (?:mark|point)\b/gi, "!"],
  [/\bpoints de suspension\b/gi, "…"],
  [/\bpoint[- ]virgule\b|\bsemicolon\b/gi, ";"],
  [/\bdeux[- ]points\b|\bcolon\b/gi, ":"],
  [/\bvirgule\b|\bcomma\b/gi, ","],
  [/\b(ouvre[zr]? les guillemets)\b/gi, "«"],
  [/\b(ferme[zr]? les guillemets)\b/gi, "»"],
  [/\b(ouvre[zr]? la parenth[èe]se)\b/gi, "("],
  [/\b(ferme[zr]? la parenth[èe]se)\b/gi, ")"],
];
function applyVoice(raw){
  let t = " " + String(raw).trim() + " ";
  VOICE_CMDS.forEach(([re, v]) => t = t.replace(re, "\u0001" + v + "\u0001"));
  t = t.replace(/\s+(point|period|full stop)\s*$/i, "\u0001.\u0001");      // « point » seulement en fin d’énoncé
  t = t.replace(/\s*\u0001\s*/g, m => m.includes("\n") ? m : "\u0001").replace(/\u0001/g, "");
  return tidy(t);
}
// typographie française : espaces insécables, majuscules après un point
function tidy(t){
  return String(t).trim().replace(/[ \t]+([,.)…])/g, "$1").replace(/\(\s+/g, "(")
    .replace(/\s*([;:!?»])/g, `${NB}$1`).replace(/«\s*/g, `«${NB}`)
    .replace(/([,;:!?.…»)])(?=[\p{L}\d«(])/gu, "$1 ")
    .replace(/(^|[.!?…]\s+|\n\s*)(\p{Ll})/gu, (m, a, b) => a + b.toLocaleUpperCase("fr"))
    .replace(/[ \t]{2,}/g, " ").replace(/ *\n */g, "\n").trim();
}
/* similitudes : comparaison par séquences de mots (empreintes de 8 mots) */
function wordsOf(text){
  const out = []; const re = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu; let m;
  while((m = re.exec(text))) out.push({w: norm(m[0]), s: m.index, e: m.index + m[0].length});
  return out.filter(x => x.w);
}
const SH = 8;
function shingleSet(words){ const set = new Set(); for(let i = 0; i + SH <= words.length; i++) set.add(words.slice(i, i + SH).map(x => x.w).join(" ")); return set; }
function runsFrom(flags){ const runs = []; let st = -1; flags.forEach((f, i) => { if(f && st < 0) st = i; if(!f && st >= 0){ runs.push([st, i - 1]); st = -1; } }); if(st >= 0) runs.push([st, flags.length - 1]); return runs; }
function isQuotedOrCited(text, a, b){
  const before = text.slice(Math.max(0, a - 400), a), after = text.slice(b, b + 160);
  const open = (before.match(/[«“"]/g) || []).length, close = (before.match(/[»”"]/g) || []).length;
  const inQuotes = before.lastIndexOf("«") > before.lastIndexOf("»") || before.lastIndexOf("“") > before.lastIndexOf("”") || (open > close && /[»”"]/.test(after.slice(0, 40)));
  const cited = /\((?:[^()]{0,80}?)(1[5-9]\d{2}|20\d{2})[a-z]?(?:[,:]\s*p+\.\s*\d+[^()]*)?\)/.test(after.slice(0, 120)) || /\(\d{4}[^)]*\)/.test(text.slice(Math.max(0, a - 120), a));
  return {inQuotes, cited};
}
function compareTexts(text, srcText, label){
  const W = wordsOf(text); const set = shingleSet(wordsOf(srcText));
  const flags = new Array(W.length).fill(false);
  for(let i = 0; i + SH <= W.length; i++) if(set.has(W.slice(i, i + SH).map(x => x.w).join(" "))) for(let k = i; k < i + SH; k++) flags[k] = true;
  const passages = runsFrom(flags).map(([a, b]) => { const s0 = W[a].s, e0 = W[b].e; return {start:s0, end:e0, words: b - a + 1, text: text.slice(s0, e0), ...isQuotedOrCited(text, s0, e0)}; });
  const covered = flags.filter(Boolean).length;
  return {label, covered, total: W.length, pct: W.length ? covered / W.length : 0, passages, flags};
}
function internalRepeats(text){
  const W = wordsOf(text); const seen = new Map(); const reps = [];
  for(let i = 0; i + SH <= W.length; i++){ const k = W.slice(i, i + SH).map(x => x.w).join(" "); if(seen.has(k) && i - seen.get(k) >= SH) reps.push([seen.get(k), i]); else if(!seen.has(k)) seen.set(k, i); }
  const flags = new Array(W.length).fill(false); reps.forEach(([a, b]) => { for(let k = 0; k < SH; k++) flags[b + k] = true; });
  return runsFrom(flags).map(([a, b]) => ({start: W[a].s, end: W[b].e, words: b - a + 1, text: text.slice(W[a].s, W[b].e)}));
}
function frequentWords(text){
  const STOPW = new Set("le la les de des du un une et en est que qui dans pour par sur au aux ce cette ces se sa son ses il elle ils elles on nous vous leur leurs plus pas ne ou mais comme avec sont été être a ont fait faire tout tous très aussi bien entre dont ainsi alors donc car si y the of and to in is that for on with as by".split(" "));
  const out = [];
  text.split(/\n{2,}/).forEach((para, pi) => {
    const c = {}; wordsOf(para).forEach(x => { if(x.w.length > 3 && !STOPW.has(x.w)) c[x.w] = (c[x.w] || 0) + 1; });
    Object.entries(c).filter(([, n]) => n >= 4).forEach(([w, n]) => out.push({para: pi + 1, word: w, n}));
  });
  return out.sort((a, b) => b.n - a.n).slice(0, 12);
}
function pickProbes(text, max = 12){
  const sents = text.split(/(?<=[.!?…])\s+|\n+/).map(x => x.trim()).filter(x => wordsOf(x).length >= 14);
  const step = Math.max(1, Math.floor(sents.length / max));
  const probes = [...new Set(sents)].filter((_, i) => i % step === 0).map(x => { const w = x.match(/[\p{L}\p{N}'’-]+/gu) || []; const mid = Math.max(0, Math.floor(w.length / 2) - 5); return w.slice(mid, mid + 10).join(" "); });
  return [...new Set(probes)].slice(0, max);
}
function abstractFromIndex(inv){ if(!inv) return ""; const arr = []; Object.entries(inv).forEach(([w, pos]) => pos.forEach(p => arr[p] = w)); return arr.join(" "); }
if(typeof module !== "undefined") module.exports = {numberSources, findNumericCites, verifyNumeric, applyVoice, tidy, compareTexts, internalRepeats, frequentWords, pickProbes, abstractFromIndex, wordsOf, CAMES_PROFILES, camesBib, snapshot, evalRecords, evalStats, simTitle, judge, conformity, analyze, findBibSection, splitReferences, stripMarks, STYLES, parseAuthor, parseRefHeuristic, parseBibtex, parseRis, toBibtex, toRis, sortSources, withLabels, checks, verify, findCitations, fromCrossref, blank, stripHtml, authorToInput};
