// Contenu de robots.txt (généré par scripts/postbuild.mjs). Voir docs/anti-scraping.md.
//
// Un robot suit le groupe le plus précis qui le nomme et ignore « * » : les robots autorisés sont donc
// listés DANS le groupe « * », pour recevoir les mêmes Disallow (/admin, /commande).

/**
 * Robots d'entraînement d'IA : tout le site interdit. Google-Extended et Applebot-Extended ne visitent
 * pas le site : ce sont des réglages lus par Googlebot et Applebot (sans effet sur la recherche).
 * Noms vérifiés en novembre 2026.
 */
export const AI_TRAINING_BOTS = [
  'GPTBot', // OpenAI
  'ClaudeBot', // Anthropic
  'CCBot', // Common Crawl
  'Google-Extended', // Gemini (réglage, pas un robot)
  'Applebot-Extended', // Apple Intelligence (réglage, pas un robot)
  'Bytespider', // ByteDance (ignore souvent robots.txt : aussi bloqué par la fonction CloudFront)
  'meta-externalagent', // Meta
  'Amazonbot', // Amazon
  'MistralAI-Training', // Mistral
  'AI2Bot', // Allen Institute for AI
];

/** Moteurs de recherche et robots de recherche IA (citations, liens) : autorisés, explicitement. */
export const SEARCH_BOTS = [
  'Googlebot',
  'bingbot',
  'DuckDuckBot',
  'Applebot',
  'YandexBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'meta-webindexer',
  'Amzn-SearchBot',
  'DuckAssistBot',
  'MistralAI-Index',
  'MistralAI-User',
];

/**
 * @param {string} siteUrl URL publique sans barre finale.
 * @param {string[]} localePrefixes préfixes d'URL des langues ('' pour le français, '/en'…).
 */
export function robotsTxt(siteUrl, localePrefixes, privatePaths = []) {
  return [
    '# Robots d\'entraînement d\'IA : non autorisés.',
    ...AI_TRAINING_BOTS.map((b) => `User-agent: ${b}`),
    'Disallow: /',
    '',
    '# Moteurs de recherche, robots de recherche IA et tous les autres.',
    ...SEARCH_BOTS.map((b) => `User-agent: ${b}`),
    'User-agent: *',
    'Allow: /',
    ...localePrefixes.flatMap((p) => privatePaths.filter((r) => r !== '/404').map((r) => `Disallow: ${p}${r}`)),
    'Disallow: /admin',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
  ].join('\n');
}
