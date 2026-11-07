from django.contrib import admin

from .models import Jeton


@admin.register(Jeton)
class JetonAdmin(admin.ModelAdmin):
    list_display = ("utilisateur", "appareil", "cree_le", "utilise_le", "expire_le")
    search_fields = ("utilisateur__email", "appareil")
    # l’empreinte ne sert à rien à l’administration : on ne l’affiche pas ; supprimer un jeton déconnecte l’appareil
    exclude = ("empreinte",)
    readonly_fields = ("utilisateur", "appareil", "cree_le", "utilise_le", "expire_le")

    def has_add_permission(self, request):
        return False
