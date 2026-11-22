# Données fraîches : publication sans rebuild

## Stockage

| Objet | Bucket | Écrit par | Lu par |
|---|---|---|---|
| `draft/catalog.json` | données (privé) | Lambda admin | admin |
| `live/catalog.json` | données (privé) | Lambda (publication) | pipeline (`fetch-data`), source de référence |
| `live/publish.json` | données | Lambda | admin (dernier run de déploiement) |
| `history/<horodatage>-publish.json` | données | Lambda | admin, cycle de vie 30 jours |
| `images/products/<slug>/<uuid>-{400,800,1600}.webp` | données | navigateur (POST présigné) | CloudFront (2e origine, comportement `/images/products/*`) |
| `data/*.json`, `data/version.json` | **site** | Lambda (publication) | navigateurs |
| `build-data-version.txt` | site | `deploy.yml` | rebuild de nuit |

Un catalogue = **un seul objet JSON** par état : l'écriture est atomique.

## Verrou optimiste

```
GET  draft/catalog.json                → ETag E1 (renvoyé au navigateur comme « version »)
PUT  draft/catalog.json  If-Match: E1  → 200 (ETag E2)   |   412 → 409 STALE_VERSION côté API
```

Le navigateur renvoie la version lue ; un conflit affiche « modifié par quelqu'un d'autre, recharger ».
Jamais d'écriture sans condition (sauf migration, avec `--force` explicite).

## Publication

1. lire `draft` (ETag ≠ version reçue → 409) ; 2. valider avec le schéma partagé ; 3. écrire `live`
avec `If-Match` ; 4. découper en `data/*.json` dans le bucket du site + `data/version.json` ;
5. journal `history/` ; 6. (option) `workflow_dispatch` de `deploy.yml` pour les nouvelles pages
(nouveau slug = nouvelle page prérendue), sinon le rebuild de nuit s'en charge.

## Front

```ts
afterNextRender(async () => {
  const r = await fetch('/data/version.json', { cache: 'no-store' });
  if (r.ok) published.set((await r.json()).version);
});
const fresh = computed(() => (published() && published() !== builtVersion() ? published() : null));
const freshProducts = httpResource<Product[]>(() =>
  fresh() ? { url: '/data/products.json', params: { v: fresh()! }, cache: 'no-cache', transferCache: false } : undefined);
const products = computed(() => (freshProducts.hasValue() ? freshProducts.value() : built.value()));
```

Produit présent au build mais retiré depuis : afficher « Ce produit n'est plus disponible » avec un lien
vers sa catégorie (la page prérendue existe encore jusqu'au prochain build).

## Coût

Quelques milliers de requêtes S3 par mois : centimes. Sans versioning sur le bucket de données
(une version par publication = milliers d'objets) ; l'historique utile est `history/` sur 30 jours.
