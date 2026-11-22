// Après `ng build` : sitemap.xml (toutes les langues, alternates hreflang, images), robots.txt,
// 404.html par langue et fichiers de redirection pour d'autres hébergeurs (_redirects, vercel.json,
// nginx-redirects.conf), à partir des routes réellement prérendues.
// Config : site.config.mjs (siteUrl lu dans web/src/environments/environment.ts : une seule source).
import { copyFileSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import site, { ROOT, siteUrl } from '../site.config.mjs';
import { REDIRECTS } from './redirects.mjs';
import { robotsTxt } from './robots.mjs';

const BROWSER = join(ROOT, site.distDir);
const LOCALES = site.locales.map((l) => ({ ...l, dir: join(BROWSER, l.code) }));
const [DEFAULT] = LOCALES;
const SHARED = new Set(site.sharedDirs);
const EXCLUDED = new Set(site.noindex);

for (const { dir } of LOCALES) {
  if (!existsSync(dir)) {
    console.error(`postbuild : ${dir} introuvable (build avec localize: true ?)`);
    process.exit(1);
  }
}

// Fichiers communs (images, données…) : une seule copie, à la racine.
for (const { dir } of LOCALES.slice(1)) {
  for (const shared of SHARED) rmSync(join(dir, shared), { recursive: true, force: true });
}

const walk = (base, dir = base) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return dir === base && SHARED.has(e.name) ? [] : walk(base, p);
    return e.name === 'index.html' ? [p] : [];
  });
const routeOf = (dir, file) => '/' + relative(dir, file).split(sep).slice(0, -1).join('/');
const routes = [...new Set(LOCALES.flatMap(({ dir }) => walk(dir).map((f) => routeOf(dir, f))))]
  .filter((r) => !EXCLUDED.has(r) && !r.startsWith('/admin'))
  .sort();

const url = (locale, route) => `${siteUrl}${locale.prefix}${route === '/' ? '/' : route}`;
const escapeXml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const today = new Date().toISOString().slice(0, 10);

/** Images de la page (sitemap images) : <img> du HTML prérendu servies par le site. */
function imagesOf(route) {
  const file = join(DEFAULT.dir, route === '/' ? '' : route.slice(1), 'index.html');
  if (!existsSync(file)) return [];
  const html = readFileSync(file, 'utf8');
  const srcs = [...html.matchAll(/<img\b[^>]*\bsrc="(\/images\/[^"]+)"/g)].map((m) => m[1]);
  return [...new Set(srcs)].slice(0, 10).map((s) => siteUrl + s);
}

const alternates = (route) =>
  LOCALES.length < 2
    ? ''
    : [
        ...LOCALES.map((l) => `    <xhtml:link rel="alternate" hreflang="${l.code}" href="${url(l, route)}"/>`),
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${url(DEFAULT, route)}"/>`,
      ].join('\n') + '\n';
const entries = LOCALES.flatMap((l) =>
  routes.map((r) => {
    const images = l === DEFAULT ? imagesOf(r) : [];
    return (
      `  <url>\n    <loc>${escapeXml(url(l, r))}</loc>\n${alternates(r)}` +
      images.map((i) => `    <image:image><image:loc>${escapeXml(i)}</image:loc></image:image>\n`).join('') +
      `    <lastmod>${today}</lastmod>\n  </url>`
    );
  }),
);
writeFileSync(
  join(DEFAULT.dir, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries.join('\n')}
</urlset>
`,
);

writeFileSync(join(DEFAULT.dir, 'robots.txt'), robotsTxt(siteUrl, LOCALES.map((l) => l.prefix), site.noindex));

for (const { dir } of LOCALES) {
  const notFound = join(dir, '404', 'index.html');
  if (existsSync(notFound)) copyFileSync(notFound, join(dir, '404.html'));
}

// Autres hébergeurs : mêmes redirections que la CloudFront Function.
writeFileSync(
  join(DEFAULT.dir, '_redirects'),
  REDIRECTS.flatMap(([from, to]) => [`${from} ${to} 301`, `${from.replace(/\/$/, '')} ${to} 301`]).join('\n') + '\n',
);
writeFileSync(
  join(DEFAULT.dir, 'vercel.json'),
  JSON.stringify(
    {
      cleanUrls: true,
      trailingSlash: false,
      redirects: REDIRECTS.map(([from, to]) => ({ source: from.replace(/\/$/, ''), destination: to, permanent: true })),
    },
    null,
    2,
  ) + '\n',
);

console.log(
  `postbuild : ${routes.length} routes × ${LOCALES.length} langue(s), sitemap ${entries.length} URLs, robots.txt, 404.html, ${REDIRECTS.length} redirections`,
);
