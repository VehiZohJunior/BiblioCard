from django.conf import settings
from django.db import models


class Projet(models.Model):
    """Copie en ligne d’un projet SCIENTUS (références, norme, fil, brouillon, plan…), telle que l’application
    l’enregistre sur l’appareil. « maj » est l’heure de dernière modification sur l’appareil (millisecondes) :
    c’est elle qui départage deux versions du même projet."""
    utilisateur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="projets")
    pid = models.CharField("identifiant dans l’application", max_length=40)
    nom = models.CharField(max_length=200)
    contenu = models.JSONField()
    maj = models.BigIntegerField("modifié sur l’appareil (ms)")
    recu_le = models.DateTimeField("reçu le", auto_now=True)
    supprime = models.BooleanField(default=False)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["utilisateur", "pid"], name="un_projet_par_pid")]
        ordering = ["-maj"]

    def __str__(self):
        return f"{self.nom} ({self.utilisateur})"

    def nb_references(self):
        return len((self.contenu or {}).get("sources") or [])
    nb_references.short_description = "références"
