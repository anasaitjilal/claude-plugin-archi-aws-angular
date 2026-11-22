---
name: web-perf-lighthouse
description: Performance web d'un site statique Angular - budget Lighthouse mobile (score ≥ 90, LCP < 2,5 s, TBT < 200 ms, CLS 0), mesure en médiane de 3 passes, analyse des chunks, images (srcset, sizes, WebP/AVIF), polices auto-hébergées, cache CloudFront/S3, @defer. À utiliser pour « Lighthouse », « performance », « PageSpeed », « LCP », « TBT », « CLS », « site lent », « bundle trop gros », « Core Web Vitals ».
---

# Performance et budget Lighthouse

## Budget (mobile, médiane de 3 passes, sur accueil + une liste + une fiche)

| Mesure | Cible |
|---|---|
| Performance, Accessibilité, Bonnes pratiques, SEO | ≥ 90 |
| LCP | < 2,5 s |
| TBT | < 200 ms |
| CLS | 0 (≤ 0,01) |
| Poids total | < 1,6 Mo |
| Bundle initial (angular.json) | avertissement 400 Ko, erreur 600 Ko |

Mesurer : `node "${CLAUDE_PLUGIN_ROOT}/skills/web-perf-lighthouse/scripts/lighthouse-budget.mjs" <url…>`
(Chrome requis ; sur le build local : `npm run build` puis un serveur statique qui reproduit la prod,
FR à la racine et autres langues sous `/xx/`). Noter **avant/après** dans `docs/performance.md`.

## Ordre de travail (mesurer après chaque étape)

1. **Élément LCP** (affiché par le script) : texte ou image légère, visible sans JS, sans animation.
   Pas de vidéo au chargement : image fixe ; vidéo éventuelle seulement sur grand écran, après `load`,
   jamais en mouvement réduit ni en `saveData`.
2. **JavaScript** : identifier chaque chunk (`ng build --source-map` en local + `source-map-explorer`) ;
   retirer les restes de bibliothèques ; GSAP et sections basses en `@defer (on viewport; hydrate on viewport)` ;
   aucune bibliothèque lourde dans le bundle initial.
3. **Rendu** : `transform`/`opacity` seulement ; `content-visibility: auto` + `contain-intrinsic-size` pour
   les sections basses ; placeholders de `@defer` à hauteur fixe.
4. **Images** : `NgOptimizedImage` partout, `sizes` = taille réelle affichée, largeurs 240/360 pour les
   vignettes, WebP qualité ~70 (AVIF si gain net), `width`/`height` ou `aspect-ratio`, `priority` sur la
   seule image LCP.
5. **Polices** : woff2 auto-hébergé, sous-ensemble latin, `font-display: swap`, `preload` de la police du
   titre seulement ; supprimer tout `preconnect` vers Google Fonts.
6. **Cache** : js/css hashés `max-age=31536000, immutable` ; HTML/JSON `no-cache` ; images et vidéos
   1 an `immutable` **seulement si leurs noms sont versionnés** (sinon 7 jours). Aucune requête en double
   (ex. `version.json` lu deux fois).
7. **Compression** : CloudFront « Compress objects automatically » activé (gzip/brotli).

## Règles

- Toute optimisation se justifie par une mesure (avant/après), pas par intuition.
- Ne pas sacrifier l'accessibilité ou le SEO au score (ex. cacher du texte pour le LCP).
- Hydratation : zéro erreur NG05xx dans la console.

## Pièges déjà rencontrés

- Vidéo du hero (740 Ko) téléchargée au chargement sur mobile, et image du hero élément LCP à 4,4 s.
- Chunk de 248 Ko contenant une bibliothèque 3D inutilisée sur l'accueil.
- Vignettes 960 px pour 120–182 px affichés (`sizes="auto, 100vw"`).
- Police Google Fonts de 89 Ko + `preconnect` inutile.
- Images à 7 jours de cache alors que les noms ne changent jamais : passer à des noms versionnés.
- Lighthouse en ligne de commande contre un site protégé : `HeadlessChrome` est bloqué par la
  CloudFront Function (403) ; utiliser `--headless=new` (agent normal) — l'agent « Chrome-Lighthouse »
  de PageSpeed Insights est dans la liste autorisée.
