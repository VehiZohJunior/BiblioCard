/* SCIENTUS : apparence claire ou sombre. Chargé dans <head>, AVANT l’affichage, pour éviter un éclair de la
   mauvaise couleur. Trois choix : « clair », « sombre », « auto » (suit le réglage de l’appareil, par défaut).
   Le choix est gardé sur l’appareil (localStorage) ; la feuille de style lit l’attribut data-theme de <html>. */
(function(){
  var CLE = "scientus.theme";
  var sombreSysteme = function(){ try{ return window.matchMedia("(prefers-color-scheme: dark)").matches; }catch(e){ return false; } };
  function lire(){ try{ var v = localStorage.getItem(CLE); return v === "light" || v === "dark" ? v : "auto"; }catch(e){ return "auto"; } }
  function effectif(choix){ return choix === "auto" ? (sombreSysteme() ? "dark" : "light") : choix; }
  function appliquer(choix){
    var html = document.documentElement;
    if(choix === "auto") html.removeAttribute("data-theme"); else html.setAttribute("data-theme", choix);
    // couleur de la barre du navigateur (téléphone) : celle du fond de la page
    var fond = effectif(choix) === "dark" ? "#0E1022" : "#F7F8FC";
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    for(var i = 0; i < metas.length; i++){ metas[i].setAttribute("content", fond); metas[i].removeAttribute("media"); }
  }
  function choisir(choix){
    try{ if(choix === "auto") localStorage.removeItem(CLE); else localStorage.setItem(CLE, choix); }catch(e){}
    appliquer(choix);
    try{ document.dispatchEvent(new CustomEvent("scientus-theme", {detail: {choix: choix, effectif: effectif(choix)}})); }catch(e){}
  }
  appliquer(lire());
  // en mode « auto », suivre l’appareil quand il change (le soir, par exemple)
  try{ window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function(){ if(lire() === "auto") choisir("auto"); }); }catch(e){}
  window.SCIENTUS_THEME = {lire: lire, effectif: function(){ return effectif(lire()); }, choisir: choisir};
})();
