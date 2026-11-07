#!/bin/bash
# Installation (ou mise à jour) du serveur SCIENTUS sur PythonAnywhere, compte gratuit.
# À lancer dans une console « Bash » de PythonAnywhere :
#     bash ~/BiblioCard/serveur/installer-pythonanywhere.sh
# Le script : récupère la dernière version du dépôt, prépare l’environnement Python, crée la clé secrète
# (une seule fois, dans un fichier privé du compte, jamais sur GitHub), met la base à jour, prépare les
# fichiers de l’administration, puis affiche les réglages exacts à recopier dans l’onglet « Web ».
set -e
DEPOT="$HOME/BiblioCard"
SERVEUR="$DEPOT/serveur"
ENV="$HOME/.virtualenvs/scientus"
UTILISATEUR="$(basename "$HOME")"

echo "== 1. Dernière version de SCIENTUS"
git -C "$DEPOT" pull --ff-only

echo "== 2. Environnement Python (Django 6.1)"
if [ ! -x "$ENV/bin/python" ]; then
  PY="$(command -v python3.13 || command -v python3.12)"
  [ -z "$PY" ] && { echo "Python 3.12 ou 3.13 introuvable sur ce compte."; exit 1; }
  "$PY" -m venv "$ENV"
fi
"$ENV/bin/pip" install -q -r "$SERVEUR/requirements.txt"

echo "== 3. Clé secrète (créée une seule fois, gardée dans ~/.scientus-secret)"
if [ ! -s "$HOME/.scientus-secret" ]; then
  "$ENV/bin/python" -c "import secrets; print(secrets.token_urlsafe(50))" > "$HOME/.scientus-secret"
  chmod 600 "$HOME/.scientus-secret"
fi

echo "== 4. Base de données et fichiers de l’administration"
cd "$SERVEUR"
export SCIENTUS_SECRET_KEY="$(cat "$HOME/.scientus-secret")"
export SCIENTUS_HOSTS="$UTILISATEUR.pythonanywhere.com,$UTILISATEUR.eu.pythonanywhere.com"
"$ENV/bin/python" manage.py migrate --noinput
"$ENV/bin/python" manage.py collectstatic --noinput -v 0
"$ENV/bin/python" manage.py check --deploy --fail-level ERROR

cat <<FIN

== Terminé. Réglages à recopier dans l’onglet « Web » de PythonAnywhere :

   Virtualenv          : $ENV
   Fichier WSGI        : remplace tout son contenu par cette seule ligne
                         exec(open("$SERVEUR/pythonanywhere_wsgi.py").read())
   Static files        : URL  /static/
                         Directory  $SERVEUR/staticfiles

Puis clique sur le bouton vert « Reload ».
Adresse du serveur : https://$UTILISATEUR.pythonanywhere.com
FIN
