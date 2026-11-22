---
name: json-catalog-data
description: Données d'un site statique servies en JSON - modèle de catalogue (produits, catégories, marques), data/ comme source, conversion des images en WebP multi-largeurs, validation avant build (schéma zod partagé, photos), chargement paresseux avec httpResource, données fraîches publiées sans rebuild (version.json), fixtures pour la CI. À utiliser pour « catalogue », « produits », « JSON », « données », « images WebP », « validate-data », « MISSING.md ».
---

# Données JSON d'un catalogue statique

## Principes

- `data/` à la racine est la **source** (versionnée, ou publiée par l'admin) ; `web/public/data/` et
  `web/public/images/` sont **générés** par `scripts/sync-data.mjs` (prebuild/prestart) et ignorés par git.
- **Ne jamais inventer** : un champ inconnu vaut `null` (le site le masque) et il est listé dans
  `data/MISSING.md`. Prix absent = « Prix sur demande », jamais une estimation.
- Un schéma unique (`shared/catalog-schema.ts`, zod) pour le site, les scripts et la Lambda admin.

## Modèle type (à adapter, ne pas forcer)

```ts
interface Product {
  id: string; slug: string;            // identiques, kebab-case → /produit/<slug>
  name: string; brand: string | null;
  category: string; subcategory: string | null; categories: string[];  // appartenances transverses
  description: string | null; origin: string | null; packaging: string | null;
  sku: string | null; price: number | null;           // null = non publié
  attributes: Record<string, string>;                 // fiche technique (clés dans la langue source)
  images: { src: string; alt: string | null }[];      // « images/products/<slug>/1.jpg »
  visible: boolean; updatedAt: string | null;         // lastmod du sitemap
}
interface Category { slug: string; name: string; parent: string | null; productCount: number }
```

## Images

`sync-data.mjs` (asset) convertit `data/images/**` en `-240/-360/-640/-960/-1440.webp` (sharp, qualité
72, manifeste SHA-1 : seules les images modifiées sont refaites). Le loader `NgOptimizedImage`
(`image-loader.ts`) choisit la plus petite variante couvrant la largeur demandée : **toujours** donner
`sizes` = taille réellement affichée (ex. `sizes="(min-width: 1024px) 240px, 45vw"`), `width`/`height`
ou `aspect-ratio`, `priority` uniquement sur l'image LCP. Packshots : fond blanc, cadre blanc.

## Chargement côté front

```ts
@Service()
export class CatalogStore {
  private readonly productsWanted = signal(false);          // ~250 Ko : seulement si une page en a besoin
  private readonly productsRes = httpResource<Product[]>(
    () => (this.productsWanted() ? '/data/products.json' : undefined), { defaultValue: [] });
  readonly products = computed(() => this.productsRes.value().filter((p) => p.visible));
  private readonly bySlug = computed(() => new Map(this.products().map((p) => [p.slug, p])));
  requireProducts(): void { this.productsWanted.set(true); }
  productBySlug(slug: string) { return this.bySlug().get(slug); }
}
```

Filtres en signals synchronisés avec l'URL (query params, `withComponentInputBinding`), recherche
insensible aux accents (`normalize('NFD')`).

## Validation (`scripts/validate-data.mjs`, asset)

Lancé en CI et **avant chaque build de production**. Erreurs : JSON illisible, image référencée absente,
placeholder ou TODO, slug en double, produit **visible** sans photo. Avertissement : produit masqué sans
photo. Ajouter les règles métier dans `checkProject()` ou, avec un admin, dans le schéma zod partagé.

## Données fraîches sans rebuild (avec l'admin)

La publication écrit `data/*.json` + `data/version.json` (`{ version, publishedAt }`) dans le bucket du
site (Cache-Control `no-cache`). Le store compare, après l'hydratation, `version.json` lu **sans cache**
(`fetch(..., { cache: 'no-store' })`) à la version du build et, si elle diffère, recharge les fichiers
avec `?v=<version>` (`transferCache: false`). Le rebuild de nuit remet à jour le HTML prérendu (SEO).
Détails et schéma : `references/fresh-data.md`.

## CI sans AWS

`data/fixtures/` : petit jeu de données réaliste (anonymisé) pour les builds de PR ;
`DATA_SOURCE=fixtures`. La production lit `live/catalog.json` (S3) via OIDC.

## Pièges déjà rencontrés

- `validate-data` qui bloque un déploiement : un produit rendu visible sans photo. La règle doit être
  **la même** dans l'admin (interrupteur « Visible » désactivé tant qu'il n'y a pas de photo) et dans le
  script, sinon le client publie puis la pipeline échoue.
- Régénérer les données depuis le scraping après la mise en ligne écrase les ajouts manuels : une fois
  le site en ligne, `data/` (ou `live/`) devient la seule source.
- `productCount` stocké qui diverge des produits réels : le recalculer (ou le valider) au build.
- Une image remplacée par une autre **de même taille** n'est pas renvoyée par `aws s3 sync --size-only` :
  changer le nom du fichier.
