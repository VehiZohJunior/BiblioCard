"""Adresses du serveur SCIENTUS : l’administration WayDayZ (/admin/) et l’API de l’application (/api/)."""
from django.contrib import admin
from django.http import JsonResponse
from django.urls import path

from comptes import views as comptes
from corpus import views as corpus
from projets import views as projets

admin.site.site_header = "SCIENTUS : administration WayDayZ"
admin.site.site_title = "SCIENTUS"
admin.site.index_title = "Comptes, projets sauvegardés et documents déposés"


def etat(request):
    return JsonResponse({"service": "SCIENTUS", "api": 1})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/etat", etat),
    path("api/comptes/inscription", comptes.inscription),
    path("api/comptes/connexion", comptes.connexion),
    path("api/comptes/deconnexion", comptes.deconnexion),
    path("api/comptes/moi", comptes.moi),
    path("api/projets", projets.liste),
    path("api/projets/<str:pid>", projets.projet),
    path("api/corpus/sondes", corpus.sondes),
]
