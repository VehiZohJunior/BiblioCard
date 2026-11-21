/* SCIENTUS : mesure d’audience et bandeau de consentement (2026-11-21).
   Outil : Cloudflare Web Analytics, gratuit, sans cookie, sans profil publicitaire : il compte les pages vues,
   les pays et la vitesse de chargement. Il n’est chargé QU’APRÈS « Accepter », et jamais si l’on refuse.
   JETON_AUDIENCE : jeton PUBLIC du site, donné par Cloudflare (Analytics & Logs → Web Analytics → Add a site).
   Vide = aucune mesure et aucun bandeau (il n’y a alors rien à accepter).
   Les données de travail (projets, réglages) restent dans le stockage du navigateur : elles sont indispensables
   au fonctionnement et ne demandent pas de consentement. */
(function(){
  const JETON_AUDIENCE = "";
  const CLE = "scientus.audience"; // "oui" ou "non", choix conservé 6 mois
  const SIX_MOIS = 182 * 864e5;
  const t = s => (typeof window.tr === "function" ? window.tr(s) : s);
  const lire = () => { try{ const v = JSON.parse(localStorage.getItem(CLE) || "null"); return v && Date.now() - v.le < SIX_MOIS ? v.choix : null; }catch(e){ return null; } };
  const ecrire = choix => { try{ localStorage.setItem(CLE, JSON.stringify({choix, le: Date.now()})); }catch(e){} };

  function charger(){
    if(!JETON_AUDIENCE || document.querySelector("script[data-cf-beacon]")) return;
    const s = document.createElement("script"); s.defer = true;
    s.src = "https://static.cloudflareinsights.com/beacon.min.js";
    s.setAttribute("data-cf-beacon", JSON.stringify({token: JETON_AUDIENCE, spa: false}));
    document.head.appendChild(s);
  }

  function bandeau(){
    if(!JETON_AUDIENCE || document.getElementById("consentement")) return;
    const b = document.createElement("section");
    b.id = "consentement"; b.className = "consentement"; b.setAttribute("role", "dialog"); b.setAttribute("aria-live", "polite");
    b.setAttribute("aria-label", t("Mesure d’audience"));
    b.innerHTML = `<p><b>${t("Nous aider à améliorer SCIENTUS ?")}</b> ${t("Avec ton accord, nous comptons les visites de façon anonyme (Cloudflare Web Analytics, sans cookie publicitaire). Tes documents et tes projets ne sont jamais concernés.")} <a href="confidentialite.html#audience">${t("En savoir plus")}</a></p>
      <div class="consentement-choix"><button type="button" class="btn small" data-choix="non">${t("Refuser")}</button><button type="button" class="btn small" data-choix="oui">${t("Accepter")}</button></div>`;
    b.querySelectorAll("[data-choix]").forEach(x => x.onclick = () => { ecrire(x.dataset.choix); b.remove(); if(x.dataset.choix === "oui") charger(); });
    document.body.appendChild(b);
  }

  // « Gérer mes choix » (liens data-consentement des pieds de page et du menu) : rouvre le bandeau
  document.addEventListener("click", e => { const a = e.target.closest("[data-consentement]"); if(!a) return; e.preventDefault();
    if(!JETON_AUDIENCE){ alert(t("Aucune mesure d’audience n’est active sur SCIENTUS pour le moment.")); return; }
    try{ localStorage.removeItem(CLE); }catch(_){} bandeau(); });

  function demarrer(){ const c = lire(); if(c === "oui") charger(); else if(c === null) bandeau(); }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", demarrer); else demarrer();
  window.ScientusAudience = {actif: !!JETON_AUDIENCE, choix: lire};
})();
