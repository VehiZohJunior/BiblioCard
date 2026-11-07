"""Sauvegarde en ligne des projets : liste, lecture, envoi, suppression. Chaque utilisateur ne voit que les siens.

Règle de synchronisation : la version la plus récente gagne. L’application envoie l’heure de modification de son
projet (« maj ») ; si le serveur a une version plus récente, l’envoi est refusé (409) et le serveur renvoie sa
version, pour que l’application la reprenne au lieu de l’écraser."""
from django.http import JsonResponse

from comptes.api import api, erreur, lire_json
from .models import Projet

TAILLE_MAX = 15 * 1024 * 1024  # un projet de 500 références avec son fil tient très largement


def resume(p):
    return {"pid": p.pid, "nom": p.nom, "maj": p.maj, "supprime": p.supprime, "references": p.nb_references()}


@api(["GET"], connecte=True)
def liste(request):
    return JsonResponse({"projets": [resume(p) for p in request.utilisateur.projets.all()]})


@api(["GET", "PUT", "DELETE"], connecte=True)
def projet(request, pid):
    p = request.utilisateur.projets.filter(pid=pid).first()
    if request.method == "GET":
        if not p or p.supprime:
            return erreur("projet introuvable", 404)
        return JsonResponse({**resume(p), "contenu": p.contenu})
    if request.method == "DELETE":
        if p:
            # on garde la trace de la suppression : un autre appareil ne renverra pas le projet supprimé
            p.supprime, p.contenu, p.maj = True, {}, max(p.maj, int((lire_json(request) or {}).get("maj") or p.maj))
            p.save()
        return JsonResponse({"ok": True})
    if len(request.body) > TAILLE_MAX:
        return erreur("projet trop volumineux", 413)
    d = lire_json(request)
    if d is None or not isinstance(d.get("contenu"), dict):
        return erreur("requête illisible")
    try:
        maj = int(d.get("maj"))
    except (TypeError, ValueError):
        return erreur("heure de modification manquante")
    nom = str(d.get("nom") or d["contenu"].get("name") or "Projet").strip()[:200]
    if p and p.maj > maj:
        return erreur("une version plus récente est sur le serveur", 409, projet={**resume(p), "contenu": p.contenu})
    if p:
        p.nom, p.contenu, p.maj, p.supprime = nom, d["contenu"], maj, False
        p.save()
    else:
        p = Projet.objects.create(utilisateur=request.utilisateur, pid=pid[:40], nom=nom, contenu=d["contenu"], maj=maj)
    return JsonResponse(resume(p))
