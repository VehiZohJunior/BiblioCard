import shutil
import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings

from comptes.tests import OutilsApi
from .models import DocumentDepose, Etablissement
from .textes import corps_sans_bibliographie, mots, normaliser

MEMOIRE = """Introduction
Les journaux ivoiriens ont largement contribué à la polarisation du débat public pendant la crise politique.
La presse partisane a durci les clivages identitaires dans les grandes villes du pays.
Conclusion
Ces résultats confirment notre hypothèse de départ sur le rôle de la presse.
BIBLIOGRAPHIE
BOURDIEU Pierre, 1982, Ce que parler veut dire. L’économie des échanges linguistiques, Paris, Fayard.
"""
MEDIA = tempfile.mkdtemp()


@override_settings(MEDIA_ROOT=MEDIA)
class Corpus(OutilsApi, TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA, ignore_errors=True)

    def deposer(self, texte=MEMOIRE, nom="memoire.txt", actif=True, contenu=None):
        u = Etablissement.objects.get_or_create(nom="Université Félix Houphouët-Boigny", sigle="UFHB", ville="Abidjan")[0]
        d = DocumentDepose.objects.create(etablissement=u, titre="La presse ivoirienne et la crise", auteur="A. Koffi", annee=2019,
                                          fichier=SimpleUploadedFile(nom, contenu if contenu is not None else texte.encode("utf-8")), actif=actif)
        d.indexer()
        return d

    def test_normalisation_identique_a_l_application(self):
        # js/moteur.js : norm(« L’Économie, des Échanges ») === « l economie des echanges »
        self.assertEqual(normaliser("L’Économie, des Échanges — œuvre"), "l economie des echanges oeuvre")

    def test_bibliographie_non_indexee(self):
        d = self.deposer()
        self.assertNotIn("BOURDIEU", d.texte)
        self.assertEqual(d.nb_mots, len(mots(corps_sans_bibliographie(MEMOIRE))))

    def test_phrase_copiee_retrouvee(self):
        self.deposer()
        r = self.appel("post", "/api/corpus/sondes", {"sondes": [
            "ont largement contribué à la polarisation du débat public pendant",   # copiée (10 mots)
            "la presse a joué un rôle important dans la vie du pays",             # pas copiée
            "Ce que parler veut dire. L’économie des échanges linguistiques, Paris", # dans la bibliographie seulement
            "trop court"]})
        self.assertEqual(r.status_code, 200, r.content)
        res = r.json()["resultats"]
        self.assertEqual([x["sonde"] for x in res], [0], "seule la phrase copiée du corps du texte est retrouvée")
        doc = res[0]["documents"][0]
        self.assertEqual((doc["titre"], doc["auteur"], doc["annee"], doc["etablissement"]), ("La presse ivoirienne et la crise", "A. Koffi", 2019, "Université Félix Houphouët-Boigny (UFHB)"))
        self.assertNotIn("texte", doc, "jamais le texte du document déposé")
        self.assertEqual(r.json()["documents_compares"], 1)

    def test_accents_et_ponctuation_ignores(self):
        self.deposer()
        r = self.appel("post", "/api/corpus/sondes", {"sondes": ["ONT LARGEMENT CONTRIBUE, a la polarisation du debat public pendant"]})
        self.assertEqual(len(r.json()["resultats"]), 1)

    def test_morceaux_disperses_ne_suffisent_pas(self):
        self.deposer()
        # deux moitiés de phrases différentes du document, recollées : ce n’est pas une phrase du document
        r = self.appel("post", "/api/corpus/sondes", {"sondes": ["les journaux ivoiriens ont largement contribué les clivages identitaires dans les grandes villes"]})
        self.assertEqual(r.json()["resultats"], [])

    def test_document_retire_non_compare(self):
        self.deposer(actif=False)
        r = self.appel("post", "/api/corpus/sondes", {"sondes": ["ont largement contribué à la polarisation du débat public pendant"]})
        self.assertEqual(r.json()["resultats"], [])

    def test_lecture_word(self):
        import io
        from docx import Document
        f = io.BytesIO(); doc = Document()
        for ligne in MEMOIRE.splitlines():
            doc.add_paragraph(ligne)
        doc.save(f)
        d = self.deposer(nom="memoire.docx", contenu=f.getvalue())
        self.assertIn("polarisation du débat public", d.texte)
        self.assertNotIn("BOURDIEU", d.texte)

    def test_requete_illisible(self):
        self.assertEqual(self.appel("post", "/api/corpus/sondes", {"pas": "de sondes"}).status_code, 400)
