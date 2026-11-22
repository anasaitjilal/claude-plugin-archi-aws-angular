// Génère infra/cloudfront/viewer-request.js (CloudFront Function, runtime cloudfront-js-2.0)
// à partir de scripts/redirects.mjs et de site.config.mjs. Ne jamais modifier le fichier généré.
//   node scripts/build-cloudfront-function.mjs
//   node scripts/check-cloudfront-function.mjs     (vérifie User-Agents, redirections, index.html)
//
// Ordre des règles dans la fonction :
// 0. 403 aux outils de scraping (User-Agent vide ou bloqué), liste autorisée prioritaire.
// 1. Domaine technique *.cloudfront.net -> 301 vers canonicalHost (si renseigné, après la bascule DNS).
// 2. Photos protégées (protectedImagesPrefix) : anti-hotlinking par Referer, puis aucune autre règle.
// 3. Espace admin (adminSpa) : /<langue>/admin* -> 301 /admin* ; /admin* -> /index.csr.html.
// 4. REDIRECTS (query string conservée, sans réencodage), puis RENAMES (FR et autres langues).
// 5. /en -> /en/ pour chaque langue préfixée ; ajout de index.html aux URLs de pages.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { REDIRECTS, RENAMES } from './redirects.mjs';
import site from '../site.config.mjs';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const OUT = join(ROOT, 'infra', 'cloudfront', 'viewer-request.js');

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const prefixes = site.locales.map((l) => l.prefix).filter(Boolean);
const localeGroup = prefixes.length ? `(${prefixes.map(escape).join('|')})?` : '()?';

// [motif, cible] ; `:nom` -> groupe capturé, réinjecté par $1, $2…
const rules = REDIRECTS.map(([from, to]) => {
  const names = [];
  const pattern =
    '^' +
    escape(from.replace(/\/$/, '')).replace(/:([a-z]+)/g, (_, name) => (names.push(name), '([^/]+)')) +
    '/?$';
  const target = to.replace(/:([a-z]+)/g, (_, name) => `$${names.indexOf(name) + 1}`);
  return [pattern, target];
});

// [motif (avec préfixe de langue facultatif), chemin cible, query string ajoutée]
const renames = RENAMES.map(([from, to]) => {
  const [path, query = ''] = to.split('?');
  return ['^' + localeGroup + escape(from) + '(/.*)?$', path, query];
});

// Robots et aperçus de liens jamais bloqués (vérifiés avant la liste noire).
const ALLOWED_AGENTS = site.allowedAgents ?? [
  'googlebot', 'bingbot', 'duckduckbot', 'applebot', 'whatsapp', 'facebookexternalhit',
  'linkedinbot', 'twitterbot', 'telegrambot', 'slackbot', 'chrome-lighthouse',
];
// Outils de scraping : 403. Un User-Agent vide est aussi refusé.
const BLOCKED_AGENTS = site.blockedAgents ?? [
  'python-requests', 'python-urllib', 'python-httpx', 'aiohttp', 'scrapy', 'curl', 'wget',
  'libwww-perl', 'go-http-client', 'java/', 'apache-httpclient', 'okhttp', 'axios', 'node-fetch',
  'headlesschrome', 'phantomjs', 'bytespider',
];
const SEARCH_ENGINES =
  '(^|\\.)(google\\.(com|co\\.[a-z]{2}|com\\.[a-z]{2}|[a-z]{2})|bing\\.com|duckduckgo\\.com|yahoo\\.com|qwant\\.com|ecosia\\.org|yandex\\.(com|ru|com\\.tr|[a-z]{2}))$';
