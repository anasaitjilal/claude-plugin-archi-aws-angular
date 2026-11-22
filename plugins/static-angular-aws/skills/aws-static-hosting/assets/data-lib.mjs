// Fonctions communes aux scripts de données (fetch-data, migrate-to-s3, sync-changed) :
// chemins, appels à la CLI AWS et chargement du schéma partagé (shared/, écrit en TypeScript).
import { execFile, execFileSync } from 'node:child_process';
import { register } from 'node:module';
import { join } from 'node:path';
import { promisify } from 'node:util';

export const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
export const DATA = join(ROOT, 'data');

/** Bucket de données (infra/data/). Surchargé par DATA_BUCKET ou --bucket. */
export const DEFAULT_DATA_BUCKET = process.env.DATA_BUCKET ?? '{{DATA_BUCKET}}';
export const DEFAULT_REGION = process.env.AWS_REGION ?? '{{AWS_REGION}}';
export const KEYS = { draft: 'draft/catalog.json', live: 'live/catalog.json' };

/** shared/ utilise des imports relatifs sans extension : voir ts-extension-hook.mjs. */
let registered = false;
export async function loadShared(name) {
  if (!registered) register('./ts-extension-hook.mjs', import.meta.url);
  registered = true;
  return import(`../shared/${name}.ts`);
}

/** Arguments `--nom valeur` et `--drapeau` ; le reste dans `_`. Une option répétée donne un tableau. */
export function parseArgs(argv, flags = []) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) out._.push(a);
    else if (flags.includes(a.slice(2))) out[a.slice(2)] = true;
    else {
      const key = a.slice(2);
      const value = argv[++i];
      out[key] = key in out ? [out[key], value].flat() : value;
    }
  }
  return out;
}

const run = promisify(execFile);
const MAX = 256 * 1024 * 1024;

/** Lance `aws …` et renvoie sa sortie texte. Les identifiants viennent de l'environnement (profil ou OIDC). */
export function aws(args, options = {}) {
  return execFileSync('aws', args, { encoding: 'utf8', maxBuffer: MAX, stdio: ['ignore', 'pipe', 'pipe'], ...options });
}

export async function awsAsync(args) {
  const { stdout } = await run('aws', args, { encoding: 'utf8', maxBuffer: MAX });
  return stdout;
}

export const awsJson = (args) => {
  const out = aws([...args, '--output', 'json']).trim();
  return out ? JSON.parse(out) : null;
};

/** Exécute `fn` sur chaque élément, `limit` à la fois. */
export async function pool(items, limit, fn) {
  let next = 0;
  const results = new Array(items.length);
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i], i);
      }
    }),
  );
  return results;
}

/** Ajoute des lignes Markdown au résumé du run GitHub Actions (sans effet en local). */
export async function stepSummary(lines) {
  if (!process.env.GITHUB_STEP_SUMMARY) return;
  const { appendFileSync } = await import('node:fs');
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`);
}

export async function stepOutput(values) {
  if (!process.env.GITHUB_OUTPUT) return;
  const { appendFileSync } = await import('node:fs');
  appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(values).map(([k, v]) => `${k}=${v}\n`).join(''));
}
