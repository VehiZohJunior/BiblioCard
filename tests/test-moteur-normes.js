// Test unitaire du moteur
const E = require('../js/moteur.js');
const b = o => Object.assign(E.blank(), o);
const src = [
 b({type:"book", authors:[{family:"Amin",given:"Samir"}], title:"Les Défis de la mondialisation", year:"1996", city:"Paris", publisher:"L’Harmattan"}),
 b({type:"article", authors:[{family:"Diagne",given:"Souleymane Bachir"}], title:"Islam et philosophie. Leçons d’une rencontre", container:"Diogène", issue:"202", year:"2003", pages:"145-151"}),
 b({type:"article", authors:[{family:"Ostrom",given:"Elinor"},{family:"Walker",given:"James"},{family:"Gardner",given:"Roy"}], title:"Covenants with and without a sword", container:"American Political Science Review", volume:"86", issue:"2", pages:"404-417", year:"1992", doi:"10.2307/1964229"}),
 b({type:"chapter", authors:[{family:"Koné",given:"Aminata"}], title:"La presse ivoirienne et l’alternance", container:"Médias et démocratie en Afrique", editors:"Paul Kouassi", city:"Abidjan", publisher:"PUCI", pages:"33-58", year:"2019"}),
 b({type:"thesis", authors:[{family:"Vehi",given:"Zoh Junior"}], title:"Discours médiatique et alternance", genre:"Thèse de doctorat", publisher:"Université Félix Houphouët-Boigny", city:"Abidjan", year:"2026"}),
 b({type:"webpage", authors:[], title:"Normes CAMES", container:"revue-akofena.com", url:"https://www.revue-akofena.com", accessed:"21 octobre 2026", year:"2022"}),
 b({type:"book", authors:[{family:"Diakité",given:"Sidiki"}], title:"Violence technologique et développement", year:"1985", city:"Paris", publisher:"L’Harmattan"}),
 b({type:"book", authors:[{family:"Diakité",given:"Sidiki"}], title:"Autre ouvrage", year:"1985", city:"Bamako", publisher:"Jamana"}),
];
for (const k of Object.keys(E.STYLES)) {
  const L = E.withLabels(E.sortSources(src), E.STYLES[k].authorDate);
  console.log("\n=== " + k);
  L.forEach(s => console.log(E.stripHtml(k==="cames"?E.STYLES.cames.bib(s,{upper:true,yearParen:false}):E.STYLES[k].bib(s))));
  console.log("cite:", E.stripHtml(E.STYLES[k].cite(L[0],"12","narratif")), "|", E.stripHtml(E.STYLES[k].cite(L.find(x=>x.authors.length===3),"5")));
}
console.log("\n=== parseAuthor");
["Jean de La Fontaine","AMIN Samir","Souleymane Bachir Diagne","Ben Smith","de La Fontaine, Jean","DIAGNE Souleymane Bachir"].forEach(x=>console.log(x,"→",JSON.stringify(E.parseAuthor(x))));
console.log("\n=== heuristique");
["AMIN Samir, 1996, Les Défis de la mondialisation, Paris, L'Harmattan.",
 "DIAGNE Souleymane Bachir, 2003, « Islam et philosophie. Leçons d'une rencontre », Diogène, n° 202, p. 145-151.",
 "Ostrom, E., Walker, J., & Gardner, R. (1992). Covenants with and without a sword. American Political Science Review, 86(2), 404–417. https://doi.org/10.2307/1964229",
 "BERGER, Gaston, 1967. L'Homme moderne et son éducation. Paris : PUF.",
 "KONÉ Aminata, 2021, Discours médiatique en Côte d'Ivoire, Thèse de doctorat, Abidjan, Université Félix Houphouët-Boigny."
].forEach(l=>{const s=E.parseRefHeuristic(l); console.log(JSON.stringify({type:s.type,authors:s.authors,year:s.year,title:s.title,container:s.container,city:s.city,publisher:s.publisher,pages:s.pages,volume:s.volume,issue:s.issue,doi:s.doi,genre:s.genre}));});
console.log("\n=== vérif");
const L = E.withLabels(E.sortSources(src), true);
const txt = "Comme le montre S. B. Diagne (2003, p. 2), la rencontre est féconde. Selon (S. Amin, 1996, p. 12) et (Ostrom et al., 1992). Mais M. Ascher (1998, p. 223) ajoute… Voir aussi (S. Diakité, 1985b, p. 4) et (Koné, 2018). En 2020 (Loi 2020).";
const r = E.verify(txt, L);
console.log("ok", r.ok.map(x=>x.c.raw)); console.log("missing", r.missing.map(x=>x.c.raw)); console.log("yearOff", r.yearOff.map(x=>x.c.raw)); console.log("unused", r.unused.map(s=>s.title));
console.log("\n=== bibtex roundtrip");
const bt = E.toBibtex(src.slice(0,3)); const back = E.parseBibtex(bt); console.log(back.length, back.map(s=>s.authors.map(a=>a.family).join("/")+" "+s.year+" "+s.pages).join(" | "));
const ris = E.toRis(src.slice(0,3)); const rb = E.parseRis(ris); console.log(rb.length, rb.map(s=>s.type+" "+s.title.slice(0,20)+" "+s.pages).join(" | "));
console.log("checks", src.map(s=>E.checks(s,"cames",src).map(x=>x.t).join(";")).join(" || "));

console.log("erreurs: aucune");
