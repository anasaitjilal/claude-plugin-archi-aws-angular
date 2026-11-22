// prebuild / prestart : data/ (source, versionnée) -> web/public/ (servi par le site).
//   - data/*.json et data/i18n/**.json -> web/public/data/ (copie telle quelle) ;
//   - data/images/**.{jpg,jpeg,png,webp} -> web/public/images/**-<largeur>.webp (sharp, si installé),
//     seulement pour les images nouvelles ou modifiées (manifeste SHA-1) ;
//   - data/images/**.svg et data/videos/** copiés tels quels.
// Largeurs : garder en phase avec IMAGE_WIDTHS (web/src/app/core/image/image-loader.ts).
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const DATA = join(ROOT, 'data');
const PUBLIC = join(ROOT, 'web', 'public');
const WIDTHS = [240, 360, 640, 960, 1440];
const QUALITY = 72;
const MANIFEST = join(PUBLIC, 'images', '.sync-manifest.json');

const walk = (dir) =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
      )
    : [];
const copy = (from, to) => {
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
};

// JSON (raw/ et fixtures/ exclus : brouillons de scraping et données de test)
let json = 0;
for (const file of walk(DATA).filter((f) => f.endsWith('.json'))) {
  const rel = relative(DATA, file).replaceAll('\\', '/');
  if (/^(raw|fixtures|images)\//.test(rel)) continue;
  copy(file, join(PUBLIC, 'data', rel));
  json++;
}

// Images
let sharp = null;
try {
  sharp = (await import('sharp')).default;
} catch {
  // sharp absent : les images raster ne sont pas converties (avertissement ci-dessous).
}
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
let converted = 0;
let skipped = 0;
for (const file of walk(join(DATA, 'images'))) {
  const rel = relative(join(DATA, 'images'), file).replaceAll('\\', '/');
  const ext = extname(file).toLowerCase();
  if (ext === '.svg') {
    copy(file, join(PUBLIC, 'images', rel));
    continue;
  }
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) continue;
  if (!sharp) {
    skipped++;
    continue;
  }
  const hash = createHash('sha1').update(readFileSync(file)).digest('hex');
  const base = join(PUBLIC, 'images', rel.slice(0, -ext.length));
  if (manifest[rel] === hash && existsSync(`${base}-${WIDTHS[0]}.webp`)) continue;
  mkdirSync(dirname(base), { recursive: true });
  for (const width of WIDTHS) {
    await sharp(file).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: QUALITY }).toFile(`${base}-${width}.webp`);
  }
  manifest[rel] = hash;
  converted++;
}
mkdirSync(dirname(MANIFEST), { recursive: true });
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));

for (const file of walk(join(DATA, 'videos'))) copy(file, join(PUBLIC, 'videos', relative(join(DATA, 'videos'), file)));

console.log(`sync-data : ${json} JSON, ${converted} image(s) convertie(s) en WebP ${WIDTHS.join('/')} px`);
if (skipped) console.warn(`sync-data : ${skipped} image(s) non convertie(s) : npm i -D sharp (dans web/)`);
