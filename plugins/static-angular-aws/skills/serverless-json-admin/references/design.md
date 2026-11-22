# Conception de l'admin (référence)

## Routes (toutes derrière l'authorizer JWT, groupe `admins`)

| Route | Rôle |
|---|---|
| `GET /admin/catalog` | brouillon + `version` (ETag) + `pendingChanges` |
| `PUT /admin/products/{id}` | créer / modifier (corps avec `version`) |
| `DELETE /admin/products/{id}` | supprimer |
| `PATCH /admin/products/{id}/status`, `PATCH /admin/products/status` | visible / masqué, unitaire ou groupé |
| `POST /admin/images/upload-url` | URL POST présignée (taille, type, clé `<uuid>`) |
| `POST /admin/products/{id}/images`, `PUT …/images/order` | rattacher, ordonner |
| `POST /admin/import`, `GET /admin/export.csv` | import CSV validé ligne à ligne, export |
| `GET /admin/changes`, `GET /admin/audit` | différences brouillon/publié avec auteurs, journal |
| `POST /admin/publish`, `GET /admin/publish/status` | publication (voir json-catalog-data/references/fresh-data.md) |
| `POST /admin/discard` | brouillon ← publié (`If-Match`) |
| `GET /admin/history`, `POST /admin/history/{key}/restore-draft` | historique 30 jours |

## Écriture type

```
1. GetObject draft/catalog.json (If-None-Match: ETag en cache → 304 rapide)
2. ETag ≠ version reçue → 409 STALE_VERSION
3. appliquer la modification en mémoire, valider (schéma partagé)
4. PutObject draft/catalog.json If-Match: "<version>" → 412 → 409
5. entrée d'audit sous audit/ (qui, quoi, quand)
6. réponse : nouvelle version
```

## SKU auto-incrémenté

Format `<PRÉFIXE>-<n>` (n ≥ 1000, sans zéros de remplissage). Le prochain numéro est stocké dans le catalogue
(`meta.nextSku`) et écrit dans la même opération conditionnelle que le produit : pas de doublon même
avec deux admins, et un numéro n'est jamais réutilisé, même après suppression. Référence non modifiable à la main.

## Front admin

- Lazy (`loadChildren`), `RenderMode.Client`, jamais prérendu, exclu du sitemap, `noindex`.
- `oidc-client-ts` (code + PKCE), jetons en sessionStorage (fermer l'onglet déconnecte), déconnexion Cognito.
- Préchargement des écrans au survol ; vignettes 400 px.
- Messages en français, voix active ; chaque erreur dit quoi faire.

## Performance

Avec un stockage Git (API GitHub), une écriture demandait 13 à 14 appels en série ; le passage à un objet S3
unique avec `If-Match` les remplace par une lecture et une écriture. Mesurer à froid et à chaud
(5 + 5 passes par scénario) avant et après toute optimisation, résultats dans `docs/admin-perf.md`.
