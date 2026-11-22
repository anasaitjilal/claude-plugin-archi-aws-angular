# Architecture de référence

## Arborescence d'un projet

```
<projet>/
├── CLAUDE.md                 # règles permanentes (gabarit du plugin)
├── .mcp.json                 # MCP angular-cli (aucun secret)
├── site.config.mjs           # config des scripts : langues, noindex, Function, dossiers partagés
├── prompts/                  # étapes numérotées, exécutées dans l'ordre, un point d'arrêt chacune
├── data/                     # SOURCE : *.json, i18n/<langue>/*.json, images/, videos/, MISSING.md
│   ├── raw/                  # sorties brutes de scraping (non commitées)
│   └── fixtures/             # données de test pour la CI (si les vraies données sont sur S3)
├── scripts/                  # sync-data, validate-data, postbuild, robots, check-seo,
│                             # redirects, build/check-cloudfront-function, deploy-s3.sh…
├── shared/                   # (admin) schéma zod partagé site + scripts + Lambda
├── admin-api/                # (admin) Lambda Node 24, esbuild, Vitest
├── infra/
│   ├── cloudfront/           # viewer-request.js GÉNÉRÉ, événements de test, waf-rate-rule.json
│   ├── github-oidc/          # trust-policy.json, deploy-policy.json, github-oidc.tf
│   ├── data/                 # (admin) bucket de données Terraform
│   └── admin/                # (admin) Cognito, API, Lambda, SSM, bootstrap de l'état
├── .github/workflows/        # ci.yml, deploy.yml, nightly-rebuild.yml (+ admin-api.yml)
└── web/                      # application Angular
    └── src/app/
        ├── core/             # animation/ config/ data/ i18n/ image/ order/ seo/ util/ models/
        ├── shared/           # layout/ (header, footer, tiroir panier) ui/ (boutons, badges…)
        └── features/<feature>/<composant>/   # home, catalog, product, cart, contact, admin…
```

## Angular (v22)

- Standalone, zoneless et OnPush sont **le défaut** : ne pas les déclarer. `@Service()` pour les services.
- État : `signal`, `computed`, `linkedSignal`, `effect` (rare) ; entrées/sorties : `input()`, `output()`, `model()`.
- Données : `httpResource` (URL réactive ; `undefined` = pas de requête → chargement paresseux).
- Templates : `@if`, `@for (… ; track …)`, `@defer (on viewport; hydrate on viewport)`.
- `provideClientHydration(withEventReplay(), withIncrementalHydration(), withI18nSupport())`.
- Images : `NgOptimizedImage` + loader local vers les variantes `-<largeur>.webp`.
- Formulaires : Signal Forms (`@angular/forms/signals`) sinon Reactive Forms.
- Tests : Vitest via `ng test` ; spec obligatoires pour le panier et le générateur de messages.

## Prérendu

`outputMode: "static"`, `server: src/main.server.ts`, **pas** de `ssr.entry` (ni `server.ts`).
`app.routes.server.ts` : `RenderMode.Prerender` partout, `getPrerenderParams` lit les JSON sur disque,
`RenderMode.Client` pour l'admin. Pendant le prérendu, `/data/*.json` est servi depuis le disque par un
intercepteur (token `DATA_FILE_READER` fourni côté serveur seulement) ; le cache de transfert évite
un second chargement à l'hydratation.

## Données fraîches sans rebuild (avec admin)

Bucket de données privé : `draft/catalog.json` (brouillon), `live/catalog.json` (publié, référence),
`history/*` (30 jours). Écritures `PutObject` avec `If-Match: <ETag>` (verrou optimiste → 409).
La publication écrit `data/*.json` et `data/version.json` dans le bucket du site. Le front relit
`data/version.json` **sans cache** après l'hydratation et recharge les fichiers si la version diffère
de celle du build. Le rebuild de nuit ne tourne que si `data/version.json` ≠ `build-data-version.txt`.

## Hébergement

S3 privé + Origin Access Control + CloudFront (forfait **Free** : 0 $, web ACL incluse, 5 règles,
1 M requêtes / 100 Go par mois). Erreurs 403/404 → `/404.html` (code 404). Cache : js/css hashés
1 an `immutable`, documents `no-cache`, images 7 jours (1 an si noms versionnés).
CloudFront Function `viewer-request` générée depuis `redirects.mjs` + `site.config.mjs`.

## CI/CD

PR → `ci.yml` (sans AWS). `main` → `deploy.yml` (OIDC, environnement `production`, un seul job,
caches, contrôle des variables, sync parallèle par langue, invalidation `/*` non attendue).
`concurrency: deploy-production`, `cancel-in-progress: false`.

## Admin (option)

Cognito Essentials (MFA TOTP obligatoire, inscription fermée, PKCE), HTTP API + authorizer JWT,
Lambda Node 24 arm64 avec alias `live`, paramètres SSM SecureString, Terraform lancé à la main.

## Coûts

AWS Budgets (alertes email) + Cost Anomaly Detection (abonnement email, pas SNS). Rapports
CloudFront gratuits. Jamais : métriques additionnelles, journaux temps réel, Lambda@Edge (sort du
forfait Free), Bot Control, API Cost Explorer.
