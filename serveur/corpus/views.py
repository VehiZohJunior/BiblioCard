"""Anti-plagiat : l’application envoie de courtes phrases (environ dix mots) de son texte ; le serveur dit, pour
chacune, dans quels documents déposés elle figure mot pour mot. Le texte entier ne quitte jamais l’appareil, et le
serveur ne renvoie jamais le texte des documents déposés : seulement leur titre, auteur, année et établissement."""
from collections import defaultdict

from django.http import JsonResponse

from comptes.api import api, erreur, ip_de, lire_json, limite
from .models import DocumentDepose, Empreinte
from .textes import N_MOTS, empreintes, mots

MAX_SONDES = 80


@api(["POST"])
def sondes(request):
    d = lire_json(request)
    if d is None or not isinstance(d.get("sondes"), list):
        return erreur("requête illisible")
    liste = [str(s)[:400] for s in d["sondes"][:MAX_SONDES]]
    if limite(f"sondes:{ip_de(request)}", 2000, 3600):
        return erreur("trop de contrôles depuis cette connexion, réessaie dans une heure", 429)
    par_sonde = [empreintes(mots(s)) if len(mots(s)) >= N_MOTS else set() for s in liste]
    toutes = set().union(*par_sonde) if par_sonde else set()
    trouve = defaultdict(set)  # empreinte -> documents qui la contiennent
    for h, doc in Empreinte.objects.filter(h__in=toutes, document__actif=True).values_list("h", "document_id"):
        trouve[h].add(doc)
    resultats, ids = [], set()
    for i, hs in enumerate(par_sonde):
        if not hs:
            continue
        docs = set.intersection(*(trouve.get(h, set()) for h in hs))  # la phrase entière, pas un morceau
        if docs:
            resultats.append({"sonde": i, "documents": sorted(docs)})
            ids |= docs
    fiches = {doc.id: {"id": doc.id, "titre": doc.titre, "auteur": doc.auteur, "annee": doc.annee, "type": doc.get_type_display(),
                       "etablissement": str(doc.etablissement) if doc.etablissement else ""}
              for doc in DocumentDepose.objects.filter(id__in=ids).select_related("etablissement")}
    return JsonResponse({"resultats": [{"sonde": r["sonde"], "documents": [fiches[x] for x in r["documents"]]} for r in resultats],
                         "documents_compares": DocumentDepose.objects.filter(actif=True).count()})
