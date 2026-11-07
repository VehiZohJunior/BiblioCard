"""Comptes SCIENTUS : inscription, connexion, déconnexion, profil, suppression du compte (droit à l’effacement)."""
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.http import JsonResponse

from .api import api, erreur, ip_de, lire_json, limite
from .models import Jeton

Utilisateur = get_user_model()


def profil(u):
    return {"email": u.email, "nom": u.first_name}


@api(["POST"])
def inscription(request):
    d = lire_json(request)
    if d is None:
        return erreur("requête illisible")
    if limite(f"inscription:{ip_de(request)}", 10, 3600):
        return erreur("trop de créations de compte depuis cette connexion, réessaie dans une heure", 429)
    email = str(d.get("email", "")).strip().lower()
    mdp = str(d.get("mot_de_passe", ""))
    nom = str(d.get("nom", "")).strip()[:150]
    try:
        validate_email(email)
    except ValidationError:
        return erreur("adresse e-mail invalide")
    if Utilisateur.objects.filter(username=email).exists():
        return erreur("un compte existe déjà avec cette adresse", 409)
    u = Utilisateur(username=email, email=email, first_name=nom)
    try:
        validate_password(mdp, u)
    except ValidationError as e:
        return erreur("mot de passe trop faible", details=list(e.messages))
    u.set_password(mdp)
    u.save()
    jeton = Jeton.creer(u, str(d.get("appareil", "")))
    return JsonResponse({"jeton": jeton, "compte": profil(u)}, status=201)


@api(["POST"])
def connexion(request):
    d = lire_json(request)
    if d is None:
        return erreur("requête illisible")
    email = str(d.get("email", "")).strip().lower()
    # 10 essais par quart d’heure, par adresse et par connexion : contre les essais de mots de passe en série
    if limite(f"connexion:{email}", 10, 900) or limite(f"connexion-ip:{ip_de(request)}", 30, 900):
        return erreur("trop d’essais, réessaie dans un quart d’heure", 429)
    u = authenticate(request, username=email, password=str(d.get("mot_de_passe", "")))
    if not u:
        return erreur("adresse ou mot de passe incorrect", 401)
    return JsonResponse({"jeton": Jeton.creer(u, str(d.get("appareil", ""))), "compte": profil(u)})


@api(["POST"], connecte=True)
def deconnexion(request):
    request.jeton.delete()
    return JsonResponse({"ok": True})


@api(["GET", "DELETE"], connecte=True)
def moi(request):
    u = request.utilisateur
    if request.method == "GET":
        return JsonResponse({"compte": profil(u)})
    # suppression du compte et de tous ses projets sauvegardés, après confirmation du mot de passe
    d = lire_json(request) or {}
    if not u.check_password(str(d.get("mot_de_passe", ""))):
        return erreur("mot de passe incorrect", 403)
    u.delete()
    return JsonResponse({"ok": True})
