---
name: serverless-json-admin
description: Espace admin serverless quasi gratuit pour qu'un client modifie lui-même le catalogue d'un site statique - Cognito (MFA TOTP obligatoire), API Gateway HTTP + authorizer JWT, Lambda Node arm64 avec alias live, catalogue JSON dans S3 (draft/ live/ history/) avec écritures conditionnelles If-Match, photos par URL présignée, import/export CSV, publication sans rebuild, Terraform lancé à la main. À utiliser pour « admin », « back-office », « le client veut modifier ses produits », « Cognito », « Lambda », « publier le catalogue ».
---

# Admin serverless sur catalogue JSON

À ne construire **que si le client modifie lui-même le catalogue régulièrement** ; sinon PR + déploiement.
Conception détaillée : `references/design.md`. Terraform : `assets/infra/` (placeholders `{{…}}`).

## Composants

| Brique | Choix | Coût |
|---|---|---|
| Authentification | Cognito Essentials, inscription fermée, connexion par email, **MFA TOTP obligatoire**, mot de passe 14 caractères, client public code + PKCE, refresh 12 h, managed login | gratuit < 10 000 MAU |
| API | HTTP API, authorizer JWT Cognito sur **toutes** les routes, CORS limité aux origines du site, throttling 10 req/s (rafale 20) | niveau gratuit |
| Code | Lambda `nodejs24.x` arm64, bundle esbuild, alias `live` (CI : `update-function-code` → `publish-version` → `update-alias`), logs JSON 14 jours | niveau gratuit |
| Secrets | SSM SecureString (clé gérée `aws/ssm`), valeur posée à la main, jamais dans Terraform (`ignore_changes`) | gratuit (standard) |
| Données | bucket privé : `draft/catalog.json`, `live/catalog.json`, `history/` 30 jours, photos `images/` | centimes |
| Front admin | route Angular `/admin/**` en `RenderMode.Client` (lazy), `oidc-client-ts`, langue par défaut seulement | — |
| Infra | Terraform ≥ 1.10, état S3 (`use_lockfile`), `allowed_account_ids`, **jamais exécuté en CI** | gratuit |

## Procédure

1. `assets/infra/admin/bootstrap/` : bucket d'état (une fois, état local).
2. `assets/infra/data/` : bucket de données (+ policy de lecture `live/*` pour le rôle de déploiement).
3. `assets/infra/admin/` : `terraform plan -out admin.tfplan`, relire, `apply` — **par l'utilisateur**.
4. Secrets SSM (`aws ssm put-parameter --type SecureString`), utilisateur Cognito
   (`admin-create-user` + groupe `admins`), variable GitHub du nom de la Lambda.
5. `site.config.mjs` : `adminSpa: true` ; régénérer et republier la CloudFront Function
   (`/admin*` → `/index.csr.html`) ; `noindex` + `Disallow: /admin`.
6. Workflow `admin-api.yml` (typecheck, tests, bundle, publication par alias).

Les variables `github_*` et `draft_branch` de `variables.tf` viennent de la première version (catalogue
stocké dans Git) ; avec le stockage S3 seul, garder uniquement le jeton qui lance `workflow_dispatch`.

## Règles

- Schéma zod **partagé** (`shared/`) entre Lambda, scripts et site : une donnée validée par l'admin passe
  `validate-data`. Même règle des photos des deux côtés (« Visible » impossible sans photo).
- Toute écriture porte la version lue (`If-Match` sur l'ETag) → 409 si quelqu'un a modifié entre-temps.
- Jamais d'écrasement silencieux : annuler le brouillon liste les modifications perdues et leurs auteurs.
- Photos : POST présigné (taille et type limités), conversion WebP côté navigateur en 400/800/1600,
  métadonnées EXIF retirées, nom `<uuid>` (cache long possible).
- Journal d'audit (qui, quoi, quand) ; historique des publications 30 jours avec restauration.
- Aucune ressource payante ajoutée (pas de NAT, pas de VPC, pas de KMS dédié, pas de WAF sur l'API).

## Pièges déjà rencontrés

- **Push forcé sur la branche de brouillon** (ancienne version Git de l'admin) : modifications du
  client perdues. Avancer en fast-forward seulement (`force=false`), sinon refuser et recharger. Le stockage
  S3 avec `If-Match` a remplacé Git : une lecture et une écriture au lieu de 13 appels en série.
- Versioning activé sur le bucket de données : des milliers de versions par jour (une par
  enregistrement) ; préférer `history/` explicite avec cycle de vie.
- Démarrage à froid perçu par le client : préchauffage EventBridge `rate(5 minutes)` facultatif
  (`warmup_enabled`), mémoire 1024 Mo (arm64 rapide et souvent moins cher au total).
- Préfixe de domaine Cognito déjà pris : relancer avec `-var cognito_domain_prefix=<projet>-admin-<suffixe>`.
- Retour arrière de la Lambda : une version publiée garde ses variables d'environnement ; ne pas
  supprimer un paramètre SSM qu'une ancienne version utilise encore.
- Migration de données en production : mode maintenance (lecture seule) d'abord, bascule le même jour,
  procédure de retour arrière écrite **avant**.
