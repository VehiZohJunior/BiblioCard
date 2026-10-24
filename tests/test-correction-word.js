// Test : correction word
const {JSDOM} = require("jsdom"); const fs = require("fs"); const mammoth = require("mammoth"); const JSZip = require("jszip");
const base = require("./charger")();
const outs = [];
const dom = new JSDOM(base, {runScripts:"dangerously", pretendToBeVisual:true, url:"https://example.org/", beforeParse(w){ Object.defineProperty(w.navigator, "languages", {get: () => ["fr-FR"]}); w.fetch = async () => { throw new TypeError("blocked"); }; w.JSZip = JSZip; }});
const w = dom.window; const d = w.document; const errs = []; w.addEventListener("error", e => errs.push(e.message));
w.mammoth = { convertToHtml: o => mammoth.convertToHtml({buffer: Buffer.from(o.arrayBuffer)}) };
w.HTMLDialogElement.prototype.showModal = function(){ this.open = true; }; w.HTMLDialogElement.prototype.close = function(){ this.open = false; this.dispatchEvent(new w.Event("close")); };
w.HTMLAnchorElement.prototype.click = function(){ outs.push({name: this.download}); }; w.URL.createObjectURL = b => { outs.push({blob: b}); return "blob:x"; }; w.URL.revokeObjectURL = () => {};
(async () => {
  await new Promise(r => setTimeout(r, 150));
  const buf = fs.readFileSync(require("path").join(__dirname, "fixtures/memoire.docx"));
  await w.handleFiles([{ name: "memoire.docx", arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) }]);
  const f = w.eval("ui").files[0]; console.log("Import :", f.status, "| original gardé :", !!f.buf);
  w.eval("state").style = "apa"; w.renderAll();
  const n = await w.fixDocx(f); await new Promise(r => setTimeout(r, 100));
  const blob = outs.find(o => o.blob).blob; fs.writeFileSync(require("path").join(require("os").tmpdir(), "memoire-corrige.docx"), Buffer.from(await blob.arrayBuffer()));
  console.log("Corrigé :", outs.find(o => o.name).name, "|", n, "références réécrites");
  console.log("erreurs :", errs.length ? errs : "aucune"); process.exit(0);
})();
