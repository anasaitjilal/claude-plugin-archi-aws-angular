#!/usr/bin/env node
// Contrôle SEO des pages prérendues (après le build), d'après site.config.mjs :
//   - un seul <h1> par page, pas de saut de niveau (h2 -> h4) ;
//   - <title> et meta description présents et uniques par langue (pages indexables) ;
//   - canonical absolu sur siteUrl ; hreflang (chaque langue + x-default) si plusieurs langues ;
//   - JSON-LD : JSON valide, @context schema.org ; Product : name et image, offers seulement avec un prix ;
//   - noindex exactement sur site.noindex ; <html lang> renseigné ; images avec alt.
//
//   node check-seo.mjs [--root <projet>]
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const root = resolve(args.includes('--root') ? args[args.indexOf('--root') + 1] : process.cwd());
const { default: site, siteUrl } = await import(pathToFileURL(join(root, 'site.config.mjs')).href);
const BROWSER = join(root, site.distDir);
const NOINDEX = new Set(site.noindex);
const SKIP = new Set(site.sharedDirs);

const walk = (base, dir = base) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return dir === base && SKIP.has(e.name) ? [] : walk(base, p);
    return e.name === 'index.html' ? [p] : [];
  });

const problems = [];
const report = (route, message) => problems.push(`${route} : ${message}`);
const text = (html) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const attr = (tag, name) => new RegExp(`${name}="([^"]*)"`).exec(tag)?.[1] ?? null;

let pages = 0;
for (const locale of site.locales) {
  const base = join(BROWSER, locale.code);
  const titles = new Map();
  const descriptions = new Map();
  for (const file of walk(base)) {
    const route = '/' + relative(base, file).split(sep).slice(0, -1).join('/');
    if (route.startsWith('/admin')) continue;
    const label = `${locale.code}${route}`;
    const html = readFileSync(file, 'utf8');
    const head = html.slice(0, html.indexOf('</head>'));
    const body = html.slice(html.indexOf('<body'));
    pages++;

    if (!/<html[^>]*\blang="[a-z]{2}/.test(html)) report(label, '<html lang> manquant');

    const headings = [...body.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
    const h1 = headings.filter((h) => h === 1).length;
    if (h1 !== 1) report(label, `${h1} h1 (attendu : 1)`);
    headings.forEach((h, i) => {
      if (i && h > headings[i - 1] + 1) report(label, `saut de niveau h${headings[i - 1]} -> h${h}`);
    });

    for (const img of body.matchAll(/<img\b[^>]*>/g)) {
      if (attr(img[0], 'alt') === null) report(label, `image sans alt : ${attr(img[0], 'src')}`);
    }

    const title = text(/<title>([\s\S]*?)<\/title>/.exec(head)?.[1] ?? '');
    const description = attr(/<meta name="description"[^>]*>/.exec(head)?.[0] ?? '', 'content');
    const robots = attr(/<meta name="robots"[^>]*>/.exec(head)?.[0] ?? '', 'content');
    const canonical = attr(/<link rel="canonical"[^>]*>/.exec(head)?.[0] ?? '', 'href');
    const hreflangs = [...head.matchAll(/<link rel="alternate" hreflang="([^"]+)"/g)].map((m) => m[1]).sort();
    const noindex = !!robots?.includes('noindex');

    if (NOINDEX.has(route) !== noindex) report(label, noindex ? 'noindex inattendu' : 'noindex manquant');
    if (!title) report(label, 'title manquant');
    if (!canonical) report(label, 'canonical manquant');
    else if (!canonical.startsWith(siteUrl)) report(label, `canonical hors siteUrl : ${canonical}`);
    if (!noindex) {
      if (!description) report(label, 'meta description manquante');
      else if (description.length > 165) report(label, `meta description longue (${description.length} > 165)`);
      if (title) titles.set(title, [...(titles.get(title) ?? []), route]);
      if (description) descriptions.set(description, [...(descriptions.get(description) ?? []), route]);
      if (site.locales.length > 1) {
        const want = [...site.locales.map((l) => l.code), 'x-default'].sort();
        if (hreflangs.join() !== want.join()) report(label, `hreflang ${hreflangs.join(',') || 'absents'} (attendu ${want.join(',')})`);
      }
    }

    for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
      let data;
      try {
        data = JSON.parse(m[1]);
      } catch {
        report(label, 'JSON-LD invalide');
        continue;
      }
      if (data['@context'] !== 'https://schema.org') report(label, 'JSON-LD sans @context schema.org');
      for (const node of data['@graph'] ?? [data]) {
        if (node['@type'] === 'Product') {
          if (!node.name || !node.image) report(label, 'Product sans name ou image');
          if (node.offers && node.offers.price == null) report(label, 'offers sans prix (ne jamais inventer : retirer offers)');
        }
      }
    }
  }
  for (const [value, routes] of [...titles, ...descriptions]) {
    if (routes.length > 1) report(locale.code, `« ${value.slice(0, 60)} » partagé par ${routes.slice(0, 4).join(', ')}`);
  }
}

if (!pages) {
  console.error(`check-seo : aucune page dans ${BROWSER} (lancer le build d'abord)`);
  process.exit(1);
}
if (problems.length) {
  console.error(`check-seo : ${problems.length} problème(s) sur ${pages} pages\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`check-seo : ${pages} pages OK`);
