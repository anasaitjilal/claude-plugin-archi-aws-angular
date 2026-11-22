// Table unique des redirections 301 du site (copier en scripts/redirects.mjs).
// Lue par scripts/build-cloudfront-function.mjs (CloudFront Function) et scripts/postbuild.mjs
// (_redirects Netlify, vercel.json, nginx-redirects.conf).
//
// REDIRECTS : anciennes URLs (ex. ancien WordPress) -> nouvelles. Règles les plus précises d'abord.
//   `:nom` capture un segment. Barre finale facultative. La query string d'origine est conservée.
// RENAMES : préfixes renommés sur le nouveau site (catégorie, fiche). Appliqués dans chaque langue
//   (préfixe /en compris), avec sous-adresses et query string, et aussi à la cible des REDIRECTS :
//   jamais de redirection en chaîne.
// Ne jamais inventer d'URL : partir de la carte de l'ancien site (firecrawl-map) ou des logs.

/** @type {[from: string, to: string][]} */
export const REDIRECTS = [
  // ['/product-category/:category/', '/produits/:category'],
  // ['/product/:slug/', '/produit/:slug'],
  // ['/shop/', '/produits'],
];

/** @type {[from: string, to: string][]} */
export const RENAMES = [
  // ['/produits/ancien-slug', '/produits/nouveau-slug'],
];
