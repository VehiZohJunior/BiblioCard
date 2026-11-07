import hashlib
import secrets
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone


def empreinte_jeton(brut):
    return hashlib.sha256(brut.encode("utf-8")).hexdigest()


class Jeton(models.Model):
    """Jeton de connexion de l’application SCIENTUS. Seule son empreinte est gardée : un jeton volé dans la base
    ne permet pas de se connecter. Le jeton lui-même n’est remis qu’une fois, à la connexion."""
    utilisateur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="jetons")
    empreinte = models.CharField(max_length=64, unique=True)
    appareil = models.CharField(max_length=120, blank=True)
    cree_le = models.DateTimeField(auto_now_add=True)
    expire_le = models.DateTimeField()
    utilise_le = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "jeton de connexion"
        verbose_name_plural = "jetons de connexion"

    @classmethod
    def creer(cls, utilisateur, appareil=""):
        brut = secrets.token_urlsafe(32)
        cls.objects.create(utilisateur=utilisateur, empreinte=empreinte_jeton(brut), appareil=appareil[:120],
                           expire_le=timezone.now() + timedelta(days=settings.JETON_DUREE_JOURS))
        return brut

    @classmethod
    def verifier(cls, brut):
        if not brut:
            return None
        j = cls.objects.select_related("utilisateur").filter(empreinte=empreinte_jeton(brut), expire_le__gt=timezone.now()).first()
        if not j or not j.utilisateur.is_active:
            return None
        j.utilise_le = timezone.now()
        j.save(update_fields=["utilise_le"])
        return j

    def __str__(self):
        return f"{self.utilisateur} ({self.appareil or 'appareil inconnu'})"
