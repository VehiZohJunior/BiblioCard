/* SCIENTUS : moteur (normes, analyse, contrôles) — sans dépendance au navigateur, testable avec Node — généré depuis la version autonome, ne pas modifier à la main sans relancer les tests */

const NB = "\u00A0";
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const I = s => s ? `<i>${esc(s)}</i>` : "";
const stripHtml = h => String(h).replace(/<[^>]+>/g,"").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&amp;/g,"&");
// (\u0131 sans point, \u0142, \u00f8\u2026 : \u00ab Bourd\u0131eu \u00bb dans OpenAlex doit valoir \u00ab Bourdieu \u00bb)
const norm = s => String(s||"").replace(/\u0131/g, "i").replace(/\u0142/g, "l").replace(/\u00f8/g, "o").replace(/[\u00e6]/g, "ae").replace(/\u0153/g, "oe").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
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
  // tous les auteurs jusqu’au dernier, jamais d’abréviation dans la bibliographie (règle SCIENTUS)
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
  return `${first}, ${a.slice(1, -1).map(fullName).join(", ")}, and ${fullName(a[a.length - 1])}`; // tous les auteurs, jamais « et al. »
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
  return f.join(", "); // tous les auteurs, jamais « et al » (règle SCIENTUS)
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
  // entrées générées depuis une citation : œuvre retrouvée en ligne avec un doute, ou rien trouvé du tout
  if(s.aConfirmer) m.push({f:"title", t:"Œuvre à confirmer"});
  if(s.etAl) m.push({f:"authors", t:"Tous les auteurs à écrire (pas « et al. »)"});
  if(s.aCompleter) m.push({f:"title", t:"Introuvable en ligne : à compléter"});
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
  // « PERELMAN Chaïm et OLBRECHTS-Tyteca, Lucie » : chaque auteur a au plus une virgule, l’un est inversé
  const invOk = chunks.length > 1 ? chunks.some(c => inv.test(c)) && chunks.every(c => (c.match(/,/g) || []).length <= 1) : inv.test(chunks[0]);
  if(invOk) return chunks.map(c => { const m = c.match(inv); return m ? {family:m[1], given:m[2]} : parseAuthor(c); }).filter(Boolean);
  return t.split(/,\s|\s+(?:et|and|&)\s+/).map(parseAuthor).filter(Boolean);
}
/* NORCAMES : « NOM Prénom, Année, Zone titre, Lieu de publication, Zone Éditeur ».
   Tout ce qui est entre l’année et le lieu est le titre, virgules et sous-titres compris
   (« Qu’est-ce que le libéralisme ? Ethique, politique, société, Paris, Gallimard »).
   L’édition (« 2nde éd. ») et le traducteur (« trad. X ») suivent le titre. */
