// BiblioCard : serveur de la version en ligne.
// supabaseUrl : adresse du projet Supabase « bibliocard » (Project Settings → Data API → Project URL)
// supabaseKey : clé PUBLIQUE du projet (Project Settings → API Keys → « sb_publishable_… ») ; elle peut être
//               publique : la sécurité vient des règles du serveur (supabase/schema.sql). Ne jamais mettre
//               ici la clé secrète (« sb_secret_… » ou service_role).
// payant      : true = connexion Google, essai de 3 jours puis formules PayDunya.
// Laissés vides, l’application fonctionne sans compte (copie locale, tests, démonstration).
// Projet partagé avec Lian’Z (offre gratuite) : les tables de BiblioCard ont des noms distincts.
window.BIBLIOCARD_CONFIG = {
  supabaseUrl: "https://rvaplfpjwocayptkalzh.supabase.co",
  supabaseKey: "sb_publishable_xFndMM-e4pWZBu9_zYFT2w_DoE9NDP8",
  payant: true,
};
