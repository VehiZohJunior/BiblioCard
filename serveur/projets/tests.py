from django.test import TestCase

from comptes.tests import OutilsApi

PROJET = {"id": "jabc123", "name": "Thèse, chapitre 2", "kind": "these", "sources": [{"id": "s1", "title": "Ce que parler veut dire", "year": "1982", "authors": [{"family": "Bourdieu", "given": "Pierre"}]}], "thread": [], "draft": {"title": "", "text": "Introduction."}}


class Projets(OutilsApi, TestCase):
    def test_envoi_lecture_liste(self):
        j = self.inscrire()
        r = self.appel("put", "/api/projets/jabc123", {"nom": "Thèse, chapitre 2", "maj": 1000, "contenu": PROJET}, jeton=j)
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()["references"], 1)
        self.assertEqual(self.appel("get", "/api/projets/jabc123", jeton=j).json()["contenu"], PROJET, "le projet revient à l’identique")
        self.assertEqual([p["nom"] for p in self.appel("get", "/api/projets", jeton=j).json()["projets"]], ["Thèse, chapitre 2"])

    def test_la_version_la_plus_recente_gagne(self):
        j = self.inscrire()
        self.appel("put", "/api/projets/jabc123", {"maj": 2000, "contenu": PROJET}, jeton=j)
        ancien = {**PROJET, "sources": []}
        r = self.appel("put", "/api/projets/jabc123", {"maj": 1500, "contenu": ancien}, jeton=j)
        self.assertEqual(r.status_code, 409, "une version plus ancienne n’écrase pas la plus récente")
        self.assertEqual(r.json()["projet"]["maj"], 2000, "le serveur renvoie sa version plus récente")
        self.assertEqual(self.appel("put", "/api/projets/jabc123", {"maj": 2500, "contenu": ancien}, jeton=j).status_code, 200)

    def test_chacun_ses_projets(self):
        awa = self.inscrire()
        yao = self.inscrire("yao@exemple.ci", "Autre-Mot-De-Passe-2026")
        self.appel("put", "/api/projets/jabc123", {"maj": 1000, "contenu": PROJET}, jeton=awa)
        self.assertEqual(self.appel("get", "/api/projets/jabc123", jeton=yao).status_code, 404, "un autre compte ne voit pas le projet")
        self.assertEqual(self.appel("get", "/api/projets", jeton=yao).json()["projets"], [])
        self.appel("put", "/api/projets/jabc123", {"maj": 9999, "contenu": {"name": "Yao"}}, jeton=yao)
        self.assertEqual(self.appel("get", "/api/projets/jabc123", jeton=awa).json()["contenu"], PROJET, "ni le modifier")

    def test_suppression_gardee_en_trace(self):
        j = self.inscrire()
        self.appel("put", "/api/projets/jabc123", {"maj": 1000, "contenu": PROJET}, jeton=j)
        self.assertEqual(self.appel("delete", "/api/projets/jabc123", {"maj": 3000}, jeton=j).status_code, 200)
        self.assertEqual(self.appel("get", "/api/projets/jabc123", jeton=j).status_code, 404)
        self.assertTrue(self.appel("get", "/api/projets", jeton=j).json()["projets"][0]["supprime"], "les autres appareils apprennent la suppression")
        self.assertEqual(self.appel("put", "/api/projets/jabc123", {"maj": 2000, "contenu": PROJET}, jeton=j).status_code, 409, "un appareil en retard ne fait pas revivre le projet supprimé")

    def test_sans_connexion(self):
        self.assertEqual(self.appel("get", "/api/projets").status_code, 401)
        self.assertEqual(self.appel("put", "/api/projets/x", {"maj": 1, "contenu": {}}).status_code, 401)
