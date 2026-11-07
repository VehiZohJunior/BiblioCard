from django.contrib import admin

from .models import Projet


@admin.register(Projet)
class ProjetAdmin(admin.ModelAdmin):
    list_display = ("nom", "utilisateur", "nb_references", "recu_le", "supprime")
    list_filter = ("supprime",)
    search_fields = ("nom", "utilisateur__email")
    # le contenu d’un projet appartient à son auteur : l’administration le voit sans pouvoir le modifier
    readonly_fields = ("utilisateur", "pid", "nom", "contenu", "maj", "recu_le", "supprime")

    def has_add_permission(self, request):
        return False
