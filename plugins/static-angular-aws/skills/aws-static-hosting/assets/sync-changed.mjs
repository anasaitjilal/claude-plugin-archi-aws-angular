// Envoie vers S3 uniquement les documents du build dont le contenu a changé (docs/data-s3.md §7).
//
//   node scripts/sync-changed.mjs <dossier> <bucket> [--prefix en/] [--exclude-prefix en/]... [--dry-run]
//
// Documents : *.html, *.json, *.xml, *.txt et _redirects (les fichiers toujours revalidés,
// Cache-Control: no-cache). Les JS/CSS hashés, les images et le reste restent gérés par deploy-s3.sh.
// Comparaison : MD5 du fichier local contre l'ETag S3 (égal au MD5 pour un objet envoyé en une seule
// partie, ce qui est le cas de tous ces fichiers). Les documents présents sur S3 mais absents du
// build sont supprimés, comme le faisait `aws s3 sync --delete`.
// --exclude-prefix (répétable) protège un sous-dossier : en/ pendant la synchronisation du français,
// data/ toujours (données publiées par l'admin, docs/data-s3.md §14).
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { aws, awsJson, parseArgs, stepOutput } from './data-lib.mjs';

const DOC = /(\.(html|json|xml|txt)|(^|\/)_redirects)$/;
export const isDocument = (key) => DOC.test(key);

/**
 * Compare les documents locaux (clé → MD5) aux objets distants (clé → ETag).
 * Renvoie les clés à envoyer, inchangées et à supprimer.
 */
export function plan(local, remote) {
  const upload = [];
  const unchanged = [];
  for (const [key, md5] of local) (remote.get(key) === md5 ? unchanged : upload).push(key);
  const remove = [...remote.keys()].filter((key) => !local.has(key));
  return { upload: upload.sort(), unchanged: unchanged.sort(), remove: remove.sort() };
}

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));

/** Documents du dossier de build : clé S3 (avec préfixe) → MD5. */
const excluded = (key, excludes) => [excludes ?? []].flat().some((p) => key.startsWith(p));

/** `excludes` : préfixe ou liste de préfixes à ignorer (ni envoyés, ni supprimés). */
export function localDocuments(dir, prefix = '', excludes = null) {
  const out = new Map();
  for (const file of walk(dir)) {
    const key = prefix + relative(dir, file).split(sep).join('/');
    if (!isDocument(key) || excluded(key, excludes)) continue;
    out.set(key, createHash('md5').update(readFileSync(file)).digest('hex'));
  }
  return out;
}

function remoteDocuments(bucket, prefix, excludes) {
  const rows =
    awsJson(['s3api', 'list-objects-v2', '--bucket', bucket, ...(prefix ? ['--prefix', prefix] : []), '--query', 'Contents[].[Key,ETag]']) ?? [];
  const out = new Map();
  for (const [key, etag] of rows) {
    if (!isDocument(key) || excluded(key, excludes)) continue;
    out.set(key, String(etag).replace(/"/g, ''));
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2), ['dry-run']);
  const [dir, bucket] = args._;
  if (!dir || !bucket) {
    console.error('Usage : node scripts/sync-changed.mjs <dossier> <bucket> [--prefix en/] [--exclude-prefix en/]... [--dry-run]');
    process.exit(1);
  }
  const prefix = args.prefix ?? '';
  const exclude = args['exclude-prefix'] ?? null;
  const local = localDocuments(dir, prefix, exclude);
  const remote = remoteDocuments(bucket, prefix, exclude);
  const { upload, unchanged, remove } = plan(local, remote);
  const label = prefix || '(racine)';

  if (args['dry-run']) {
    for (const key of upload) console.log(`à envoyer   ${key}`);
    for (const key of remove) console.log(`à supprimer ${key}`);
  } else {
    if (upload.length) {
      // Les fichiers modifiés sont copiés dans un dossier temporaire, puis envoyés en une seule
      // commande (transferts parallèles de la CLI) avec le bon Cache-Control.
      const tmp = mkdtempSync(join(tmpdir(), 'sync-changed-'));
      try {
        for (const key of upload) {
          const rel = key.slice(prefix.length);
          const target = join(tmp, rel);
          mkdirSync(dirname(target), { recursive: true });
          cpSync(join(dir, rel), target);
        }
        aws(['s3', 'cp', tmp, `s3://${bucket}/${prefix}`, '--recursive', '--cache-control', 'no-cache', '--only-show-errors', '--no-progress'], {
          stdio: ['ignore', 'inherit', 'inherit'],
        });
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    }
    for (let i = 0; i < remove.length; i += 1000) {
      const tmp = mkdtempSync(join(tmpdir(), 'sync-delete-'));
      const file = join(tmp, 'delete.json');
      try {
        writeFileSync(file, JSON.stringify({ Objects: remove.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true }));
        aws(['s3api', 'delete-objects', '--bucket', bucket, '--delete', `file://${file}`]);
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    }
  }
  console.log(
    `sync-changed ${label} : ${upload.length} document(s) envoyé(s), ${unchanged.length} inchangé(s), ${remove.length} supprimé(s)${args['dry-run'] ? ' (simulation)' : ''}`,
  );
  const suffix = prefix ? `_${prefix.replace(/[^a-z0-9]/gi, '')}` : '';
  await stepOutput({ [`uploaded${suffix}`]: upload.length, [`unchanged${suffix}`]: unchanged.length, [`removed${suffix}`]: remove.length });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
