"""Lecture des documents déposés et empreintes de comparaison.

La normalisation est EXACTEMENT celle de l’application (js/moteur.js, norm) : minuscules, sans accents ni
ponctuation. Une empreinte est une suite de 8 mots (comme les « séquences de 8 mots identiques » du rapport
anti-plagiat). Une phrase sondée de 10 mots donne 3 empreintes : le document la contient si les 3 y sont."""
import hashlib
import io
import re
import unicodedata

N_MOTS = 8
SPECIAUX = str.maketrans({"ı": "i", "ł": "l", "ø": "o", "æ": "ae", "œ": "oe"})
# titre de la bibliographie, seul sur sa ligne : ce qui suit n’est pas comparé
TITRE_BIBLIO = re.compile(r"^[ \t]*(?:[IVX\d]+[.)-]?\s*)?(?:r[ée]f[ée]rences bibliographiques|r[ée]f[ée]rences|bibliograp{1,2}h{1,2}ie[^\n]{0,30}|sources et bibliographie|ouvrages cit[ée]s|works cited|references|bibliograp{1,2}h{1,2}y)[ \t]*:?[ \t]*$", re.I | re.M)


def normaliser(texte):
    t = unicodedata.normalize("NFD", str(texte).translate(SPECIAUX))
    t = "".join(c for c in t if not unicodedata.combining(c)).lower()
    return re.sub(r"[^a-z0-9]+", " ", t).strip()


def mots(texte):
    return normaliser(texte).split()


def hacher(suite):
    """Entier signé de 64 bits (place d’un BigIntegerField)."""
    return int.from_bytes(hashlib.blake2b(" ".join(suite).encode("utf-8"), digest_size=8).digest(), "big", signed=True)


def empreintes(liste_mots):
    return {hacher(liste_mots[i:i + N_MOTS]) for i in range(len(liste_mots) - N_MOTS + 1)}


def corps_sans_bibliographie(texte):
    """Le corps du document : la bibliographie (dernier titre « Bibliographie », « Références »…) est écartée,
    car deux mémoires citent souvent les mêmes références mot pour mot sans qu’il y ait plagiat."""
    titres = list(TITRE_BIBLIO.finditer(texte))
    return texte[:titres[-1].start()] if titres else texte


def extraire(nom, contenu):
    """Texte d’un fichier déposé : PDF, Word (.docx) ou texte."""
    nom = nom.lower()
    if nom.endswith(".pdf"):
        from pypdf import PdfReader
        return "\n".join((p.extract_text() or "") for p in PdfReader(io.BytesIO(contenu)).pages)
    if nom.endswith(".docx"):
        from docx import Document
        return "\n".join(p.text for p in Document(io.BytesIO(contenu)).paragraphs)
    return contenu.decode("utf-8", errors="replace")
