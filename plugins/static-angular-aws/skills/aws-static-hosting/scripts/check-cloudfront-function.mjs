#!/usr/bin/env node
// Vérifie une CloudFront Function viewer-request générée par build-cloudfront-function.mjs,
// sans AWS : la fonction est exécutée localement avec des événements construits ici.
//
//   node check-cloudfront-function.mjs [--root <projet>]
//
// Lit <projet>/infra/cloudfront/viewer-request.js, <projet>/scripts/redirects.mjs et
// <projet>/site.config.mjs. Contrôles : taille <= 10 Ko, User-Agents (bloqués, autorisés, vide),
// chaque redirection et chaque renommage (301, query string conservée telle quelle), ajout de
// index.html, /<langue> -> /<langue>/, admin, anti-hotlinking, domaine canonique.
// Sortie non nulle au premier contrôle en échec (liste complète affichée).
// Rappel : le runtime réel est cloudfront-js-2.0 ; tester aussi avec `aws cloudfront test-function`
// sur l'étape DEVELOPMENT avant de publier.
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const root = resolve(args.includes('--root') ? args[args.indexOf('--root') + 1] : process.cwd());
const file = join(root, 'infra', 'cloudfront', 'viewer-request.js');
const code = readFileSync(file, 'utf8');
const handler = new Function(`${code}\nreturn handler;`)();
const { REDIRECTS = [], RENAMES = [] } = await import(pathToFileURL(join(root, 'scripts', 'redirects.mjs')).href);
const site = (await import(pathToFileURL(join(root, 'site.config.mjs')).href)).default;

const BROWSER = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';
const failures = [];
let checks = 0;

/** Construit un événement viewer-request ; `query` est la query string brute (déjà encodée). */
function event(uri, { ua = BROWSER, query = '', referer, host = site.canonicalHost ?? 'example.org' } = {}) {
  const querystring = {};
  for (const part of query.replace(/^\?/, '').split('&').filter(Boolean)) {
    const [k, v = ''] = part.split('=');
    querystring[k] = { value: v };
  }
  const headers = { host: { value: host } };
  if (ua !== null) headers['user-agent'] = { value: ua };
  if (referer) headers.referer = { value: referer };
  return { version: '1.0', context: { eventType: 'viewer-request' }, viewer: { ip: '198.51.100.10' }, request: { method: 'GET', uri, querystring, headers, cookies: {} } };
}

function expect(label, ev, check) {
  checks++;
  const out = handler(ev);
  const status = out.statusCode ?? 200;
  const location = out.headers?.location?.value;
  const error = check({ status, location, uri: out.uri });
  if (error) failures.push(`${label} : ${error} (obtenu ${status}${location ? ' -> ' + location : ''}${out.uri ? ' uri ' + out.uri : ''})`);
}
const is = (want) => ({ status }) => (status === want ? null : `attendu ${want}`);
const goesTo = (want) => ({ status, location }) => (status === 301 && location === want ? null : `attendu 301 -> ${want}`);
const servesUri = (want) => ({ status, uri }) => (status === 200 && uri === want ? null : `attendu uri ${want}`);

// Taille
checks++;
if (Buffer.byteLength(code) > 10 * 1024) failures.push(`taille : ${Buffer.byteLength(code)} octets > 10 Ko`);

// User-Agents
for (const ua of ['curl/8.5.0', 'python-requests/2.32', 'Wget/1.21', 'Go-http-client/2.0', 'axios/1.7', 'Mozilla/5.0 HeadlessChrome/120.0']) {
  expect(`UA bloqué « ${ua} »`, event('/', { ua }), is(403));
}
expect('UA vide', event('/', { ua: '' }), is(403));
expect('UA absent', event('/', { ua: null }), is(403));
for (const ua of [
  BROWSER,
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'WhatsApp/2.23.20',
  'LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)',
  'Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36 Chrome-Lighthouse',
]) {
  expect(`UA autorisé « ${ua.slice(0, 40)}… »`, event('/', { ua }), is(200));
}

