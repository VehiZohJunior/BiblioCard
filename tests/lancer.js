// Lance tous les tests et affiche un bilan. Usage : npm install, puis npm test
const {execFileSync} = require("child_process"), fs = require("fs"), path = require("path");
const tests = fs.readdirSync(__dirname).filter(f => /^test-.*\.js$/.test(f)).sort();
let ok = 0; const ko = [];
for(const t of tests){
  let out = ""; try{ out = execFileSync(process.execPath, [path.join(__dirname, t), "online"], {encoding: "utf8", timeout: 300000, stdio: ["ignore", "pipe", "pipe"]}); }catch(e){ out = (e.stdout || "") + (e.stderr || ""); }
  const pass = /erreurs ?: aucune/.test(out);
  console.log(`${pass ? "✓" : "✗"} ${t.replace(/\.js$/, "")}`); if(pass) ok++; else ko.push([t, out.split("\n").slice(-6).join("\n")]);
}
console.log(`\n${ok} sur ${tests.length} tests réussis.`);
ko.forEach(([t, o]) => console.log(`\n--- ${t}\n${o}`));
process.exit(ko.length ? 1 : 0);
