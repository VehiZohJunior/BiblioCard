"""Outils communs de l’API : lecture du JSON, réponses, authentification par jeton, limite de fréquence."""
import json
from functools import wraps

from django.core.cache import cache
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .models import Jeton


def erreur(message, statut=400, **extra):
    return JsonResponse({"erreur": message, **extra}, status=statut)


def lire_json(request):
    try:
        donnees = json.loads(request.body or b"{}")
    except (ValueError, UnicodeDecodeError):
        return None
    return donnees if isinstance(donnees, dict) else None


def ip_de(request):
    return (request.headers.get("X-Forwarded-For", "").split(",")[0].strip() or request.META.get("REMOTE_ADDR", ""))


def limite(cle, maximum, secondes):
    """Vrai si la limite est dépassée (compteur dans le cache, remis à zéro après la période)."""
    n = cache.get(cle, 0)
    if n >= maximum:
        return True
    cache.set(cle, n + 1, secondes)
    return False


def api(methodes, connecte=False):
    """Vue d’API : méthodes acceptées, JSON, et jeton obligatoire si connecte=True (request.jeton, request.utilisateur)."""
    def deco(vue):
        @csrf_exempt  # pas de cookie de session : l’authentification se fait par jeton, la protection CSRF est sans objet
        @wraps(vue)
        def enveloppe(request, *args, **kwargs):
            if request.method not in methodes:
                return erreur("méthode non autorisée", 405)
            request.jeton = request.utilisateur = None
            entete = request.headers.get("Authorization", "")
            if entete.startswith("Bearer "):
                request.jeton = Jeton.verifier(entete[7:].strip())
                request.utilisateur = request.jeton.utilisateur if request.jeton else None
            if connecte and not request.utilisateur:
                return erreur("connexion requise", 401)
            return vue(request, *args, **kwargs)
        return enveloppe
    return deco
