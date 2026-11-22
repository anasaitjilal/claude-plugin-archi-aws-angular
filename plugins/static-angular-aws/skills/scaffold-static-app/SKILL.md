---
name: scaffold-static-app
description: Crée un nouveau projet de site vitrine ou de catalogue statique avec l'architecture static-angular-aws - ng new, @angular/localize, gabarit (CLAUDE.md type, .mcp.json, core Angular, scripts SEO/CloudFront/données, workflows GitHub Actions, policies OIDC) puis build vert. À utiliser pour « nouveau site », « démarrer un projet », « scaffold », « initialiser un site Angular statique sur S3/CloudFront ».
---

# Scaffold d'un site statique Angular + AWS

Le script `apply-template.mjs` copie un gabarit **testé** (build, tests, `check-seo`,
`check-cloudfront-function` verts sur un projet vierge) et adapte `angular.json` et `package.json`.

## Avant de commencer

1. Charger `static-angular-aws-architecture` (règles transverses).
2. Recueillir (sans inventer) : nom du site, slug kebab-case du projet, domaine visé, numéro
   WhatsApp (format international, **confirmé par le client**), email de contact, langue(s).
   Une valeur inconnue reste vide : le script met `[À valider] …` dans les textes.
3. Vérifier la version : `npx @angular/cli@latest version` (Node ≥ 22 LTS, idéalement 24).

## Procédure

```bash
mkdir <projet> && cd <projet> && git init -b main
npx -y @angular/cli@latest new <projet> --directory web --ssr --style scss --routing \
  --skip-git --defaults --interactive=false
cd web
npx ng add @angular/localize --skip-confirmation
npm i gsap
npm i -D sharp            # conversion WebP au prebuild (facultatif mais recommandé)
node "${CLAUDE_PLUGIN_ROOT}/skills/scaffold-static-app/scripts/apply-template.mjs" \
  --target .. --project <projet> --site-name "<Nom>" \
  [--domain www.exemple.ma] [--whatsapp 2126XXXXXXXX] [--email contact@exemple.ma] [--og-locale fr_MA]
npm run build             # prebuild sync-data → ng build (prérendu) → postbuild sitemap/robots/404
npm run test:ci
npm run check:seo
npm run check:cloudfront
```

Ensuite :
- `get_best_practices` (MCP angular-cli) avec le chemin du workspace, et comparer aux conventions du
  gabarit ; corriger le gabarit **et** signaler l'écart si une règle a changé dans une nouvelle version.
- Créer `prompts/01-contenu.md`, `02-direction-artistique.md`, … (`references/prompts-sequence.md`).
- `git checkout -b feat/initialisation`, commit `chore: initialisation (static-angular-aws)`.

## Ce que contient le projet généré

`references/generated-tree.md` liste chaque fichier et le skill qui en est la source.
Points clés : `site.config.mjs` (config des scripts), `environment.ts` (URL publique, WhatsApp, email),
`core/` (seo, animation, data, i18n, image, order), page d'accueil avec hero immobile et un seul
moment GSAP sous la ligne de flottaison (`@defer (on viewport; hydrate on viewport)`), 404 `noindex`.

## Options

- **Anglais** : skill `angular-ssg-i18n`, section « Ajouter une langue ».
- **Catalogue** : skill `json-catalog-data` (modèles, `getPrerenderParams`, `httpResource`).
- **Panier** : `core/order/` est déjà là ; brancher l'UI (skill `whatsapp-mailto-ordering`).
- **Admin** : skill `serverless-json-admin` (seulement si le client édite lui-même).
- **Reprise d'un site existant** : skills Firecrawl (`firecrawl-map` puis `firecrawl-crawl`),
  sorties dans `.firecrawl/` et `data/raw/` (ignorés par git), puis normalisation vers `data/*.json`
  et redirections 301 dans `scripts/redirects.mjs`.

## Règles

- Ne jamais lancer le script sur un projet existant sans `git status` propre ; il refuse d'écraser un
  fichier modifié (hors fichiers générés par `ng new`) sauf `--force`.
- Ne rien déployer à ce stade : l'infra AWS se crée après validation (skill `aws-static-hosting`).

## Pièges déjà rencontrés

- `ng new --ssr` crée `server.ts` et `ssr.entry` : en `outputMode: static` ils sont inutiles, le script
  les retire (sinon un serveur Express est construit pour rien).
- Oublier `@angular/localize` : `$localize` et `i18n` cassent le build ; `localize: true` en production
  produit `browser/fr/` (le chemin attendu par tous les scripts).
- Placeholders `{{…}}` restés dans `environment.ts` : `deploy.yml` refuse de déployer ; le script liste
  ceux qui restent.
- `sharp` bloqué par les « install scripts » de npm 11 : la conversion WebP est sautée avec un
  avertissement ; `npm install-scripts approve sharp` si besoin.
- Windows avec « contrôle intelligent des applications » : `Cannot find native binding` au build alors que
  le binaire est présent (`require('@rolldown/binding-win32-x64-msvc')` répond « Une stratégie de contrôle
  d'application a bloqué ce fichier »). Ce n'est pas le bug npm annoncé : réessayer plus tard, ou créer le
  projet ailleurs que dans un dossier temporaire.
