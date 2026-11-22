---
name: angular-ssg-i18n
description: Prérendu statique (SSG) Angular avec @angular/ssr outputMode static, routes à paramètres (getPrerenderParams), lecture des JSON sur disque au build, @defer et hydratation incrémentale, i18n compilée @angular/localize (langue par défaut à la racine, autres sous /en/, hreflang). À utiliser pour « prérendu », « SSG », « SSR statique », « hydratation », « @defer », « version anglaise », « i18n », « $localize », « page qui saute à l'hydratation ».
---

# Angular : prérendu statique et i18n

Toujours commencer par `get_best_practices` (MCP angular-cli) avec le chemin du workspace.

## Configuration de base (gabarit)

- `angular.json` : `outputMode: "static"`, `server: "src/main.server.ts"`, **pas** de `ssr.entry` ;
  `polyfills: ["@angular/localize/init"]` ; `i18n.sourceLocale` = langue par défaut (`baseHref: "/"`) ;
  `localize: true` en production → `dist/<projet>/browser/<code>/`.
- `app.config.ts` (asset) : `provideClientHydration(withEventReplay(), withIncrementalHydration(),
  withI18nSupport())`, `withViewTransitions` sautée quand seuls les query params changent,
  `withComponentInputBinding()` (paramètres de route en `input()`).
- `app.config.server.ts` : `provideServerRendering(withRoutes(serverRoutes))` + `DATA_FILE_READER`.

## Routes à paramètres

```ts
// app.routes.server.ts
{
  path: 'produit/:slug',
  renderMode: RenderMode.Prerender,
  getPrerenderParams: async () =>
    (readDataFile('products.json') as Product[]).filter((p) => p.visible).map((p) => ({ slug: p.slug })),
},
{ path: 'admin/**', renderMode: RenderMode.Client },
{ path: '**', renderMode: RenderMode.Prerender },
```

`readDataFile` (asset `read-data-file.server.ts`) lit `web/public/data/` (le build est lancé depuis `web/`),
refuse tout nom hors `^(i18n/xx/)?[a-z0-9-]+\.json$`, met en cache. Côté composants, les données passent
par `httpResource('/data/x.json')` : pendant le prérendu l'intercepteur `dataFileInterceptor` répond
depuis le disque (fichier absent = 404, pas d'erreur de build), et le cache de transfert réutilise la
réponse à l'hydratation (aucune requête en double).

## Rendu différé et hydratation

- Au-dessus de la ligne de flottaison : rendu direct, pas de `@defer`.
- En dessous : `@defer (on viewport; hydrate on viewport) { … } @placeholder { <div style="min-height:…"> }`
  — le HTML est prérendu (SEO) et le JS n'est chargé qu'à l'approche. Placeholder de hauteur fixe (CLS 0).
- Tout accès au navigateur (`localStorage`, `matchMedia`, `window`) : `afterNextRender` ou
  `isPlatformBrowser`. Jamais dans un constructeur exécuté au prérendu.
- Ne jamais rendre au serveur un contenu qui dépend du navigateur (panier, date courante) : le
  restaurer après le premier rendu, sinon erreur d'hydratation NG0500.

## Ajouter une langue (ex. anglais)

1. `angular.json` : `i18n.locales.en = { translation: "src/locale/messages.en.xlf", baseHref: "/en/" }`.
2. `locale.ts` : `SITE_LOCALES = ['fr', 'en']` ; `site.config.mjs` : `{ code: 'en', prefix: '/en' }`.
3. Marquer les textes : `i18n="@@id.stable"` (templates) et `` $localize`:@@id.stable:Texte` `` (code).
   Les libellés métier passent par des **fonctions** (pas de constantes de module) pour que les tests
   puissent charger une traduction.
4. `ng extract-i18n --output-path src/locale` puis fusionner dans `messages.en.xlf` (script de merge :
   nouveaux messages en `state="new"`, échec en CI tant qu'il en reste).
5. Données : `data/i18n/en/*.json` en **surcharge** des JSON par `id`/`slug` ; un champ absent garde la
   langue par défaut. Mêmes slugs dans toutes les langues.
6. Contrôle : aucun mot de la langue par défaut sur les pages traduites (liste de mots fréquents) ;
   `check-seo` vérifie hreflang `fr`, `en`, `x-default`.
7. Pas de redirection selon `Accept-Language` : la langue se choisit avec le sélecteur du site.

Dev : `ng serve` sert la langue par défaut ; configuration `en` (`localize: ["en"]`) pour l'autre.

## Pièges déjà rencontrés

- Sans `withI18nSupport()`, Angular saute l'hydratation des templates traduits et reconstruit la page
  (effet « page qui saute »).
- Les fichiers communs (images, data) sont copiés dans chaque langue par le build : `postbuild` les
  supprime des sous-dossiers de langue (sinon déploiement double et URLs incohérentes).
- La synchronisation S3 de la langue par défaut doit exclure `en/*`, sinon `--delete` efface l'anglais.
- `getPrerenderParams` qui lit un fichier absent fait échouer tout le build : lancer `sync-data` avant
  (`prebuild`), et utiliser des fixtures en CI.
