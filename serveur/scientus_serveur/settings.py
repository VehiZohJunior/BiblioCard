"""
Serveur SCIENTUS (Django 6.1) : le complément en ligne de l’application de navigateur.

L’application SCIENTUS reste une application de navigateur, hors ligne d’abord : les documents sont lus sur
l’appareil. Ce serveur ne sert qu’à ce qu’un navigateur ne peut pas faire seul :
  - comptes (adresse e-mail et mot de passe) ;
  - sauvegarde en ligne des projets, pour les retrouver sur un autre appareil ou après un navigateur vidé ;
  - base des mémoires et thèses déposés par les établissements, que le test anti-plagiat interroge
    par phrases de dix mots, comme il interroge HAL ;
  - administration WayDayZ (/admin/).

Réglages sensibles : jamais dans le code (il est public sur GitHub). Ils viennent de l’environnement :
  SCIENTUS_SECRET_KEY   clé secrète de Django (obligatoire en production)
  SCIENTUS_DEBUG        « 1 » sur le PC de développement seulement
  SCIENTUS_HOSTS        noms d’hôte autorisés, séparés par des virgules (ex. wayday.pythonanywhere.com)
  SCIENTUS_ORIGINES     adresses de l’application autorisées à appeler l’API (CORS)
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

DEBUG = os.environ.get("SCIENTUS_DEBUG") == "1"
SECRET_KEY = os.environ.get("SCIENTUS_SECRET_KEY") or ("dev-seulement-jamais-en-production" if DEBUG else None)
if not SECRET_KEY:
    raise RuntimeError("SCIENTUS_SECRET_KEY manque : la définir dans l’environnement du serveur.")

ALLOWED_HOSTS = [h.strip() for h in os.environ.get("SCIENTUS_HOSTS", "localhost,127.0.0.1").split(",") if h.strip()]
# l’application SCIENTUS (GitHub Pages) et sa version de développement
ORIGINES_AUTORISEES = [o.strip() for o in os.environ.get("SCIENTUS_ORIGINES", "https://vehizohjunior.github.io,http://localhost:5240").split(",") if o.strip()]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "comptes",
    "projets",
    "corpus",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "comptes.middleware.CorsScientus",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "scientus_serveur.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "scientus_serveur.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "fr"
TIME_ZONE = "Africa/Abidjan"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_ROOT = BASE_DIR / "media"
MEDIA_URL = "media/"

# taille maximale d’une requête : une sauvegarde de projet de 500 références, une thèse déposée
DATA_UPLOAD_MAX_MEMORY_SIZE = 20 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 20 * 1024 * 1024

# durée de validité d’un jeton de connexion de l’application (jours)
JETON_DUREE_JOURS = 90

# production : tout en HTTPS
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = os.environ.get("SCIENTUS_SSL_REDIRECT", "1") == "1"
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 60 * 60 * 24 * 30
    SECURE_CONTENT_TYPE_NOSNIFF = True

# aucun e-mail n’est envoyé par ce serveur (pas de réglage d’envoi)

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
