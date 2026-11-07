from django.contrib import admin, messages

from .models import DocumentDepose, Etablissement


@admin.register(Etablissement)
class EtablissementAdmin(admin.ModelAdmin):
    list_display = ("nom", "sigle", "ville", "pays")
    search_fields = ("nom", "sigle", "ville")


@admin.register(DocumentDepose)
class DocumentDeposeAdmin(admin.ModelAdmin):
    list_display = ("titre", "auteur", "annee", "type", "etablissement", "nb_mots", "actif", "depose_le")
    list_filter = ("type", "actif", "etablissement", "annee")
    search_fields = ("titre", "auteur")
    readonly_fields = ("nb_mots", "depose_le", "depose_par")
    actions = ["reindexer"]

    def save_model(self, request, obj, form, change):
        if not obj.depose_par_id:
            obj.depose_par = request.user
        super().save_model(request, obj, form, change)
        if "fichier" in form.changed_data or not obj.nb_mots:
            try:
                n = obj.indexer()
                self.message_user(request, f"{n} mots lus : le document est comparé par l’anti-plagiat.", messages.SUCCESS)
            except Exception as e:  # fichier abîmé, PDF scanné sans texte…
                self.message_user(request, f"Le fichier n’a pas pu être lu : {e}", messages.ERROR)

    @admin.action(description="Relire les fichiers et recalculer les empreintes")
    def reindexer(self, request, queryset):
        for doc in queryset:
            doc.indexer()
        self.message_user(request, f"{queryset.count()} document(s) relu(s).", messages.SUCCESS)
