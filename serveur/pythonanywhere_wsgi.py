# Point d’entrée du serveur SCIENTUS sur PythonAnywhere.
# Le fichier WSGI de PythonAnywhere (onglet « Web ») ne contient qu’une ligne qui exécute celui-ci :
#     exec(open("/home/<utilisateur>/BiblioCard/serveur/pythonanywhere_wsgi.py").read())
# La clé secrète est lue dans ~/.scientus-secret (créée par installer-pythonanywhere.sh), jamais dans le dépôt.
import os
import sys
from pathlib import Path

_maison = Path.home()
_serveur = _maison / "BiblioCard" / "serveur"
if str(_serveur) not in sys.path:
    sys.path.insert(0, str(_serveur))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "scientus_serveur.settings")
os.environ["SCIENTUS_SECRET_KEY"] = (_maison / ".scientus-secret").read_text().strip()
os.environ["SCIENTUS_HOSTS"] = f"{_maison.name}.pythonanywhere.com,{_maison.name}.eu.pythonanywhere.com"

from django.core.wsgi import get_wsgi_application  # noqa: E402

application = get_wsgi_application()
