from django.conf import settings
from django.http import HttpResponse


class CorsScientus:
    """Autorise l’application SCIENTUS (et elle seule) à appeler l’API /api/ depuis le navigateur.
    Pas de cookies : l’application s’authentifie par jeton (en-tête Authorization)."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        origine = request.headers.get("Origin", "")
        api = request.path.startswith("/api/")
        if api and request.method == "OPTIONS":
            reponse = HttpResponse(status=204)
        else:
            reponse = self.get_response(request)
        if api and origine in settings.ORIGINES_AUTORISEES:
            reponse["Access-Control-Allow-Origin"] = origine
            reponse["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            reponse["Access-Control-Allow-Headers"] = "Authorization, Content-Type"
            reponse["Access-Control-Max-Age"] = "86400"
            reponse["Vary"] = "Origin"
        return reponse
