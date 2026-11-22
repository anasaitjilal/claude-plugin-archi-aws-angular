# Extraction de l'architecture ANSA FOOD

Source : repo `anasaitjilal/ansa_food`, branche `main` (commit `a7a4fad`) et branche
`feat/accueil-perf-seo` (SEO/perf, non fusionnée), lus le 2026-11-22.
But : séparer ce qui est **générique** (va dans le plugin `static-angular-aws`) de ce qui est
**spécifique ANSA FOOD** (reste dans le projet).

Légende : ✅ confirmé dans le code · ⚠️ écart avec le résumé du prompt · ❓ absent du repo (connu
seulement par le prompt, à traiter comme « procédure non éprouvée »).

## 1. Tableau corrigé

| Brique | Réalité dans le code | Statut |
|---|---|---|
| Front | Angular **22.2**, standalone par défaut, zoneless et OnPush **par défaut** (ne plus les déclarer), `@Service()` à la place de `@Injectable({providedIn:'root'})`, signals partout, `httpResource`, `@defer`, `provideClientHydration(withEventReplay(), withIncrementalHydration(), withI18nSupport())`, `withViewTransitions` (sautée si seuls les query params changent), `withComponentInputBinding`. TypeScript 6, Vitest, angular-eslint, Prettier. | ✅ |
| Prérendu | `outputMode: static` ; `app.routes.server.ts` : `RenderMode.Prerender` + `getPrerenderParams` qui lit les JSON **sur disque** ; `RenderMode.Client` pour `/admin/**` (→ `index.csr.html`). Un `HttpInterceptor` sert `/data/*.json` depuis le disque pendant le prérendu (token `DATA_FILE_READER` fourni seulement côté serveur), le cache de transfert évite le double chargement à l'hydratation. | ✅ |
| i18n | `@angular/localize` compilé (un build par langue), FR à la racine, EN sous `/en/`, mêmes slugs. Données traduites en surcharge (`data/i18n/en/*.json` fusionnées par id/slug, champ absent = français). `npm run i18n` (extract + merge), `i18n:check`, `check:en` (aucun mot français sur les pages EN). hreflang `fr`/`en`/`x-default`. | ✅ |
| Données | `data/*.json` copiés dans `public/data/` au `prebuild` (`sync-data.mjs`, images converties en WebP 320/640/960/1440 avec manifeste SHA-1). Schéma partagé **zod** (`shared/catalog-schema.ts`) utilisé par le site, les scripts et la Lambda. `validate-data.mjs` (schéma + fichiers + règle des photos). Liste blanche des données publiques (`shared/public-data.ts`, `check:public`). | ✅ |
| Données fraîches | Bucket privé : `draft/catalog.json` (admin), `live/catalog.json` (publié, source de référence), `history/*` 30 jours. Écritures conditionnelles `If-Match` (verrou optimiste, 409 `STALE_VERSION`). La Lambda publie directement `data/*` dans le bucket du site ; le front relit `data/version.json` sans cache après l'hydratation et recharge si la version a changé. Rebuild de nuit **seulement si** `data/version.json` ≠ `build-data-version.txt`. | ✅ |
| Hébergement | S3 privé + OAC + CloudFront ; 403/404 → `/404.html` (code 404). `deploy-s3.sh` en 4 passes : js/css `max-age=31536000,immutable` (`--size-only`), documents `no-cache` (envoi seulement si MD5 ≠ ETag), webp et reste `max-age=604800`. FR et EN synchronisés en parallèle, `data/*` jamais touché par la sync. | ✅ (⚠️ images à 7 jours, pas 1 an, sur `main`) |
| CloudFront Function | Générée par `build-cloudfront-function.mjs` depuis `redirects.mjs` (`REDIRECTS`, `CATEGORY_RENAMES`, `PRODUCT_RENAMES`) : 0) 403 User-Agent vide ou bloqué, liste autorisée prioritaire ; anti-hotlinking `/images/products/*` (Referer : sites autorisés + moteurs de recherche, pas de Referer = autorisé) ; `/en/admin*` → 301 `/admin*` ; `/admin*` → `/index.csr.html` ; 301 avec **query string recopiée sans réencodage** (`%20` ne devient pas `%2520`) ; pas de redirection en chaîne ; `/en` → `/en/` ; ajout de `index.html`. Taille ≈ 8 Ko (limite 10 Ko). Événements de test JSON + tests Vitest. Drapeau `REDIRECT_CLOUDFRONT_DOMAIN` (désactivé) sur la branche SEO. | ✅ |
| WAF | Forfait CloudFront **Free** (0 $, web ACL incluse, 5 règles max, 1 M requêtes / 100 Go par mois). Règle `limite-par-ip` 2 000 / 5 min, d'abord en Count puis en Block. | ⚠️ `docs/anti-scraping.md` et la mémoire projet indiquent un **scope-down configuré** (`/data/`, `/produit/`, `/en/produit/`, `/images/products/`), alors que le prompt dit « pas de scope-down (refusé par le forfait gratuit) ». À trancher. |
| Robots | `robots.mjs` : robots d'entraînement IA interdits, moteurs et robots de recherche IA autorisés **dans le groupe `*`** (sinon ils perdent les `Disallow`), `Disallow` des pages privées, lien sitemap. | ✅ |
| CI/CD | `ci.yml` (PR → main) : lint, tests, build bilingue, `check:en`, `check:public`, **aucun accès AWS** (données de test `fixtures`). `deploy.yml` (push main hors docs/infra, `workflow_dispatch`, `workflow_call`) : un seul job, 4 caches, OIDC, `fetch-data` → `validate-data` → build → `check:public` → contrôle des variables (refus d'un `S3_BUCKET` en `arn:` ou `s3://`) → sync → réconciliation → invalidation `/*` sans attente → résumé. `concurrency` sans annulation. `nightly-rebuild.yml` (cron minute 7). Trust policy OIDC : `sub = repo:<OWNER>/<REPO>:environment:production`. Policy de déploiement minimale (List/Get/Put/Delete sur le bucket, invalidation sur la seule distribution). | ✅ |
| Admin | Cognito Essentials (MFA TOTP obligatoire, inscription fermée, PKCE), HTTP API + authorizer JWT, Lambda `nodejs24.x` arm64 (alias `live`), SSM SecureString, warmup EventBridge facultatif, Terraform lancé **à la main** (jamais en CI), état S3 avec `use_lockfile`, `allowed_account_ids`. Import CSV, SKU, photos par POST présigné. | ✅ (⚠️ « corbeille » : conception mise de côté, pas sur `main`) |
| Commande | `wa.me/<chiffres>?text=` ; message tronqué au-delà de 3 000 caractères (« + N autres produits ») ; référence `XX-AAAAMMJJ-NNNN` ; jamais de prix inventé ; panier `localStorage` restauré dans `afterNextRender`. Catégories non commandables (`order-mode.config.ts`) → contact `mailto:`. | ✅ (⚠️ `export-mail.ts` n'existe plus : la demande d'export a été retirée, PR #25) |
| Coûts | Budget AWS + Cost Anomaly Detection (abonnement email, pas SNS), rapports CloudFront gratuits, ne jamais activer les métriques additionnelles ; ne jamais appeler l'API Cost Explorer (payante). | ✅ (doc) |
| Domaine | Procédure de bascule documentée (SEO §2 : `siteUrl`, drapeau de redirection, Search Console). ACM us-east-1, Cloudflare en proxy gris, MX/SPF/DKIM/DMARC : **rien dans le repo**. | ❓ |
| Qualité | Lighthouse mobile ≥ 90 sur accueil/catégorie/fiche, LCP < 2,5 s, TBT < 200 ms, CLS 0 ; police auto-hébergée woff2 + preload ; `check-seo.mjs` (un h1, pas de saut, titres/descriptions uniques, canonical, hreflang, JSON-LD, noindex). | ✅ (branche SEO) |

## 2. Générique → plugin

- Règles Angular 22 (best practices MCP résumées dans `docs/angular-best-practices.md`).
- Arborescence `core/ shared/ features/<feature>/`, `core/{animation,data,seo,i18n,image,config,util}`.
- `useGsap()` (afterNextRender + `gsap.matchMedia` scopé + `revert` + `ScrollTrigger.refresh` après navigation) et `withGsap()` (import dynamique, rien en mouvement réduit).
- `Seo` service (title, description, OG, Twitter, canonical, hreflang, JSON-LD `@graph` + BreadcrumbList).
- Lecteur de données au prérendu (`DATA_FILE_READER` + intercepteur), `httpResource` paresseux, contrôle de version « données fraîches ».
- Image loader `NgOptimizedImage` vers des variantes WebP `-<largeur>.webp`.
- `browser-storage.ts`, générateur de message WhatsApp (pur, testé), panier en signals.
- Scripts : `build-cloudfront-function.mjs` + `redirects.mjs`, `deploy-s3.sh`, `sync-changed.mjs`, `robots.mjs`, `postbuild.mjs` (sitemap avec alternates et images, 404), `check-seo.mjs`, `check-english.mjs`, `serve-dist.mjs`, `nightly-check.mjs`.
- Workflows `ci.yml`, `deploy.yml`, `nightly-rebuild.yml` ; trust policy et policy OIDC ; Terraform OIDC.
- Infra admin Terraform (Cognito, API, Lambda, SSM, bootstrap d'état), conception draft/live/history + `If-Match`.
- Méthode de travail : prompts numérotés, un point d'arrêt par étape, `ng build` vert, résumé.

## 3. Spécifique ANSA FOOD → reste dans le projet

Contenu du catalogue (produits, catégories, marques, `storage`, unités carton/kg), palette « fiche de
criée », Archivo, textes, numéro WhatsApp, IDs AWS (compte, distribution, buckets, région
`eu-north-1`), noms (`ansafood-*`), redirections WordPress, export « Frais », section 3D / brume,
scraping WooCommerce, règles client (types CHR/distributeur, retrait à Bouskoura).

## 4. Skills, plugins et MCP déjà utilisés

| Nom | Source | Apport | Mon plugin |
|---|---|---|---|
| `frontend-design` | plugin `frontend-design@claude-code-plugins` (Anthropic), installé en projet ailleurs | direction artistique, éviter le look générique | **compléter** : le charger s'il est là, ajouter mes règles (tokens, sobriété, B2B) |
| `gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-plugins`, `gsap-utils`, `gsap-performance`, `gsap-frameworks` | plugin `gsap-skills@gsap-skills` (greensock/gsap-skills), utilisateur | API GSAP officielle | **compléter** ; `gsap-react` ignoré |
| `threejs-*` (10 skills) | `CloudAI-X/threejs-skills`, dans `.claude/skills` du projet | section 3D (retirée de l'accueil pour la perf) | **mentionner** seulement (3D = exception, jamais au-dessus de la ligne de flottaison) |
| Firecrawl (`firecrawl-map`, `-crawl`, `-scrape`, `-download`, `-parse`…) | plugin `firecrawl@anthropic-plugin-directory`, projet | reprise du contenu d'un site existant | **compléter** (étape « récupérer le contenu existant » du scaffold) |
| MCP `angular-cli` | `.mcp.json` : `npx -y @angular/cli mcp` | best practices de la version installée, doc, `ng generate` | **dépendre** (le scaffold écrit ce `.mcp.json`, aucun secret) |
| SEO / Lighthouse | aucun skill tiers installé : savoir-faire maison (`check-seo.mjs`, prompts 06 et 22) | — | **porter** dans le plugin |

Les dépendances de plugin (`dependencies` dans `plugin.json`) ne sont **pas** déclarées : elles
forceraient l'installation de marketplaces tierces. Les skills disent « charge X s'il est disponible ».