const uaPattern = (list) => list.map((s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')).join('|');

const code = `// CloudFront Function « viewer-request » de ${site.siteName} (runtime cloudfront-js-2.0).
// FICHIER GÉNÉRÉ par scripts/build-cloudfront-function.mjs : ne pas modifier à la main.

var ALLOWED_UA = new RegExp(${JSON.stringify(uaPattern(ALLOWED_AGENTS))}, 'i');
var BLOCKED_UA = new RegExp(${JSON.stringify(uaPattern(BLOCKED_AGENTS))}, 'i');
var CANONICAL_HOST = ${JSON.stringify(site.canonicalHost ?? null)};
var IMAGES_PREFIX = ${JSON.stringify(site.protectedImagesPrefix ?? null)};
var IMAGE_HOSTS = ${JSON.stringify(site.imageHosts ?? [])};
var SEARCH_ENGINES = new RegExp(${JSON.stringify(SEARCH_ENGINES)});
var ADMIN_SPA = ${JSON.stringify(!!site.adminSpa)};
var LOCALE_PREFIXES = ${JSON.stringify(prefixes)};
var REDIRECTS = ${JSON.stringify(rules)};
var RENAMES = ${JSON.stringify(renames)};

function scraper(headers) {
  var ua = headers && headers['user-agent'] ? headers['user-agent'].value.trim() : '';
  if (!ua) return true;
  if (ALLOWED_UA.test(ua)) return false;
  return BLOCKED_UA.test(ua);
}

function forbidden() {
  return { statusCode: 403, statusDescription: 'Forbidden', headers: { 'cache-control': { value: 'no-store' } } };
}

function redirect(location) {
  return {
    statusCode: 301,
    statusDescription: 'Moved Permanently',
    headers: { location: { value: location }, 'cache-control': { value: 'public, max-age=86400' } }
  };
}

/** Referer accepté : absent, non web (application), page du site ou d'un moteur de recherche. */
function refererAllowed(headers) {
  var referer = headers && headers.referer ? headers.referer.value.toLowerCase() : '';
  if (!referer) return true;
  var sep = referer.indexOf('://');
  var scheme = sep === -1 ? '' : referer.slice(0, sep);
  if (scheme !== 'http' && scheme !== 'https') return true;
  var rest = referer.slice(sep + 3);
  var end = rest.search(/[/?#:]/);
  var host = (end === -1 ? rest : rest.slice(0, end)).replace(/[.]$/, '');
  return IMAGE_HOSTS.indexOf(host) !== -1 || SEARCH_ENGINES.test(host);
}

/** Query string d'origine, recopiée telle quelle (déjà encodée : ne pas réencoder, %20 resterait %2520). */
function queryString(querystring) {
  var parts = [];
  for (var key in querystring) {
    var entry = querystring[key];
    var values = entry.multiValue ? entry.multiValue : [entry];
    for (var j = 0; j < values.length; j++) {
      parts.push(key + (values[j].value === '' ? '' : '=' + values[j].value));
    }
  }
  return parts.length ? '?' + parts.join('&') : '';
}

/** Applique un renommage (préfixe de langue et sous-adresse conservés), ou renvoie null. */
function renamed(path, query) {
  for (var i = 0; i < RENAMES.length; i++) {
    var m = new RegExp(RENAMES[i][0]).exec(path);
    if (!m) continue;
    var target = (m[1] || '') + RENAMES[i][1];
    if (!RENAMES[i][2] && m[2] && m[2] !== '/') target += m[2];
    var params = [RENAMES[i][2], query.charAt(0) === '?' ? query.slice(1) : query].filter(function (p) {
      return p;
    });
    return target + (params.length ? '?' + params.join('&') : '');
  }
  return null;
}

function handler(event) {
  var request = event.request;
  var uri = request.uri;
  var headers = request.headers;

  if (scraper(headers)) return forbidden();

  var query = queryString(request.querystring);
  var host = headers && headers.host ? headers.host.value.toLowerCase() : '';
  if (CANONICAL_HOST && host.slice(-15) === '.cloudfront.net') {
    return redirect('https://' + CANONICAL_HOST + uri + query);
  }

  if (IMAGES_PREFIX && uri.indexOf(IMAGES_PREFIX) === 0) {
    return refererAllowed(headers) ? request : forbidden();
  }

  if (ADMIN_SPA) {
    for (var p = 0; p < LOCALE_PREFIXES.length; p++) {
      var lp = LOCALE_PREFIXES[p];
      if (uri === lp + '/admin' || uri.indexOf(lp + '/admin/') === 0) {
        return redirect(uri.slice(lp.length) + query);
      }
    }
    if (uri === '/admin' || uri.indexOf('/admin/') === 0) {
      request.uri = '/index.csr.html';
      return request;
    }
  }

  for (var i = 0; i < REDIRECTS.length; i++) {
    var re = new RegExp(REDIRECTS[i][0]);
    if (re.test(uri)) {
      var target = uri.replace(re, REDIRECTS[i][1]);
      var parts = target.split('?');
      var extra = [parts[1], query.slice(1)].filter(function (q) {
        return q;
      });
      var merged = extra.length ? '?' + extra.join('&') : '';
      return redirect(renamed(parts[0], merged) || parts[0] + merged);
    }
  }
  var moved = renamed(uri, query);
  if (moved) return redirect(moved);

  if (LOCALE_PREFIXES.indexOf(uri) !== -1) return redirect(uri + '/' + query);

  if (uri.charAt(uri.length - 1) === '/') {
    request.uri = uri + 'index.html';
  } else if (uri.lastIndexOf('.') < uri.lastIndexOf('/')) {
    request.uri = uri + '/index.html';
  }
  return request;
}
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, code);
const kb = (Buffer.byteLength(code) / 1024).toFixed(1);
console.log(
  `CloudFront Function : ${rules.length} redirections, ${renames.length} renommages, ` +
    `${BLOCKED_AGENTS.length} User-Agents bloqués, ${kb} Ko (limite 10 Ko) -> ${OUT}`,
);
if (Buffer.byteLength(code) > 10 * 1024) {
  console.error('Fonction trop grosse pour CloudFront (10 Ko) : réduire les listes ou les règles.');
  process.exit(1);
}
