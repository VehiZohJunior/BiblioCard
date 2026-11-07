from django.conf import settings
from django.db import models, transaction

from .textes import corps_sans_bibliographie, empreintes, extraire, mots


class Etablissement(models.Model):
    nom = models.CharField(max_length=200, unique=True)
    sigle = models.CharField(max_length=30, blank=True)
    ville = models.CharField(max_length=100, blank=True)
    pays = models.CharField(max_length=100, default="Côte d’Ivoire")

    class Meta:
        verbose_name = "établissement"
        ordering = ["nom"]

    def __str__(self):
        return f"{self.nom} ({self.sigle})" if self.sigle else self.nom


class DocumentDepose(models.Model):
    """Mémoire, thèse ou article déposé par un établissement pour que le test anti-plagiat le compare.
    Son texte reste sur le serveur : l’API ne renvoie jamais que son titre, son auteur, son année et son établissement."""
    TYPES = [("memoire", "Mémoire de master"), ("these", "Thèse de doctorat"), ("article", "Article"), ("rapport", "Rapport"), ("autre", "Autre")]
    etablissement = models.ForeignKey(Etablissement, on_delete=models.PROTECT, related_name="documents", null=True, blank=True)
    titre = models.CharField(max_length=400)
    auteur = models.CharField(max_length=200)
    annee = models.PositiveSmallIntegerField("année", null=True, blank=True)
    type = models.CharField(max_length=20, choices=TYPES, default="memoire")
    fichier = models.FileField(upload_to="depots/%Y/", help_text="Word (.docx), PDF ou texte")
    texte = models.TextField(blank=True, editable=False)
    nb_mots = models.PositiveIntegerField("mots comparés", default=0, editable=False)
    actif = models.BooleanField("comparé par l’anti-plagiat", default=True)
    depose_le = models.DateTimeField("déposé le", auto_now_add=True)
    depose_par = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, editable=False)

    class Meta:
        verbose_name = "document déposé"
        verbose_name_plural = "documents déposés"
        ordering = ["-depose_le"]

    def __str__(self):
        return f"{self.auteur}, {self.annee or 's.d.'}, {self.titre}"

    def indexer(self):
        """Lit le fichier, garde le corps du texte (sans la bibliographie) et calcule ses empreintes."""
        self.fichier.open("rb")
        try:
            brut = extraire(self.fichier.name, self.fichier.read())
        finally:
            self.fichier.close()
        self.texte = corps_sans_bibliographie(brut)
        liste = mots(self.texte)
        self.nb_mots = len(liste)
        with transaction.atomic():
            self.save(update_fields=["texte", "nb_mots"])
            self.empreintes.all().delete()
            Empreinte.objects.bulk_create([Empreinte(document=self, h=h) for h in empreintes(liste)], batch_size=5000)
        return self.nb_mots


class Empreinte(models.Model):
    document = models.ForeignKey(DocumentDepose, on_delete=models.CASCADE, related_name="empreintes")
    h = models.BigIntegerField(db_index=True)

    class Meta:
        indexes = [models.Index(fields=["h", "document"])]
