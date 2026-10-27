// SCIENTUS : fonctionnement hors connexion
// À chaque mise à jour : incrémenter CACHE ET le « ?v= » des styles et scripts dans les pages (même numéro ;
// tests/test-version.js le vérifie). Le « ?v= » oblige même un ancien service worker à charger les bons fichiers.
const CACHE = "bibliocard-v48";
const CORE = ["./", "./index.html", "./accueil.html", "./confidentialite.html", "./cgu.html", "./cgv.html", "./css/bibliocard.css", "./js/config.js", "./js/i18n-en.js", "./js/moteur.js", "./js/app.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./logo-c.png"];
const LIBS = [
  "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE).then(() => Promise.all(LIBS.map(u => fetch(u, {mode:"cors"}).then(r => r.ok && c.put(u, r)).catch(() => null))))));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
// réseau d’abord (toujours la dernière version), copie gardée pour le hors connexion
const reseauDabord = (req, secours) => fetch(req).then(r => { if(r.ok){ const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return r; })
  .catch(() => caches.match(req, {ignoreSearch: true}).then(hit => hit || (secours ? caches.match(secours) : undefined)));
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if(e.request.method !== "GET") return;
  // bases de vérification : toujours en direct, jamais en cache
  if(/openalex\.org|crossref\.org|archives-ouvertes\.fr|wikipedia\.org|huggingface\.co|hf\.co|supabase\.co|openlibrary\.org/.test(url.hostname)) return;
  // les pages : chacune gardée sous sa propre adresse (avant, l’accueil public écrasait l’application)
  if(e.request.mode === "navigate"){ e.respondWith(reseauDabord(e.request, "./index.html")); return; }
  // fichiers de SCIENTUS : réseau d’abord, pour ne jamais mélanger une page neuve et des styles anciens
  if(url.origin === location.origin){ e.respondWith(reseauDabord(e.request)); return; }
  // bibliothèques, polices, reconnaissance de caractères (versions figées) : cache d’abord
  if(/cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.(googleapis|gstatic)\.com|tessdata/.test(url.hostname)){
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => { if(r.ok || r.type === "opaque"){ const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return r; })));
  }
});
