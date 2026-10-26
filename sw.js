// BiblioCard : fonctionnement hors connexion
const CACHE = "bibliocard-v24";
const CORE = ["./", "./index.html", "./confidentialite.html", "./cgu.html", "./cgv.html", "./css/bibliocard.css", "./js/config.js", "./js/i18n-en.js", "./js/moteur.js", "./js/app.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
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
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if(e.request.method !== "GET") return;
  // bases de vérification : toujours en direct, jamais en cache
  if(/openalex\.org|crossref\.org|archives-ouvertes\.fr|wikipedia\.org|huggingface\.co|hf\.co|supabase\.co/.test(url.hostname)) return;
  // la page : réseau d'abord, cache si hors connexion
  if(e.request.mode === "navigate"){
    e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put("./index.html", copy)); return r; }).catch(() => caches.match("./index.html")));
    return;
  }
  // bibliothèques, polices, reconnaissance de caractères : cache d'abord
  if(/cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.(googleapis|gstatic)\.com|tessdata/.test(url.hostname) || url.origin === location.origin){
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => { if(r.ok || r.type === "opaque"){ const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return r; })));
  }
});
