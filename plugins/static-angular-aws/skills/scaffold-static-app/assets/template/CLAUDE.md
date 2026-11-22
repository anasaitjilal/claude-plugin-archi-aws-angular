# CLAUDE.md — {{SITE_NAME}}

Projet créé avec le plugin `static-angular-aws` (skill d'entrée : `static-angular-aws-architecture`).

## Le client

{{SITE_NAME}} — {{CLIENT_DESCRIPTION}}
Publics : {{AUDIENCE}}. Langue du site : français (structure prête pour d'autres langues).

## Objectif

Site **statique, rapide et professionnel**, sans serveur applicatif :
- contenu servi depuis des JSON (`data/` -> `web/public/data/`), prérendu (SSG) de toutes les pages ;
- commande ou contact par **WhatsApp** (`wa.me`, message prérempli) et `mailto:` ;
- hébergement S3 privé + CloudFront (forfait Free), déploiement GitHub Actions par OIDC.

## Stack imposée

- Angular dernière version stable, standalone, zoneless, signals (`signal`, `computed`, `linkedSignal`,
  `input()`, `output()`, `model()`), `httpResource`, control flow natif, `NgOptimizedImage`, `@defer`.
  En v22 : OnPush et standalone sont le défaut (ne pas les écrire), `@Service()` pour les services.
- SCSS + design tokens en custom properties (`web/src/styles/_tokens.scss`), aucun framework CSS.
- GSAP (+ ScrollTrigger) via `core/animation/use-gsap.ts` uniquement.
- `@angular/ssr` avec `outputMode: "static"`, i18n compilée (`localize: true`).

## Outils

- MCP Angular CLI (`.mcp.json`) : `get_best_practices` avant d'écrire du code ; `ng generate`.
- Skills du plugin `static-angular-aws` ; skills GSAP officiels et `frontend-design` s'ils sont installés ;
  Firecrawl pour reprendre le contenu d'un site existant (sorties brutes dans `.firecrawl/`, `data/raw/`).

## Règles GSAP

`afterNextRender` seulement, `gsap.matchMedia()` scopé à l'hôte, `revert()` à la destruction,
`prefers-reduced-motion` respecté, `transform`/`opacity` seulement, **un seul moment fort par page**,
aucune animation d'entrée au-dessus de la ligne de flottaison (jamais sur l'élément LCP).

## Conventions

- `core/`, `shared/`, `features/<feature>/` ; un composant par fichier, kebab-case, `strict`, aucun `any`.
- Textes en français, voix active, casse de phrase.
- Tests unitaires : panier et générateur de message WhatsApp au minimum.

## Interdits

- Pas de backend applicatif, pas de paiement en ligne, pas de compte client public.
- Aucun accès navigateur pendant le prérendu (`afterNextRender` ou `isPlatformBrowser`).
- **Ne jamais inventer** de produit, prix, chiffre ou avis : donnée manquante = champ vide + `data/MISSING.md`.
- **Aucune ressource AWS payante sans accord explicite** ; ne jamais appeler l'API Cost Explorer.
- Aucun secret dans le repo, `.mcp.json` ou les workflows (OIDC, variables GitHub, SSM).
- Jamais de push sur `main` : une branche par évolution, tests et build verts avant la PR.

## Méthode

Étapes dans `prompts/` (dans l'ordre). Fin d'étape : `cd web && npm run build`, `node scripts/check-seo.mjs`,
résumé (fait / reste), puis attendre la validation. Commits conventionnels (`feat:`, `fix:`, `chore:`).