// Pages
expect('racine', event('/'), servesUri('/index.html'));
expect('page sans barre', event('/a-propos'), servesUri('/a-propos/index.html'));
expect('page avec barre', event('/a-propos/'), servesUri('/a-propos/index.html'));
expect('fichier', event('/main-ABC123.js'), servesUri('/main-ABC123.js'));
for (const { prefix } of site.locales.filter((l) => l.prefix)) {
  expect(`${prefix} sans barre`, event(prefix, { query: 'a=1' }), goesTo(`${prefix}/?a=1`));
  expect(`${prefix}/`, event(`${prefix}/`), servesUri(`${prefix}/index.html`));
}

// Redirections : chaque règle, avec une query string encodée qui doit rester identique.
const sample = (pattern) => pattern.replace(/:([a-z]+)/g, 'x-$1');
const renameOf = (path) => {
  for (const [from, to] of RENAMES) {
    if (path === from || path.startsWith(from + '/')) return to + path.slice(from.length);
  }
  return path;
};
const toRegExp = (from) =>
  new RegExp('^' + from.replace(/\/$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:([a-z]+)/g, '([^/]+)') + '/?$');
REDIRECTS.forEach(([from], i) => {
  const earlier = REDIRECTS.slice(0, i).find(([prev]) => toRegExp(prev).test(sample(from)));
  if (earlier) failures.push(`redirection ${from} : masquée par « ${earlier[0]} » placée avant (règles précises d'abord)`);
});
for (const [from, to] of REDIRECTS) {
  const target = renameOf(sample(to).split('?')[0]);
  const [, targetQuery] = to.split('?');
  const queries = [targetQuery, 'utm_source=a%20b'].filter(Boolean).join('&');
  expect(`redirection ${from}`, event(sample(from), { query: 'utm_source=a%20b' }), goesTo(`${target}?${queries}`));
}
for (const [from, to] of RENAMES) {
  const [path, query] = to.split('?');
  expect(`renommage ${from}`, event(from), goesTo(query ? `${path}?${query}` : path));
  for (const { prefix } of site.locales.filter((l) => l.prefix)) {
    expect(`renommage ${prefix}${from}`, event(prefix + from, { query: 'q=%C3%A9' }), goesTo(`${prefix}${path}?${[query, 'q=%C3%A9'].filter(Boolean).join('&')}`));
  }
}

// Admin
if (site.adminSpa) {
  expect('admin', event('/admin/produits'), servesUri('/index.csr.html'));
  for (const { prefix } of site.locales.filter((l) => l.prefix)) {
    expect(`admin ${prefix}`, event(`${prefix}/admin`), goesTo('/admin'));
  }
}

// Anti-hotlinking
if (site.protectedImagesPrefix) {
  const img = `${site.protectedImagesPrefix}x/1.webp`;
  expect('photo sans Referer', event(img), servesUri(img));
  expect('photo depuis un autre site', event(img, { referer: 'https://copieur.example/page' }), is(403));
  expect('photo depuis Google', event(img, { referer: 'https://www.google.com/' }), servesUri(img));
  for (const host of site.imageHosts ?? []) {
    expect(`photo depuis ${host}`, event(img, { referer: `https://${host}/produit/x` }), servesUri(img));
  }
}

// Domaine canonique
if (site.canonicalHost) {
  expect('domaine technique', event('/a?b=1', { host: 'd111111abcdef8.cloudfront.net' }), goesTo(`https://${site.canonicalHost}/a?b=1`));
}

if (failures.length) {
  console.error(`check-cloudfront-function : ${failures.length} échec(s) sur ${checks} contrôles\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`check-cloudfront-function : ${checks} contrôles OK (${(Buffer.byteLength(code) / 1024).toFixed(1)} Ko)`);
