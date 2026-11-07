from django.core.cache import cache
from django.test import TestCase

from .models import Jeton

APP = "https://vehizohjunior.github.io"


class OutilsApi:
    def setUp(self):
        cache.clear()

    def appel(self, methode, url, donnees=None, jeton=None, origine=APP):
        entetes = {"HTTP_ORIGIN": origine}
        if jeton:
            entetes["HTTP_AUTHORIZATION"] = f"Bearer {jeton}"
        return getattr(self.client, methode)(url, data=donnees if donnees is not None else {}, content_type="application/json", **entetes)

    def inscrire(self, email="awa.kone@exemple.ci", mdp="Presse-Ivoirienne-2026"):
        r = self.appel("post", "/api/comptes/inscription", {"email": email, "mot_de_passe": mdp, "nom": "Awa Koné", "appareil": "Chrome, PC"})
        self.assertEqual(r.status_code, 201, r.content)
        return r.json()["jeton"]


class Comptes(OutilsApi, TestCase):
    def test_inscription_connexion_deconnexion(self):
        jeton = self.inscrire()
        self.assertEqual(self.appel("get", "/api/comptes/moi", jeton=jeton).json()["compte"]["email"], "awa.kone@exemple.ci")
        r = self.appel("post", "/api/comptes/connexion", {"email": "AWA.KONE@exemple.ci ", "mot_de_passe": "Presse-Ivoirienne-2026"})
        self.assertEqual(r.status_code, 200, "adresse insensible à la casse et aux espaces")
        j2 = r.json()["jeton"]
        self.assertEqual(self.appel("post", "/api/comptes/deconnexion", jeton=j2).status_code, 200)
        self.assertEqual(self.appel("get", "/api/comptes/moi", jeton=j2).status_code, 401, "jeton révoqué à la déconnexion")
        self.assertEqual(self.appel("get", "/api/comptes/moi", jeton=jeton).status_code, 200, "l’autre appareil reste connecté")

    def test_jeton_jamais_garde_en_clair(self):
        jeton = self.inscrire()
        self.assertFalse(Jeton.objects.filter(empreinte=jeton).exists())
        self.assertEqual(Jeton.objects.count(), 1)

    def test_refus(self):
        self.inscrire()
        self.assertEqual(self.appel("post", "/api/comptes/inscription", {"email": "awa.kone@exemple.ci", "mot_de_passe": "Autre-Mot-2026"}).status_code, 409, "un seul compte par adresse")
        self.assertEqual(self.appel("post", "/api/comptes/inscription", {"email": "x@exemple.ci", "mot_de_passe": "12345678"}).status_code, 400, "mot de passe trop faible")
        self.assertEqual(self.appel("post", "/api/comptes/inscription", {"email": "pas-une-adresse", "mot_de_passe": "Presse-Ivoirienne-2026"}).status_code, 400)
        self.assertEqual(self.appel("post", "/api/comptes/connexion", {"email": "awa.kone@exemple.ci", "mot_de_passe": "faux"}).status_code, 401)
        self.assertEqual(self.appel("get", "/api/comptes/moi").status_code, 401, "sans jeton")
        self.assertEqual(self.appel("get", "/api/comptes/moi", jeton="jeton-invente").status_code, 401)

    def test_essais_en_serie_bloques(self):
        self.inscrire()
        codes = [self.appel("post", "/api/comptes/connexion", {"email": "awa.kone@exemple.ci", "mot_de_passe": "faux"}).status_code for _ in range(11)]
        self.assertEqual(codes[-1], 429)
        r = self.appel("post", "/api/comptes/connexion", {"email": "awa.kone@exemple.ci", "mot_de_passe": "Presse-Ivoirienne-2026"})
        self.assertEqual(r.status_code, 429, "même le bon mot de passe attend la fin du blocage")

    def test_suppression_du_compte(self):
        jeton = self.inscrire()
        self.assertEqual(self.appel("delete", "/api/comptes/moi", {"mot_de_passe": "faux"}, jeton=jeton).status_code, 403)
        self.assertEqual(self.appel("delete", "/api/comptes/moi", {"mot_de_passe": "Presse-Ivoirienne-2026"}, jeton=jeton).status_code, 200)
        self.assertEqual(self.appel("post", "/api/comptes/connexion", {"email": "awa.kone@exemple.ci", "mot_de_passe": "Presse-Ivoirienne-2026"}).status_code, 401)

    def test_cors_reserve_a_scientus(self):
        r = self.appel("get", "/api/etat")
        self.assertEqual(r["Access-Control-Allow-Origin"], APP)
        r = self.appel("get", "/api/etat", origine="https://site-etranger.example")
        self.assertFalse(r.has_header("Access-Control-Allow-Origin"), "un autre site ne peut pas lire les réponses")
        r = self.client.options("/api/projets", HTTP_ORIGIN=APP, HTTP_ACCESS_CONTROL_REQUEST_METHOD="PUT")
        self.assertEqual(r.status_code, 204)
        self.assertIn("Authorization", r["Access-Control-Allow-Headers"])
