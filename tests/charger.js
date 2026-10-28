// Reconstitue l’application en un seul fichier pour la tester dans un navigateur simulé (jsdom).
const fs = require("fs"), path = require("path");
module.exports = function charger(){
  const dir = path.join(__dirname, ".."), lire = f => fs.readFileSync(path.join(dir, f), "utf8");
  let h = lire("index.html").replace(/<link rel="stylesheet" href="css\/bibliocard\.css(\?v=\d+)?">/, () => "<style>" + lire("css/bibliocard.css") + "</style>");
  for(const f of ["theme", "i18n-en", "moteur", "app"]) h = h.replace(new RegExp(`<script src="js/${f}\\.js(\\?v=\\d+)?"></script>`), () => `<script${f === "moteur" ? ' id="engine"' : ""}>` + lire(`js/${f}.js`) + "</script>");
  return h.replace(/<script src=[^>]+><\/script>/g, "").replace(/<link[^>]+>/g, "");
};
