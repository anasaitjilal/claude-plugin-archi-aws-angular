// Configuration unique des scripts (postbuild, CloudFront Function, contrôles, déploiement).
// L'URL publique n'est écrite qu'à un endroit : siteUrl dans web/src/environments/environment.ts.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const ROOT = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

const ENV_FILE = join(ROOT, 'web', 'src', 'environments', 'environment.ts');
export const siteUrl = /siteUrl:\s*'([^']+)'/.exec(readFileSync(ENV_FILE, 'utf8'))?.[1]?.replace(/\/$/, '');
if (!siteUrl) throw new Error(`siteUrl introuvable dans ${ENV_FILE}`);

export default {
  siteName: '{{SITE_NAME}}',
  /** Dossier du build Angular (localize: true -> un sous-dossier par langue). */
  distDir: 'web/dist/{{PROJECT}}/browser',
  /** Première langue = langue par défaut, servie à la racine. Ajouter { code: 'en', prefix: '/en' }. */
  locales: [{ code: 'fr', prefix: '' }],
  /** Pages non indexables : noindex, hors sitemap, Disallow dans robots.txt. */
  noindex: ['/404', '/commande'],
  /** Dossiers communs gardés une seule fois à la racine (pas de copie par langue). */
  sharedDirs: ['images', 'data', 'videos', 'fonts', 'media'],
  /** Hôtes autorisés à afficher les photos protégées (anti-hotlinking). */
  imageHosts: ['{{DOMAIN}}', '{{CLOUDFRONT_DOMAIN}}'],
  /** Préfixe des photos protégées par Referer, ou null. Ex. '/images/products/'. */
  protectedImagesPrefix: null,
  /** Espace admin rendu dans le navigateur (/admin* -> /index.csr.html). */
  adminSpa: false,
  /** Après la bascule DNS seulement : '{{DOMAIN}}' -> *.cloudfront.net redirigé en 301. */
  canonicalHost: null,
};
