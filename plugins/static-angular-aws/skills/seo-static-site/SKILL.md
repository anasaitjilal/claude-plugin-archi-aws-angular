---
name: seo-static-site
description: SEO technique d'un site statique prérendu - title et meta description uniques, canonical, hreflang avec x-default, Open Graph et Twitter (image 1200×630), JSON-LD (Organization/LocalBusiness, WebSite, Product sans prix inventé, BreadcrumbList), sitemap multilingue avec images, robots.txt (robots IA), noindex des pages privées, un seul h1, contrôle automatique check-seo. À utiliser pour « SEO », « référencement », « sitemap », « robots.txt », « JSON-LD », « données structurées », « canonical », « hreflang », « Search Console ».
---

# SEO technique d'un site statique

## Pièces (assets / scripts)

| Fichier | Rôle |
|---|---|
| `core/seo/seo.ts` | `Seo.set({ title, description, path, image, type, jsonLd, breadcrumbs, noindex })` |
| `scripts/postbuild.mjs` | `sitemap.xml` (langues + `xhtml:link`, `image:image`), `robots.txt`, `404.html`, redirections autres hébergeurs |
| `scripts/robots.mjs` | robots d'entraînement IA interdits, moteurs et robots de recherche IA autorisés |
| `scripts/check-seo.mjs` | contrôle des pages prérendues (CI et déploiement) |

L'URL publique n'existe qu'à un endroit (`environment.ts` → `SITE_URL`) : canonical, hreflang, OG,
JSON-LD, sitemap et robots la lisent. Le jour de la bascule du domaine : skill `domain-dns-cutover`.

## Par page

- `title` unique (« Nom de page · Site »), `description` unique de 120 à 160 caractères, par langue.
  Deux fiches homonymes : distinguer par une donnée réelle (origine, marque, conditionnement).
- `canonical` absolu ; `hreflang` pour chaque langue + `x-default` (langue par défaut) ; aucun hreflang
  sur une page `noindex`.
- Open Graph + Twitter `summary_large_image` ; image 1200×630 par page clé (accueil, catégories), image
  par défaut sinon ; la fiche produit utilise sa photo.
- Un seul `h1`, aucun saut de niveau, `alt` pertinent sur chaque image de contenu.
- Liens internes : accueil → catégories → produits ; fil d'Ariane sur les pages catalogue.

## Données structurées

- Accueil : `Organization` + `LocalBusiness` (une entité : nom, adresse, téléphone, email ; `openingHours`
  et `sameAs` **seulement s'ils existent dans les données**) et `WebSite`.
- Fiche : `Product` (nom, image, sku, marque, origine) ; `offers` **uniquement** si un prix est publié
  et que le produit est commandable. Jamais de note ni d'avis inventés.
- Pages catalogue : `BreadcrumbList` (via `breadcrumbs`).
- Valider : `check-seo` (JSON, @context, Product) puis le test des résultats enrichis de Google une fois
  le site public.

## Indexation

- `noindex` (et hors sitemap, `Disallow`) : panier/commande, 404, admin, pages de demande. Liste dans
  `site.config.mjs` (`noindex`) : le Seo service doit recevoir `noindex: true` sur ces pages.
- `robots.txt` : les robots autorisés sont listés **dans le groupe `*`** (un robot suit le groupe le plus
  précis qui le nomme : dans un groupe à part, il perdrait les `Disallow`).
- Robots d'entraînement IA (GPTBot, ClaudeBot, CCBot, Google-Extended, Applebot-Extended, Bytespider,
  meta-externalagent, Amazonbot…) interdits ; robots de recherche IA (OAI-SearchBot, Claude-SearchBot,
  PerplexityBot…) autorisés : ils citent et renvoient vers le site. Revoir les noms chaque année.
- Anciennes URLs : 301 dans `scripts/redirects.mjs` (skill `aws-static-hosting`), sans chaîne.

## Contenu

Ne rien rédiger de nouveau sans validation : proposer des **brouillons** (ex. introduction de 100 à
200 mots par catégorie, sans fait inventé) dans `docs/seo-contenu.md`.

## Après la mise en ligne

Search Console (propriété de domaine, vérification DNS) et Bing Webmaster Tools : soumettre
`/sitemap.xml`, suivre « Pages » et « Améliorations ».

## Pièges déjà rencontrés

- Accueil sans `h1` visible (titre dans une image ou une animation).
- Descriptions courtes partagées par toute une gamme : titres et descriptions dupliqués.
- Domaine technique `*.cloudfront.net` indexé en double : préparer la redirection 301 (drapeau
  `canonicalHost` de `site.config.mjs`), l'activer **après** la bascule DNS seulement.
- `offers` avec un prix vide : erreur dans la Search Console ; retirer `offers`.
