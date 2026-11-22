import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Tout est prérendu (outputMode: "static"). Les routes à paramètre lisent leurs valeurs sur disque :
 *
 *   {
 *     path: 'produit/:slug',
 *     renderMode: RenderMode.Prerender,
 *     getPrerenderParams: async () =>
 *       (readDataFile('products.json') as Product[]).filter((p) => p.visible).map((p) => ({ slug: p.slug })),
 *   },
 *
 * Espace privé (admin) : `{ path: 'admin/**', renderMode: RenderMode.Client }` -> index.csr.html,
 * servi par la CloudFront Function (site.config.mjs : adminSpa: true).
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