function camesTitleZone(rest){
  const segs = rest.replace(/^[\s.,:;]+/,"").replace(/[.\s]+$/,"").split(/,\s+/);
  const ED = /^(?:\d+\p{L}*|\p{L}+)\s+[ée]d(?:\.|ition)$|^[ée]d(?:\.|ition)\s/iu;
  let edition = "", translator = "";
  // « Paris, Hachette, Nouvelle édition » : édition placée après l’éditeur
  if(segs.length > 2 && ED.test(segs[segs.length - 1])) edition = segs.pop();
  // « …of Exaggeration. Cambridge, Cambridge University Press » : ville collée au titre par un point
  if(segs.length === 2){
    const m = segs[0].match(/^(.+[^.\s]{2})\.\s+(\p{Lu}[\p{L}'’ -]{1,30})$/u);
    if(m && m[2].split(" ").length <= 3 && !/\d/.test(segs[1])) return {title: m[1].trim(), edition, translator, tail: `, ${m[2]}, ${segs[1]}.`};
  }
  if(segs.length < 3) return null;
  let end = segs.findIndex((x, i) => i > 0 && /^(Th[èe]se|M[ée]moire|Rapport|Ph\.?\s?D|PhD|Doctoral|Master)/i.test(x));
  if(end < 0){
    const city = segs[segs.length - 2], pub = segs[segs.length - 1];
    if(!/^[\p{Lu}][\p{L}'’ -]{1,30}$/u.test(city) || city.split(" ").length > 3 || /\d|https?:/.test(city + pub)) return null;
    end = segs.length - 2;
  }
  const t = segs.slice(0, end);
  const TR = /^(?:trad(?:\.|uit(?: par)?)|trans(?:l\.|\.|lated by)?)\s+/i; // « trad. X », « Transl. X »
  while(t.length > 1){
    const last = t[t.length - 1];
    if(ED.test(last)){ edition = last; t.pop(); }
    else if(TR.test(last)){ translator = last.replace(TR, ""); t.pop(); }
    else break;
  }
  return {title: t.join(", ").trim(), edition, translator, tail: ", " + segs.slice(end).join(", ") + "."};
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
  const q = rest.match(/^[«“"]\s?([^»”"]+?)\s?[»”"]/) || rest.match(/^(?:‘‘|'')\s?(.+?)\s?(?:’’|''|”)/);
  if(q){
    s.title = q[1].replace(/[.,]$/,"").trim();
    const after = rest.slice(rest.indexOf(q[0]) + q[0].length).replace(/^[\s.,]+/,"");
    // chapitre : « in Ouvrage » ou « in NOM Prénom (dir.), Ouvrage » ou « Van Dijk, T.A. (ed.) Ouvrage »
    const isIn = /^(in|dans)\b\s*:?/i.test(after), a2 = after.replace(/^(in|dans)\s*:?\s*/i, "");
    const ed = a2.match(/^(.{2,120}?)\s*\((?:dir|[ée]ds?|coord|sous la dir)\.?\)\s*,?\s*/i);
    if(isIn || ed){
      s.type = "chapter";
      if(ed) s.editors = ed[1].replace(/[,\s]+$/, "").trim();
      s.container = (ed ? a2.slice(ed[0].length) : a2).split(/,\s|\.\s(?=\p{Lu})/u)[0].trim();
    }
    else { s.type = "article"; s.container = after.split(/,\s|\.\s/)[0].replace(/\s?\d+\s?\(.*$/,"").trim(); }
    rest = after;
  } else if(/\d+\s?\(\d+\)|,\s?\d+,\s?\d+\s?[-–]\s?\d+/.test(rest)){
    const m2 = rest.match(/^(.+?[^.\s]{2})\.\s+([^,]+?),\s?\d/);
    s.type = "article";
    if(m2){ s.title = m2[1].trim(); s.container = m2[2].trim(); rest = rest.slice(m2[0].length - 1); }
    else s.title = rest.split(/\.\s/)[0];
  } else {
    const it0 = italics[0], at0 = it0 ? rest.indexOf(it0) : -1;
    const z = at0 >= 0 && at0 < 6 ? null : camesTitleZone(rest);
    if(at0 >= 0 && at0 < 6){ s.title = it0; s.type = "book"; rest = rest.slice(at0 + it0.length); }
    else if(z){ s.title = z.title; s.type = "book"; if(z.edition) s.edition = z.edition; if(z.translator) s.translator = z.translator; rest = z.tail; }
    else { const seg = rest.split(/\.\s|,\s/); s.title = (seg[0] || "").trim(); s.type = "book"; rest = rest.slice(s.title.length); }
  }
  // thèse en APA : « Titre [Thèse de doctorat, Université…] »
  const br = s.title.indexOf(" ["); if(br > 0){ rest = s.title.slice(br) + " " + rest; s.title = s.title.slice(0, br).trim(); }
  const pg = rest.match(/p{1,2}\.?\s?(\d+\s?[-–]\s?\d+)/) || (s.type !== "book" && rest.match(/(?:,|:)\s?(\d+\s?[-–]\s?\d+)/)); if(pg) s.pages = pg[1].replace(/\s/g,"");
  const vol = rest.match(/vol(?:ume|\.)?\s?(\d+)/i) || rest.match(/(?:^|,\s)(\d+)\s?\(\d+\)/); if(vol) s.volume = vol[1];
  const iss = rest.match(/(?:n[°o]\.?|issue|no\.)\s?(\d+)/i) || rest.match(/\d+\s?\((\d+)\)/); if(iss) s.issue = iss[1];
  if(/th[èe]se|dissertation|m[ée]moire/i.test(raw)){
    s.type = "thesis"; const g = raw.match(/(Th[èe]se de doctorat|M[ée]moire de master|Ph\.?\s?D\.? dissertation|Doctoral dissertation)/i); if(g) s.genre = g[1];
    s.title = s.title.replace(/\.\s+(?:Ph\.?\s?D|PhD|Doctoral|Master|Th[èe]se|M[ée]moire)\b.*$/i, ""); // « Titre. Ph.D dissertation under… »
  }
  const bracket = rest.match(/\[(?:Th[èe]se|M[ée]moire|PhD|Doctoral|Master)[^,\]]*,\s*([^\]]+)\]/i); // APA : [Thèse de doctorat, Université…]
  if(bracket){ s.publisher = bracket[1].trim(); }
  else if(s.type === "book" || s.type === "thesis" || s.type === "chapter"){
    // chapitre : ville et éditeur viennent après le titre de l’ouvrage collectif (pas dans les noms des directeurs)
    const zone = s.type === "chapter" && s.container && rest.includes(s.container) ? rest.slice(rest.indexOf(s.container) + s.container.length) : rest;
    let cp = zone.match(/([\p{Lu}][\p{L} -]{1,30})\s?:\s?([^,.;]{2,60})/u);
    if(cp){
      s.city = cp[1].trim(); s.publisher = cp[2].trim();
      // « Notre Dame, IN: University of Notre Dame Press » : l’État américain renvoie à la ville qui le précède
      if(/^\p{Lu}{2}$/u.test(s.city)){ const prev = zone.slice(0, cp.index).split(/,\s*/).map(x => x.trim()).filter(x => x && !/^\(|\)$/.test(x)).pop(); if(prev && /^\p{Lu}[\p{L}'’ -]{1,30}$/u.test(prev)) s.city = prev; }
    }
    else if(/^(?:Th[èe]se|M[ée]moire)/i.test(zone) === false && (() => {
      // APA : « Titre. Sous-titre, avec virgules. Éditeur. » : l’éditeur est la dernière phrase
      const sents = zone.replace(/^[\s.,:;]+/,"").replace(/[.\s]+$/,"").split(/\.\s+(?=\p{Lu})/u);
      const last = sents[sents.length - 1];
      if(sents.length > 1 && !/[,\d[\]]/.test(last)){ s.publisher = last.trim(); return true; }
      return false;
    })()){ /* éditeur trouvé */ }
    else {
      const segs = zone.split(/,\s/).map(x => x.replace(/^[\s.,:;]+/,"").replace(/[.]$/,"").trim()).filter(x => x && !/\d/.test(x) && !/^(in|dans)\b/i.test(x) && !/https?:|^visited|^consult/i.test(x));
      if(segs.length >= 2){
        s.city = segs[segs.length-2]; s.publisher = segs[segs.length-1];
        // « Université X, Abidjan » : l’établissement est l’éditeur, même placé avant la ville
        // « l’Harmattan, Côte d’Ivoire » : une « ville » en minuscule est l’éditeur
        if((/universit|[ée]cole|institut|presses/i.test(s.city) && !/universit|[ée]cole|institut|presses/i.test(s.publisher)) || /^\p{Ll}/u.test(s.city)) [s.city, s.publisher] = [s.publisher, s.city];
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
  // « Titre, Journal of…, Volume 6 – Issue 11 » : un volume ou un numéro sans éditeur, c’est un article
  if(s.type === "book" && (s.volume || s.issue) && !s.city && !s.publisher && !s.url){
    s.type = "article";
    s.container = rest.replace(/^[\s.,:;]+/, "").split(/,\s/)[0].replace(/^.*\.\s+(?=\p{Lu})/u, "").replace(/\s*[–-]\s*\p{L}+\s+\d{4}$/u, "").trim();
  }
  s.title = s.title.replace(/^(?:‘‘|''|[«“"‘])\s*/, ""); // guillemet ouvrant resté seul
  if(s.url && !s.container && s.type === "book" && !s.publisher){ s.type = "webpage"; try{ s.container = new URL(s.url).hostname.replace(/^www\./,""); }catch(e){} }
  return retirerEtAl(s, raw);
}
/* « FOWLER Roger et al. » : « al » n’est pas un auteur. Dans une bibliographie, tous les auteurs sont écrits
   jusqu’au dernier (règle de l’utilisateur, 2026-10-27) : la liste est marquée incomplète (etAl) pour être
   complétée en ligne, et signalée tant qu’elle ne l’est pas. */
const RE_ET_AL = /^(?:al|al\.|alii|autres|others|coll|coll\.)$/i;
function retirerEtAl(s, raw){
  const n = s.authors.length;
  s.authors = s.authors.filter(a => !RE_ET_AL.test(String(a.family).trim()) && !(/^al\.?$/i.test(a.given) && !a.family));
  if(s.authors.length < n || /\b(?:et|and|&)\s+al\b|\bet\s+coll\b|\band\s+others\b/i.test(String(raw || "").slice(0, 120))) s.etAl = true;
  return s;
}
function blank(){ return {id: "s" + Math.random().toString(36).slice(2,10), type:"article", authors:[], title:"", year:"", container:"", volume:"", issue:"", pages:"", city:"", publisher:"", edition:"", translator:"", editors:"", genre:"", url:"", doi:"", isbn:"", accessed:"", origin:"Saisie manuelle"}; }

/* ---------- formules d’abonnement (les prix qui font foi sont ceux du serveur : supabase/functions/payer-abonnement) ---------- */
const FORMULES = [
  {n: 1, prix: 3000, titre: "Bibliographie", inclus: ["Bibliographie dans toutes les normes : NORCAMES, APA, ISO 690, Chicago, MLA, Vancouver, notes", "Lecture des mémoires Word et PDF, correction du fichier Word", "Contrôle des citations, de l’existence des références et de la structure NORCAMES"]},
  {n: 2, prix: 5000, titre: "Bibliographie et dictée", inclus: ["Tout ce que contient la formule 1", "Dictée Lian’Z : tu rédiges en parlant, transcription fidèle, sans reformulation"]},
  {n: 3, prix: 7000, titre: "Toutes les fonctions", inclus: ["Tout ce que contient la formule 2", "Contrôle des similitudes (anti-plagiat)", "Toutes les nouveautés de l’application"]},
];
// formule minimale de chaque fonction réservée
const BESOIN = {biblio: 1, dictee: 2, plagiat: 3, plan: 3};
// Formule en vigueur d’après les dates du serveur. decalage = heure du serveur − heure de l’appareil au moment
// de la lecture : une horloge d’appareil avancée ou retardée ne change rien.
function formuleEnVigueur(acces, maintenant){
  if(!acces) return 0;
  const t = maintenant + (acces.decalage || 0);
  if(acces.fin && Date.parse(acces.fin) > t) return +acces.formule_payee || 0;
  if(acces.essai_fin && Date.parse(acces.essai_fin) > t) return 3;
  return 0;
}

/* ---------- lecture d’un document : section bibliographie + découpage ---------- */
const YEAR_RE = /(1[5-9]\d{2}|20\d{2}|s\.\s?d\.|n\.\s?d\.)/;
/* Une vraie référence : un nom d’auteur en tête (« BOURDIEU Pierre, », « Fairclough, N. », « Al-Azzawi Q. (2018) »),
   une année (ou s.d.), une longueur raisonnable, et pas de phrases rédigées. Sans ce garde-fou, les paragraphes
   d’un mémoire sans bibliographie passaient pour des références (« CHAPTER II: THEORETICAL FRAMEWORK This chapter… »). */
const DEBUT_PROSE = /^(?:\d+[.)]\s|[IVX]+[.)]\s|chapter|chapitre|section|partie|part\b|introduction|conclusion|this|these|the|in|as|according|however|thus|selon|comme|ainsi|ce|cette|ces|les|la|le|dans|nous|on|il|elle|en|pour|par|de|du|des)\b/i;
const MOTS_PROSE = /\b(?:is|are|was|were|which|that|this|we|he|she|they|est|sont|était|qui|que|nous|il|elle|ils|cette|dont)\b/gi;
function estReference(raw){
  const t = stripMarks(String(raw || "")).replace(/\s+/g, " ").trim();
  if(t.length < 25 || t.length > 700) return false;
  // « Le langage est… » est de la prose ; « Le Goff, Jacques » est un nom : le mot suivant décide
  if(/^(?:\d+[.)]\s|[IVX]+[.)]\s|chapter\b|chapitre\b|section\b)/i.test(t) || (DEBUT_PROSE.test(t) && /^\S+\s+\p{Ll}/u.test(t))) return false;
  if(!/\b(1[5-9]\d\d|20\d\d)[a-z]?\b|\bs\.\s?d\.|\bn\.\s?d\./i.test(t)) return false;
  if(!/^[\p{Lu}][\p{L}'’\-]+(?:\s+(?:[\p{Lu}][\p{L}'’\-]*\.?|de|da|van|von|der|del|dos|du|le|la|al|el))*\s*[,(.:]|^[\p{Lu}][\p{Lu}'’\-]{1,}\s+[\p{Lu}]/u.test(t)) return false;
  return (t.match(MOTS_PROSE) || []).length < 3;
}
const partReferences = L => L.length ? L.filter(estReference).length / L.length : 0;
function findBibSection(text){
  const head = /^[ \t]*(?:[IVX\d]+[.)-]?\s*)?(r[ée]f[ée]rences bibliographiques|r[ée]f[ée]rences|bibliograp{1,2}h{1,2}ie(?:\s+(?:g[ée]n[ée]rale|s[ée]lective|indicative))?|sources et bibliographie|ouvrages cit[ée]s|works cited|references|bibliograp{1,2}h{1,2}y|webographie)[ \t]*:?[ \t]*$/gim; // « BIBLIOGRAPPHY » : coquille réelle
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
/* ---------- texte d’un PDF ----------
   pages : pour chaque page, les morceaux de texte de pdf.js {str, x, y, w, h}.
   Une espace seulement entre deux morceaux réellement séparés (sinon « AL - AZZAWI », « Pro blem »),
   une ligne vide entre deux paragraphes, et on retire numéros de page, en-têtes et pieds de page
   qui se répètent (« Revue Flaly no 13, Deuxième semestre »). */
function pdfPagesToText(pages){
  const lined = pages.map(items => {
    const lines = []; let cur = null, lastY = null, lastEnd = null, lastH = 10;
    items.forEach(it => {
      const h = it.h || lastH;
      if(lastY === null || Math.abs(lastY - it.y) > 2){
        cur = {t: "", gap: lastY !== null && Math.abs(lastY - it.y) > lastH * 1.9}; lines.push(cur); lastEnd = null;
      } else if(lastEnd !== null && cur.t && !/\s$/.test(cur.t) && !/^\s/.test(it.str) && it.x - lastEnd > h * 0.12) cur.t += " ";
      cur.t += it.str; lastY = it.y; lastH = h; lastEnd = it.x + it.w;
    });
    return lines.map(l => ({...l, t: l.t.replace(/\s+/g, " ").trim()})).filter(l => l.t);
  });
  // en-têtes et pieds de page : lignes de haut ou de bas de page qui reviennent (chiffres mis à part)
  const key = t => t.replace(/\d+/g, "#").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); // « Deuxieme » = « Deuxième »
  const seen = {};
  lined.forEach(ls => new Set([...ls.slice(0, 2), ...ls.slice(-2)].map(l => key(l.t))).forEach(k => seen[k] = (seen[k] || 0) + 1));
  const repeated = k => pages.length >= 3 && seen[k] >= Math.max(3, Math.ceil(pages.length / 3));
  return lined.map(ls => ls.filter((l, i) => !/^\d{1,4}$/.test(l.t) && !((i < 2 || i >= ls.length - 2) && repeated(key(l.t))))
    .map((l, i) => (i && l.gap ? "\n\n" : i ? "\n" : "") + l.t).join("")).join("\n");
}
/* ---------- structure d’un article selon NORCAMES/LSH ----------
   text : texte du document (italique marqué ⟦…⟧, paragraphes séparés par une ligne vide).
   headings : titres de parties repérés par leur style Word (facultatif ; sans eux, seule la
   suite des numéros est contrôlée, pour ne pas prendre une phrase courte pour un titre).
   Renvoie null si le document n’a ni résumé ni abstract : ce n’est pas un article de revue. */
const ART_PARTS = [
  ["resume", "Résumé", /^r[ée]sum[ée](?!\p{L})/iu],
  ["motscles", "Mots clés", /^mots?[\s-]*cl[ée]s?(?!\p{L})/iu],
  ["abstract", "Abstract", /^abstract\b/i],
  ["keywords", "Key words", /^key[\s-]*words?\b/i],
  ["introduction", "Introduction", /^(?:\d+[.)]?\s*)?introduction(?:\s+g[ée]n[ée]rale)?\s*:?$/i],
  ["conclusion", "Conclusion", /^(?:\d+[.)]?\s*)?conclusion(?:\s+g[ée]n[ée]rale)?\s*:?$/i],
  ["references", "Références bibliographiques", /^(?:r[ée]f[ée]rences bibliographiques|r[ée]f[ée]rences|bibliographie(?:\s+\p{L}+)?)\s*:?$/iu],
];
const NUM_HEAD = /^(\d+(?:\.\d+)*)\.?\s+(\S.*)$/;
const NOT_HEAD = /^(tableau|figure|graphique|source|carte|photo|image|encadr[ée]|note|sch[ée]ma)(?!\p{L})/iu;
// Le travail se fait ligne par ligne : dans un PDF, un titre (« CONCLUSION », « BIBLIOGRAPHY ») n’est pas
// toujours séparé du texte par une ligne vide. On part du résumé de l’article : avant lui, un numéro de revue
// contient sommaire, éditorial et autres articles (« Introduction……IX »).
function checkArticleStructure(text, headings){
  const L = String(text || "").split(/\n/).map(r => ({r, t: stripMarks(r).replace(/\s+/g, " ").trim()})).filter(x => x.t);
  const lines = L.map(x => x.t);
  const RE = Object.fromEntries(ART_PARTS.map(([k, , re]) => [k, re]));
  RE.references = /^(?:\d+[.)]?\s*)?(?:r[ée]f[ée]rences bibliographiques|r[ée]f[ée]rences|bibliograp{1,2}h{1,2}(?:ie|y)(?:\s+\p{L}+)?|references|works cited|webographie)\s*:?$/iu;
  const LABEL = Object.fromEntries(ART_PARTS.map(([k, label]) => [k, label]));
  const first = (re, from, to, short) => { for(let i = from; i < to; i++) if((!short || lines[i].length < 60) && re.test(lines[i])) return i; return undefined; };
  const anchors = [first(RE.resume, 0, lines.length), first(RE.abstract, 0, lines.length)].filter(i => i !== undefined);
  if(!anchors.length) return null;
  const anchor = Math.min(...anchors), base = Math.max(0, anchor - 15);
  const at = {};
  ["resume", "motscles", "abstract", "keywords"].forEach(k => at[k] = first(RE[k], base, lines.length));
  at.introduction = first(RE.introduction, anchor, lines.length, true);
  at.conclusion = first(RE.conclusion, anchor, lines.length, true);
  at.references = first(RE.references, Math.max(anchor, at.conclusion ?? 0, at.introduction ?? 0), lines.length, true) ?? first(RE.references, anchor, lines.length, true);
  const end = at.references ?? lines.length;
  const out = {missing: [], order: [], numbering: [], longQuotes: [], italicQuotes: [], email: true, refsLabel: "", terrain: false};
  const isHead = l => l.length < 80 && !/[.;!?,]$/.test(l);
  // terrain : Méthodologie, puis Résultats et Discussion
  const body = (at.introduction ?? anchor) + 1, stop = Math.max(body, at.conclusion ?? end);
  const find = re => first({test: l => isHead(l) && re.test(l.replace(NUM_HEAD, "$2"))}, body, end);
  // article de terrain = une méthodologie ET des résultats ; il lui faut alors une discussion
  const meth = find(/^(m[ée]thodologie|m[ée]thodes?|mat[ée]riels? et m[ée]thodes?|cadre m[ée]thodologique|methodology|methods|methodological)(?!\p{L})/iu);
  if(meth !== undefined && find(/r[ée]sultats|results/i) !== undefined){
    out.terrain = true;
    if(find(/discussion|interpr[ée]tations?/i) === undefined) out.missing.push("Discussion");
  }
  ART_PARTS.forEach(([k, label]) => { if(at[k] === undefined) out.missing.push(label); });
  // intitulé français attendu… sauf pour un article rédigé en anglais (« References », « Bibliography »)
  const lang = langOf(lines.slice(anchor, end).join(" ").slice(0, 20000));
  if(at.references !== undefined && lang !== "en" && !/r[ée]f[ée]rences bibliographiques/i.test(lines[at.references])) out.refsLabel = lines[at.references].replace(/\s*:$/, "");
  // ordre : résumé puis mots clés, abstract puis key words (le bloc anglais peut venir en premier),
  // puis introduction, conclusion, références
  const pairs = [["resume", "motscles"], ["abstract", "keywords"]];
  pairs.forEach(([a, b]) => { if(at[a] !== undefined && at[b] !== undefined && at[b] < at[a]) out.order.push(`ordre : ${LABEL[b]} avant ${LABEL[a]}`); });
  const chain = ["resume", "motscles", "abstract", "keywords", "introduction", "conclusion", "references"];
  ["introduction", "conclusion", "references"].forEach(k => {
    if(at[k] === undefined) return;
    const before = chain.slice(0, chain.indexOf(k)).filter(e => at[e] !== undefined && at[e] > at[k]).pop();
    if(before) out.order.push(`ordre : ${LABEL[k]} avant ${LABEL[before]}`);
  });
  // adresse électronique de l’auteur, avant le résumé
  if(!lines.slice(base, anchor).some(l => /[\w.+-]+@[\w-]+\.[\w.-]+/.test(l))) out.email = false;
  // parties titrées et numérotées « 1. », « 1.1. », « 2.2.1 » (sauf introduction, conclusion et bibliographie)
  const styled = headings && headings.length ? new Set(headings.map(h => h.replace(/\s+/g, " ").trim())) : null;
  const capsHead = l => l === l.toLocaleUpperCase("fr") && (l.match(/\p{L}/gu) || []).length >= 8 && l.split(" ").length >= 2 && !/\d/.test(l);
  let prev = null, format = false;
  for(let i = body; i < stop; i++){
    const l = lines[i];
    if(!isHead(l) || NOT_HEAD.test(l) || /^[«“"(\[]/.test(l)) continue;
    const m = l.match(NUM_HEAD);
    if(!m){ if(styled ? styled.has(l) : capsHead(l)) out.numbering.push({text: l, issue: "partie non numérotée"}); continue; }
    const n = m[1].split(".").map(Number);
    if(n.some(x => x < 1 || x > 20)) continue; // numéros de versets, de tableaux…
    if(styled ? !styled.has(l) && l.split(" ").length > 14 : l.split(" ").length > 14 || !/^\p{Lu}/u.test(m[2])) continue;
    if(prev){
      const ok = n.length <= prev.length + 1 && n.every((x, j) => j < n.length - 1 ? x === (prev[j] || 0) : x === (j < prev.length ? prev[j] + 1 : 1));
      if(!ok) out.numbering.push({text: l, issue: `numéro ${m[1]} après ${prev.join(".")}`});
    } else if(n.some(x => x !== 1)) out.numbering.push({text: l, issue: `la première partie porte le numéro ${m[1]}`});
    if(n.length === 1 && !/^\d+\.\s/.test(l) && !format){ format = true; out.numbering.push({text: l, issue: "numéro sans point (NORCAMES : « 1. »)"}); }
    prev = n;
  }
  // citations : en romain, entre guillemets ; au-delà de trois lignes (≈ 40 mots avec la phrase qui l’introduit),
  // à la ligne et en retrait. Une citation qui ouvre sa propre ligne est déjà présentée à part.
  const zone = L.slice(body, end).map(x => x.r).join("\n");
  for(const q of zone.matchAll(/[«“]([^»”]{2,})[»”]/g)){
    if(/⟦/.test(q[1])) out.italicQuotes.push(stripMarks(q[1]).replace(/\s+/g, " ").trim().slice(0, 80));
    const lineStart = stripMarks(zone.slice(zone.lastIndexOf("\n", q.index) + 1, q.index)).trim();
    const sentence = stripMarks(zone.slice(Math.max(0, q.index - 400), q.index)).replace(/\s+/g, " ").split(/[.!?]\s+(?=\p{Lu})/u).pop();
    const qw = stripMarks(q[1]).split(/\s+/).filter(Boolean).length, sw = sentence.split(/\s+/).filter(Boolean).length;
    // au-delà de 120 mots, c’est un guillemet resté ouvert, pas une citation
    if(qw >= 25 && qw <= 120 && qw + sw > 40 && lineStart.length > 3) out.longQuotes.push({text: stripMarks(q[1]).replace(/\s+/g, " ").trim().slice(0, 90), words: qw});
  }
  out.count = out.missing.length + out.order.length + out.numbering.length + out.longQuotes.length + out.italicQuotes.length + (out.email ? 0 : 1) + (out.refsLabel ? 1 : 0);
  return out;
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
    // nouvelle référence : la précédente est finie (point) ; ou la ligne s’ouvre sur un NOM en capitales suivi
    // d’un prénom et donne une année, même si la précédente n’a pas de point final (« …Arizona, Sage »)
    const strong = /^⟦?\p{Lu}{2}[\p{Lu}'’-]*(?:\s\p{Lu}[\p{Lu}'’-]+)*,?\s+\p{Lu}\p{Ll}/u.test(l) && YEAR_RE.test(l);
    // « Cambridge, Cambridge University Press. » continue la référence : une nouvelle référence donne son année,
    // ou s’ouvre sur un NOM en capitales, ou sur « Nom, I. » (liste d’auteurs APA qui passe à la ligne)
    const opens = YEAR_RE.test(l) || /^⟦?\p{Lu}{2}/u.test(l) || /^\p{Lu}[\p{L}'’-]+,\s(?:\p{Lu}\.\s?)+/u.test(l) || /^(?:\[\d+\]|\d{1,3}[.)]\s)/.test(l);
    if(cur && start.test(l) && opens && YEAR_RE.test(cur) && (/[.)»”]\s*$/.test(stripMarks(cur)) || strong)) { push(); cur = l; }
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
  // initial : la citation donne l’initiale du prénom, comme le demande NORCAMES (« S. Diakité, 1985 »)
  const add = (fam, yr, raw, initial) => { fam = fam.replace(/[’']s$/,""); if(!fam || STOP.has(fam) || fam.length < 2) return; found.push({family:fam, year:yr, raw:raw.replace(/\s+/g, " ").trim(), initial}); };
  const re1 = /\(([^()]{2,160}?)\)/g; let m;
  while((m = re1.exec(text))){
    m[1].split(/;/).forEach(part => {
      const p = part.match(/((?:\p{Lu}\.[\s-]?)*)\s*(?:(?:de|du|da|di|le|la)\s)?((?:v[ao]n\s+)?\p{Lu}[\p{L}'’-]+)(?:\s+(?:et|and|&)\s+(?:\p{Lu}\.[\s-]?)*\s*\p{Lu}[\p{L}'’-]+)?(?:\s+et\s+al\.?)?,?\s+(1[5-9]\d{2}|20\d{2})([a-z]?)/u);
      if(p) add(p[2], p[3] + p[4], part, !!p[1]);
    });
  }
  // « T. A. van Dijk (2008) » : la particule van / von fait partie du nom (pas « de », trop fréquent dans la phrase)
  // (« Van Dijk (2008) » en début de phrase aussi)
  const re2 = /((?:\p{Lu}\.[\s-]?)*)\s*((?:[vV][ao]n\s+)?\p{Lu}[\p{L}'’-]+)(?:\s+et\s+al\.?)?\s+\((1[5-9]\d{2}|20\d{2})([a-z]?)/gu;
  while((m = re2.exec(text))){
    // « DIOP, Cheikh Anta (1954). Nations… » : ligne d’une liste de références, pas une citation
    const famAt = m.index + m[0].lastIndexOf(m[2], m[0].indexOf("("));
    if(/^\s*\p{Lu}[\p{Lu}'’ -]+,\s+(?:\p{Lu}[\p{L}'’-]*\s+)*$/u.test(text.slice(text.lastIndexOf("\n", m.index) + 1, famAt))) continue;
    add(m[2], m[3] + m[4], m[0], !!m[1]);
  }
  // une entrée par auteur et année ; on retient si l’une des occurrences oublie l’initiale du prénom
  const seen = new Map();
  return found.filter(c => {
    const k = norm(c.family) + c.year, first = seen.get(k);
    if(first){ if(!c.initial && first.initial){ first.initial = false; first.rawNoInitial = c.raw; } return false; }
    if(!c.initial) c.rawNoInitial = c.raw;
    seen.set(k, c); return true;
  });
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
  // citations sans initiale du prénom, alors que l’auteur en a un (exigé par NORCAMES)
  const noInitial = [...ok, ...yearOff].filter(x => !x.c.initial && x.s.authors.some(a => norm(a.family) === norm(x.c.family) && a.given));
  return {ok, missing, yearOff, unused, noInitial, total:cites.length};
}
/* Générer la bibliographie à partir du texte : chaque citation est rattachée à une entrée de la liste du
   document, même quand le chercheur a écrit le nom un peu autrement (« Dragana » / « Dragna », « Spitzbardth »
   / « Spitzbardt », « Henkemans » / « Snoeck Henkemans », prénom et nom inversés). L’année doit concorder.
   verify() reste strict : c’est lui qui signale ces différences d’écriture dans le contrôle. */
const PARTICULES = new Set(["van","von","der","den","del","della","de","du","des","la","le","al","el","ben","bin","ibn"]);
function distance(a, b){
  const d = Array.from({length: a.length + 1}, (_, i) => [i]);
  for(let j = 1; j <= b.length; j++) d[0][j] = j;
  for(let i = 1; i <= a.length; i++) for(let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1));
  return d[a.length][b.length];
}
function nomsProches(x, y){
  if(x === y) return true;
  if(Math.min(x.length, y.length) < 4) return false;
  return distance(x, y) <= (Math.max(x.length, y.length) >= 8 ? 2 : Math.min(x.length, y.length) >= 5 ? 1 : 0);
}
const morceauxNom = t => norm(t).split(/[\s-]+/).filter(w => w.length >= 3 && !PARTICULES.has(w));
function apparierCitations(text, list){
  const cites = findCitations(text), used = new Set(), pairs = [], missing = [];
  const jetons = s => s.authors.flatMap(a => morceauxNom(`${a.family} ${a.given || ""}`));
  cites.forEach(c => {
    const an = String(c.year).replace(/[a-z]$/, ""), fam = morceauxNom(c.family);
    let s = list.find(x => x.year === an && x.authors.some(a => norm(a.family) === norm(c.family)));
    let approx = false;
    if(!s){ s = list.find(x => x.year === an && jetons(x).some(t => fam.some(f => nomsProches(f, t)))); approx = !!s; }
    // même auteur, autre année (réédition, coquille) : la source est bien utilisée ; l’écart d’année est signalé par le contrôle
    let autreAnnee = false;
    if(!s){ s = list.find(x => x.authors.some(a => norm(a.family) === norm(c.family))); autreAnnee = !!s; }
    if(s){ used.add(s.id); pairs.push({c, s, approx, autreAnnee}); } else missing.push({c});
  });
  return {pairs, missing, unused: list.filter(s => !used.has(s.id)), total: cites.length};
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

/* ---------- construire la bibliographie à partir des citations du texte ----------
   Pour chaque citation (nom + année), les bases ouvertes (OpenAlex, Open Library) renvoient des candidats.
   On les classe avec le nom, l’année, les mots de la phrase où l’œuvre est citée et sa notoriété.
   L’éditeur et la ville viennent de l’édition de l’année citée (Open Library). Rien n’est ajouté sans l’accord
   de l’utilisateur : la meilleure proposition et deux autres lui sont présentées. */
const MOTS_VIDES = new Set(("les des une pour par sur dans avec sans cette ces qui que dont son ses leur leurs sont ont été être comme plus pas elle ils elles nous vous aussi entre "
  + "the and for with from that this these those its are was were has have their into").split(" "));
// mots porteurs de sens, réduits à leurs 5 premières lettres (discours ≈ discourse, médiatiques ≈ media…),
// plus l’équivalent anglais des mots français fréquents en sciences humaines (pouvoir ≈ power)
const FR_EN = {pouvo: "power", gouve: "gover", langa: "langu", langu: "langu", lingu: "langu", commu: "commo", savoi: "knowl", conna: "knowl", ecrit: "writi", ecrir: "writi", parol: "speec",
  guerr: "war", paix: "peace", femme: "women", genre: "gende", ville: "urban", terre: "land", droit: "law", etat: "state", eglis: "churc", croya: "belie", recit: "narra",
  ensei: "teach", appre: "learn", trava: "work", sante: "healt", envir: "envir", resea: "netwo", jeune: "youth", enfan: "child", famil: "famil", relig: "relig"};
const motsCles = t => { const s = new Set(); norm(stripMarks(t)).split(" ").filter(w => w.length > 3 && !MOTS_VIDES.has(w)).forEach(w => { const p = w.slice(0, 5); s.add(p); if(FR_EN[p]) s.add(FR_EN[p]); }); return s; };
// initiales du prénom données par la citation : « E. Ostrom (1990 » → ["e"]
const initialesCitation = cite => { const m = String(cite.raw || "").match(/((?:\p{Lu}\.[\s-]?)+)\s*(?:v[ao]n\s+)?\p{Lu}[\p{L}'’-]+/u); return m ? m[1].match(/\p{Lu}/gu).map(x => x.toLowerCase()) : []; };
// la phrase où l’œuvre est citée, et ses voisines : c’est d’elle qu’on déduit le sujet de l’œuvre
function contexteCitation(text, raw){
  const t = stripMarks(text), i = t.indexOf(String(raw).trim().slice(0, 40));
  if(i < 0) return "";
  const debut = Math.max(0, t.lastIndexOf(".", Math.max(0, t.lastIndexOf(".", i) - 1)) + 1);
  return t.slice(debut, Math.min(t.length, i + 260));
}
const OA_TYPES = {"book":"book", "monograph":"book", "book-chapter":"chapter", "article":"article", "dissertation":"thesis", "report":"report", "review":"article", "preprint":"article"};
function fromOpenAlex(w){
  const s = blank();
  s.type = OA_TYPES[w.type] || "article";
  // noms tels qu’OpenAlex les écrit parfois : « Pierre Bourdıeu » (ı sans point), « Elinor Ostrom B » (lettre parasite)
  const propre = n => n.replace(/ı/g, "i").replace(/^(\S+(?:\s+\S+)+?)\s+\p{Lu}\.?$/u, "$1");
  s.authors = (w.authorships || []).map(a => parseAuthor(propre((a.author && a.author.display_name) || a.raw_author_name || ""))).filter(Boolean);
  s.title = stripHtml(w.display_name || w.title || "").trim();
  s.year = w.publication_year ? String(w.publication_year) : "";
  const src = (w.primary_location && w.primary_location.source) || {};
  if(s.type === "book") s.publisher = src.host_organization_name || "";
  else s.container = src.display_name || "";
  const b = w.biblio || {};
  s.volume = b.volume || ""; s.issue = b.issue || "";
  s.pages = b.first_page ? b.first_page + (b.last_page && b.last_page !== b.first_page ? "-" + b.last_page : "") : "";
  s.doi = String(w.doi || "").replace(/^https?:\/\/doi\.org\//i, "");
  // OpenAlex range parfois un livre parmi les « articles » : sans revue, sans volume ni pages, c’en est un
  if(s.type === "article" && !s.container && !s.volume && !s.pages) s.type = "book";
  s.origin = "Recherche en ligne"; s._notoriete = w.cited_by_count || 0; s._src = "OpenAlex";
  const pt = w.primary_topic || {}; if(pt.domain) s._domaine = pt.domain.display_name; if(pt.field) s._champ = pt.field.display_name;
  return villeEditeur(s);
}
// ville des éditeurs les plus cités dans les mémoires (NORCAMES exige le lieu d’édition)
const VILLES_EDITEURS = [
  [/l[’']?harmattan/i, "Paris"], [/gallimard|seuil|puf|presses universitaires de france|armand colin|hachette|fayard|karthala|la d[ée]couverte|nathan|payot|minuit|flammarion|albin michel|pr[ée]sence africaine|dunod|belin|cnrs [ée]ditions|odile jacob|klincksieck|honor[ée] champion|ophrys|larousse|robert laffont/i, "Paris"],
  [/educi|ceda|nei[\s-]|nouvelles [ée]ditions ivoiriennes|frat[\s-]mat|puci|presses universitaires de c[ôo]te d/i, "Abidjan"], [/codesria|nea[\s-]|nouvelles [ée]ditions africaines/i, "Dakar"],
  [/presses universitaires de lyon/i, "Lyon"], [/presses universitaires de rennes/i, "Rennes"], [/presses universitaires du septentrion/i, "Villeneuve-d’Ascq"], [/pulim/i, "Limoges"],
  [/de boeck/i, "Bruxelles"], [/presses de l[’']universit[ée] laval/i, "Québec"], [/presses de l[’']universit[ée] de montr[ée]al/i, "Montréal"], [/droz/i, "Genève"],
  [/cambridge university press|polity/i, "Cambridge"], [/oxford university press|blackwell/i, "Oxford"], [/routledge|longman|edward arnold|e\.? arnold|penguin|verso|bloomsbury/i, "London"],
  [/mit press|harvard university press/i, "Cambridge (MA)"], [/princeton university press/i, "Princeton"], [/yale university press/i, "New Haven"], [/university of chicago press/i, "Chicago"],
  [/john benjamins/i, "Amsterdam"], [/de gruyter|mouton/i, "Berlin"], [/peter lang/i, "Berne"], [/\bsage\b/i, "London"], [/palgrave/i, "London"], [/springer/i, "Cham"],
];
function villeEditeur(s){
  if(!s.city && s.publisher){ const v = VILLES_EDITEURS.find(([re]) => re.test(s.publisher)); if(v) s.city = v[1]; }
  return s;
}
function fromOpenLibrary(d){
  const s = blank();
  s.type = "book";
  s.authors = [...new Set(d.author_name || [])].map(parseAuthor).filter(Boolean);
  s.title = d.title + (d.subtitle ? `. ${d.subtitle.charAt(0).toLocaleUpperCase("fr")}${d.subtitle.slice(1)}` : "");
  s.year = d.first_publish_year ? String(d.first_publish_year) : "";
  s.origin = "Recherche en ligne"; s._notoriete = (d.edition_count || 1) * 10; s._src = "Open Library"; s._olKey = d.key || "";
  return s;
}
// éditeur, ville et ISBN de l’édition de l’année citée ; à défaut, de l’édition la plus proche avant
function appliquerEdition(s, editions, annee){
  const eds = (editions || []).map(e => ({an: +((String(e.publish_date || "").match(/\d{4}/) || [0])[0]), e})).filter(x => x.an);
  const choix = eds.filter(x => x.an === +annee)[0] || eds.filter(x => x.an <= +annee).sort((a, b) => b.an - a.an)[0];
  if(!choix) return s;
  const e = choix.e;
  if(!s.publisher && e.publishers && e.publishers[0]) s.publisher = e.publishers[0];
  if(!s.city && e.publish_places && e.publish_places[0]) s.city = String(e.publish_places[0]).replace(/[\[\]]/g, "").replace(/\s*[,;:]$/, "");
  if(!s.isbn) s.isbn = (e.isbn_13 || e.isbn_10 || [""])[0];
  return villeEditeur(s);
}
function memeAuteur(cite, s){
  const fam = norm(cite.family).split(" ").pop();
  return fam && s.authors.some(a => { const f = norm(a.family); return f === fam || f.split(" ").pop() === fam || f.endsWith(" " + fam); });
}
/* ---------- discipline du document et des œuvres ----------
   Les quatre grands domaines d’OpenAlex. Le domaine du document vient de son vocabulaire ; celui d’une œuvre
   vient d’OpenAlex (primary_topic) ou, à défaut, de son titre et de sa revue. Une œuvre d’un autre domaine
   n’est jamais proposée pour une citation (cas réels : « Hodge & Kress (1979) » et « Labov (1984) », cités dans
   une thèse d’analyse du discours, avaient reçu un article de chimie et un d’astronomie). */
const DOMAINES = {
  "Social Sciences": "discours discourse langag language linguisti semanti pragmati rhetori lexic syntax grammai grammar phonolog sociolinguist litter literatur roman novel poesi poetry poem theatr fiction narrat recit translat traduct sociolog societ social politi elector histoir histor philosoph educati enseign pedagog didacti econom droit juridi law communicati media medias presse press journalis cultur anthropolog psycholog identit ideolog argument hyperbol metaphor gender feminis religi geograph urban colonial postcolon africain african ecriture writing reading lecture",
  "Physical Sciences": "chimi chemi chemical physiq physics molecul atom energ materia algorith informati comput reseau network wireless protocol mathemat equation astronom interstell galax spectr emission sediment organotin compound metal polymer catalys quantum electron circuit semiconduct optic laser thermodynam fluid mecaniq mechanic geolog mineral seism ocean climat",
  "Life Sciences": "biolog plante plant espece species genet gene genom cellul cell ecolog agricult agronom forest animal bacteri protein enzym microb zoolog botani biodivers",
  "Health Sciences": "sante health patient cliniq clinical maladi disease cancer medic hopital hospital epidemi therap infect vaccin nursing chirurg surgery pharmac diagnos mortal",
};
const RACINES_DOM = Object.entries(DOMAINES).map(([d, l]) => [d, l.split(" ")]);
function compteDomaines(text){
  const sc = {}; Object.keys(DOMAINES).forEach(d => sc[d] = 0);
  norm(String(text || "").slice(0, 200000)).split(" ").forEach(w => { if(w.length < 4) return; for(const [d, R] of RACINES_DOM) if(R.some(r => w.startsWith(r))){ sc[d]++; break; } });
  return sc;
}
// domaine d’un document : seulement s’il domine nettement (sinon on ne filtre pas)
function domaineTexte(text){
  const sc = compteDomaines(text), L = Object.entries(sc).sort((a, b) => b[1] - a[1]);
  return L[0][1] >= 8 && L[0][1] >= 2 * L[1][1] ? L[0][0] : null;
}
// domaine d’une œuvre : OpenAlex d’abord ; sinon titre et revue, avec au moins deux indices concordants
function domaineFiche(s){
  if(s._domaine) return s._domaine;
  const sc = compteDomaines(`${s.title || ""} ${s.container || ""}`), L = Object.entries(sc).sort((a, b) => b[1] - a[1]);
  return L[0][1] >= 2 && L[1][1] === 0 ? L[0][0] : null;
}
// co-auteurs nommés dans la citation : « Hodge & Kress, 1979 », « Beaugrande and Dressler 1981 », « Kouadio et Traoré (2019) »
function coAuteursCites(cite){
  const raw = String(cite.raw || ""), fam = norm(cite.family).split(" ").pop();
  return [...raw.matchAll(/(?:&|\band\b|\bet\b|,)\s*((?:[vV][ao]n\s+)?\p{Lu}[\p{L}'’-]+)/gu)].map(m => norm(m[1]).split(" ").pop()).filter(n => n && n !== fam && !/^(al|al\.|coll)$/.test(n) && !/^\d/.test(n));
}
function scoreCandidat(cite, ctx, s, domDoc){
  if(domDoc){ const d = domaineFiche(s); if(d && d !== domDoc) return -1; } // autre discipline : jamais proposée
  if(!memeAuteur(cite, s) || !s.title) return -1;
  // « Hodge & Kress (1979) » : le second auteur nommé doit figurer parmi les auteurs de l’œuvre
  const co = coAuteursCites(cite);
  if(co.length && !co.every(n => s.authors.some(a => norm(a.family).split(" ").pop() === n || norm(a.family) === n))) return -1;
  // l’initiale du prénom écarte les homonymes : « E. Ostrom » n’est pas Charles W. Ostrom
  const fam = norm(cite.family).split(" ").pop(), ini = initialesCitation(cite);
  const lui = s.authors.find(a => norm(a.family).split(" ").pop() === fam || norm(a.family).endsWith(" " + fam));
  if(ini.length && lui && lui.given && norm(lui.given).charAt(0) !== ini[0]) return -1;
  // l’œuvre citée sous ce nom en a été le premier auteur (sinon : compte rendu, ouvrage d’un autre…)
  const premier = s.authors[0] && (norm(s.authors[0].family).split(" ").pop() === fam);
  const an = String(cite.year).replace(/[a-z]$/, "");
  const y = s.year === an ? 1 : Math.abs(+s.year - +an) <= 1 ? .4 : 0;
  const T = motsCles(s.title), C = motsCles(ctx);
  let inter = 0; T.forEach(w => { if(C.has(w)) inter++; });
  const sujet = T.size ? inter / Math.min(T.size, 4) : 0;
  return 1 + y + 2 * Math.min(1, sujet) + Math.min(.5, Math.log10(1 + (s._notoriete || 0)) / 8) - (premier ? 0 : 1)
    - (/(compte rendu|review of|erratum|corrigendum|^index$|^table des)/i.test(s.title) ? 1.5 : 0);
}
// candidats classés ; « sure » quand l’auteur, l’année et le sujet concordent nettement
function classerCandidats(cite, ctx, cands, domDoc){
  const vus = new Map();
  (cands || []).forEach(s => {
    const k = norm(s.title).slice(0, 60); const sc = scoreCandidat(cite, ctx, s, domDoc);
    if(sc < 0) return;
    const deja = vus.get(k);
    if(!deja || sc > deja.score) vus.set(k, {s: deja ? fusionFiches(s, deja.s) : s, score: sc});
    else deja.s = fusionFiches(deja.s, s);
  });
  const L = [...vus.values()].sort((a, b) => b.score - a.score);
  const verdict = !L.length ? "rien" : L[0].score >= 2.4 && (!L[1] || L[0].score - L[1].score >= .45) ? "sure" : "choisir";
  return {verdict, L};
}
// une même œuvre trouvée dans deux bases : on garde les champs les plus complets
function fusionFiches(a, b){
  const s = {...a};
  ["publisher", "city", "isbn", "doi", "container", "volume", "issue", "pages", "_olKey"].forEach(k => { if(!s[k] && b[k]) s[k] = b[k]; });
  s._notoriete = Math.max(a._notoriete || 0, b._notoriete || 0);
  return s;
}

/* ---------- plan de travail et lectures par partie ----------
   Des squelettes reconnus, avec pour chaque partie une consigne (ce qu’elle doit contenir), jamais du texte.
   Les intitulés entre crochets sont à remplacer par ceux du chercheur. n = niveau (1 partie, 2 sous-partie). */
const MODELES_PLAN = {
  article_theorique: {nom: "Article de revue CAMES : contribution théorique", source: "NORCAMES/LSH", items: [
    {n: 1, t: "Introduction", r: "Justification du thème, problématique, hypothèses ou objectifs scientifiques, approche."},
    {n: 1, t: "1. [Titre de la première partie]", r: "Premier moment du développement articulé. Partie titrée et numérotée."},
    {n: 2, t: "1.1. [Titre]", r: ""}, {n: 2, t: "1.2. [Titre]", r: ""},
    {n: 1, t: "2. [Titre de la deuxième partie]", r: "Deuxième moment du développement."},
    {n: 2, t: "2.1. [Titre]", r: ""}, {n: 2, t: "2.2. [Titre]", r: ""},
    {n: 1, t: "3. [Titre de la troisième partie]", r: "Troisième moment, si le raisonnement l’exige."},
    {n: 1, t: "Conclusion", r: "Réponse à la problématique, apports, limites et perspectives."},
    {n: 1, t: "Références bibliographiques", r: "Seulement les sources citées, par ordre alphabétique des noms d’auteurs.", sans: true}]},
  article_terrain: {nom: "Article de revue CAMES : recherche de terrain", source: "NORCAMES/LSH", items: [
    {n: 1, t: "Introduction", r: "Contexte, problématique, hypothèses ou objectifs, intérêt de l’étude."},
    {n: 1, t: "1. Méthodologie", r: "Terrain, population ou corpus, échantillon, outils de collecte, méthode d’analyse."},
    {n: 1, t: "2. Résultats", r: "Présentation organisée des données obtenues, sans interprétation."},
    {n: 2, t: "2.1. [Premier résultat]", r: ""}, {n: 2, t: "2.2. [Deuxième résultat]", r: ""},
    {n: 1, t: "3. Discussion", r: "Interprétation des résultats, confrontés aux travaux antérieurs et aux hypothèses."},
    {n: 1, t: "Conclusion", r: "Synthèse, limites de l’étude, perspectives de recherche."},
    {n: 1, t: "Références bibliographiques", r: "Seulement les sources citées, par ordre alphabétique des noms d’auteurs.", sans: true}]},
  memoire: {nom: "Mémoire de master", source: "Usage courant des universités", items: [
    {n: 1, t: "Introduction générale", r: "Contexte, justification du sujet, problématique, questions de recherche, hypothèses, objectifs, annonce du plan."},
    {n: 1, t: "Première partie : cadre théorique et méthodologique", r: ""},
    {n: 2, t: "Chapitre 1 : revue de la littérature", r: "Ce que les travaux antérieurs disent du sujet, et ce qu’ils laissent de côté."},
    {n: 2, t: "Chapitre 2 : cadre théorique et conceptuel", r: "Théories mobilisées et définition des concepts clés."},
    {n: 2, t: "Chapitre 3 : méthodologie", r: "Terrain, corpus ou population, échantillon, outils de collecte, méthode d’analyse."},
    {n: 1, t: "Deuxième partie : [analyse et résultats]", r: ""},
    {n: 2, t: "Chapitre 4 : [titre]", r: "Présentation et analyse des données."},
    {n: 2, t: "Chapitre 5 : [titre]", r: "Suite de l’analyse."},
    {n: 2, t: "Chapitre 6 : discussion", r: "Interprétation des résultats, vérification des hypothèses, confrontation aux travaux antérieurs."},
    {n: 1, t: "Conclusion générale", r: "Rappel de la démarche, principaux résultats, limites, perspectives."},
    {n: 1, t: "Bibliographie", r: "Toutes les sources citées, selon la norme exigée.", sans: true},
    {n: 1, t: "Annexes", r: "Outils de collecte, extraits du corpus, documents complémentaires.", sans: true}]},
  these: {nom: "Thèse de doctorat", source: "Usage courant des écoles doctorales", items: [
    {n: 1, t: "Introduction générale", r: "Contexte, état de la question, problématique, hypothèses, objectifs, méthodologie générale, annonce du plan."},
    {n: 1, t: "Première partie : cadre théorique, conceptuel et méthodologique", r: ""},
    {n: 2, t: "Chapitre 1 : état de l’art", r: "Synthèse critique des travaux sur le sujet."},
    {n: 2, t: "Chapitre 2 : cadre théorique", r: "Théories mobilisées, concepts clés et leur articulation."},
    {n: 2, t: "Chapitre 3 : méthodologie", r: "Terrain, corpus, outils, méthodes d’analyse, limites méthodologiques."},
    {n: 1, t: "Deuxième partie : [titre]", r: "Premier grand ensemble d’analyses."},
    {n: 2, t: "Chapitre 4 : [titre]", r: ""}, {n: 2, t: "Chapitre 5 : [titre]", r: ""},
    {n: 1, t: "Troisième partie : [titre]", r: "Second grand ensemble : interprétation, discussion, propositions."},
    {n: 2, t: "Chapitre 6 : [titre]", r: ""}, {n: 2, t: "Chapitre 7 : [titre]", r: ""},
    {n: 1, t: "Conclusion générale", r: "Synthèse, apports de la thèse, limites, perspectives."},
    {n: 1, t: "Bibliographie", r: "Toutes les sources citées, selon la norme exigée.", sans: true},
    {n: 1, t: "Annexes", r: "Documents complémentaires.", sans: true},
    {n: 1, t: "Index", r: "Si l’école doctorale l’exige.", sans: true}]},
};
// mots d’un intitulé qui ne disent rien du sujet traité
const MOTS_STRUCTURE = /^(premiere|deuxieme|troisieme|quatrieme|partie|chapitre|section|titre|introduction|conclusion|generale|general|sous|resultats?|discussion|annexes?|bibliographie|references|bibliographiques|revue|litterature|etat|question|cadre|theorique|conceptuel|methodologie|methodologique|analyse|pendant|depuis|selon|durant|avant|apres|lors|entre|autour|vers|chez|leurs?)$/;
const RECHERCHE_PAR_ROLE = [[/revue de la litterature|etat de l art|etat de la question/, ""], [/cadre theorique|conceptuel/, "théorie"], [/methodolog/, "méthode enquête"], [/discussion/, ""]];
// mots-clés de recherche pour une partie : son intitulé, complété par le sujet quand l’intitulé est générique
function requeteLectures(sujet, titre){
  const nettoye = norm(String(titre).replace(/\[[^\]]*\]/g, " ").replace(/^\s*(?:\d+(?:\.\d+)*\.?|chapitre\s+\d+\s*:?)\s*/i, ""));
  const propres = nettoye.split(" ").filter(w => w.length > 3 && !MOTS_VIDES.has(w) && !MOTS_STRUCTURE.test(w));
  const motsSujet = norm(sujet).split(" ").filter(w => w.length > 3 && !MOTS_VIDES.has(w) && !MOTS_STRUCTURE.test(w)).slice(0, 6);
  if(propres.length >= 2) return [...new Set([...propres, ...motsSujet.slice(0, 3)])].slice(0, 8).join(" ");
  const role = RECHERCHE_PAR_ROLE.find(([re]) => re.test(nettoye));
  return [...new Set([...motsSujet, ...propres, ...(role && role[1] ? norm(role[1]).split(" ") : [])])].slice(0, 8).join(" ");
}
// Les bases exigent tous les mots d’une requête : au-delà de 3 mots, elles ne trouvent presque rien.
// On lance donc 2 ou 3 requêtes courtes (« presse ivoirienne », « titrologie »…), puis on réunit et on classe.
function requetesLectures(sujet, titre){
  const mots = requeteLectures(sujet, titre).split(" ").filter(w => w && !/^\d+$/.test(w));
  const q = [mots.slice(0, 3), mots.slice(1, 3), mots.slice(0, 2)].map(x => x.join(" ")).filter(x => x.split(" ").length >= 2);
  // le premier mot de sens de l’intitulé, seul : c’est en général l’objet de la partie (« titrologie »)
  const specifique = norm(String(titre).replace(/\[[^\]]*\]/g, " ").replace(/^\s*(?:\d+(?:\.\d+)*\.?|chapitre\s+\d+\s*:?)\s*/i, "")).split(" ").filter(w => w.length > 6 && !MOTS_VIDES.has(w) && !MOTS_STRUCTURE.test(w))[0];
  if(specifique) q.unshift(specifique);
  return {mots, requetes: [...new Set(q)].slice(0, 3)};
}
const FAUX_TITRES = /^(references?|r[ée]f[ée]rences|bibliograph(y|ie)|appendix|annexes?|index|front matter|back matter|table des mati[èe]res|sommaire|contents|introduction|conclusion|editorial|[ée]ditorial)$/i;
// lectures classées : mots-clés présents dans le titre (le premier, objet de la partie, compte double), puis notoriété ;
// doublons et faux titres retirés
function classerLectures(mots, cands){
  const M = [...new Set(mots.map(w => w.slice(0, 5)))], vus = new Set();
  return (cands || []).filter(s => s.title && s.title.length > 8 && !FAUX_TITRES.test(s.title.trim()) && s.authors.length).map(s => {
    const T = motsCles(s.title + " " + (s.container || "")); let n = 0; M.forEach((w, i) => { if(T.has(w)) n += i ? 1 : 2; });
    return {s, score: n + Math.min(.9, Math.log10(1 + (s._notoriete || 0)) / 4) + (s.year >= String(new Date().getFullYear() - 15) ? .2 : 0)};
  }).filter(x => x.score >= 1).sort((a, b) => b.score - a.score)
    // même œuvre avec ou sans sous-titre : on garde la mieux classée
    .filter(x => { const k = norm(x.s.title.split(/\s*[:.]\s+/)[0]).slice(0, 50); return !vus.has(k) && vus.add(k); }).map(x => x.s);
}
// plan d’un document déposé : titres des styles Word si disponibles, sinon titres numérotés ou de parties
function planDepuisTexte(text, headings){
  const lignes = (headings && headings.length ? headings : String(text || "").split(/\n/)).map(l => stripMarks(l).replace(/\s+/g, " ").trim()).filter(Boolean);
  const items = [], vus = new Set();
  for(const l of lignes){
    if(l.length > 110 || /[.;!?,]$/.test(l)) continue;
    // adresses et coordonnées de la page de titre (« 03 BP 7021 Ouagadougou 03 », téléphone, e-mail)
    if(/\b(?:B\.?P\.?|tél|tel|fax|cedex)\b|@|https?:\/\/|^0\d/i.test(l)) continue;
    // le sommaire et le corps répètent les mêmes titres : une seule fois chacun
    const cle = norm(l); if(vus.has(cle)) continue;
    const num = l.match(NUM_HEAD);
    let n = 0;
    if(/^(?:premi[eè]re|deuxi[eè]me|troisi[eè]me|quatri[eè]me|cinqui[eè]me)\s+partie|^partie\s+[\divx]+/i.test(l)) n = 1;
    else if(/^chapitre\s+[\divx]+/i.test(l)) n = 2;
    else if(/^(introduction|conclusion)(\s+g[ée]n[ée]rale)?\s*:?$/i.test(l) || RE_PARTIE_REF.test(l)) n = 1;
    else if(num && num[1].split(".").every(x => +x >= 1 && +x <= 20) && /^\p{Lu}/u.test(num[2]) && l.split(" ").length <= 14) n = Math.min(3, num[1].split(".").length);
    else if(headings && headings.length) n = 2;
    if(n){ vus.add(cle); items.push({n, t: l, r: ""}); }
  }
  return items;
}
const RE_PARTIE_REF = /^(?:r[ée]f[ée]rences bibliographiques|bibliographie|annexes?|bibliography|references|works cited|appendix|appendices)\s*:?$/i;
// fiche HAL (archive ouverte, très riche en travaux francophones)
const HAL_TYPES = {ART: "article", OUV: "book", COUV: "chapter", THESE: "thesis", HDR: "thesis", MEM: "thesis", REPORT: "report", COMM: "chapter", DOUV: "book"};
function fromHal(d){
  const s = blank(), un = v => Array.isArray(v) ? v[0] : (v || "");
  s.type = HAL_TYPES[d.docType_s] || "article";
  s.authors = (d.authFullName_s || []).map(parseAuthor).filter(Boolean);
  s.title = String(un(d.title_s)).trim(); s.year = d.producedDateY_i ? String(d.producedDateY_i) : "";
  s.container = d.journalTitle_s || un(d.bookTitle_s) || ""; s.publisher = un(d.publisher_s);
  s.volume = d.volume_s || ""; s.issue = un(d.issue_s); s.pages = d.page_s || ""; s.doi = d.doiId_s || ""; s.url = d.uri_s || "";
  if(s.type === "thesis"){ s.publisher = un(d.authorityInstitution_s) || s.publisher; s.genre = d.docType_s === "MEM" ? "Mémoire" : "Thèse de doctorat"; }
  s.origin = "Recherche en ligne"; s._src = "HAL";
  return villeEditeur(s);
}
// CrossRef en recherche (repli quand OpenAlex a épuisé son budget du jour)
function fromCrossrefRecherche(it){
  const s = fromCrossref(it);
  s.origin = "Recherche en ligne"; s._src = "CrossRef"; s._notoriete = it["is-referenced-by-count"] || 0;
  return villeEditeur(s);
}
// Autocomplétion OpenAlex (gratuite) : titre, premier auteur, citations, DOI, sans l’année ni la revue.
// Fiche provisoire pour le classement ; la fiche complète vient ensuite de /works/{id}, gratuit aussi.
function fromOAAutocomplete(r){
  const s = blank();
  s.title = stripHtml(r.display_name || "").trim();
  const a = r.hint && parseAuthor(String(r.hint).replace(/ı/g, "i")); s.authors = a ? [a] : [];
  s.doi = String(r.external_id || "").replace(/^https?:\/\/doi\.org\//i, "");
  s.origin = "Recherche en ligne"; s._notoriete = r.cited_by_count || 0; s._src = "OpenAlex"; s._oaId = String(r.short_id || r.id || "").replace(/^.*\//, "");
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
if(typeof module !== "undefined") module.exports = {coAuteursCites, domaineTexte, domaineFiche, estReference, partReferences, apparierCitations, nomsProches, fromCrossrefRecherche, fromOAAutocomplete, MODELES_PLAN, requeteLectures, requetesLectures, classerLectures, planDepuisTexte, fromHal, contexteCitation, fromOpenAlex, fromOpenLibrary, appliquerEdition, scoreCandidat, classerCandidats, fusionFiches, FORMULES, BESOIN, formuleEnVigueur, pdfPagesToText, checkArticleStructure, numberSources, findNumericCites, verifyNumeric, applyVoice, tidy, compareTexts, internalRepeats, frequentWords, pickProbes, abstractFromIndex, wordsOf, CAMES_PROFILES, camesBib, snapshot, evalRecords, evalStats, simTitle, judge, conformity, analyze, findBibSection, splitReferences, stripMarks, STYLES, parseAuthor, parseRefHeuristic, parseBibtex, parseRis, toBibtex, toRis, sortSources, withLabels, checks, verify, findCitations, fromCrossref, blank, stripHtml, authorToInput};
