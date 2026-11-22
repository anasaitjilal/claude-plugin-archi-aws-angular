// Garde-fou des données avant chaque build (CI et déploiement) :
//   - chaque data/**/*.json se lit ;
//   - les chemins d'images référencés (« images/… ») existent dans data/images/ ;
//   - aucun placeholder {{…}} ni « TODO » dans les données publiées ;
//   - règles métier du projet : à ajouter dans checkProject() (ou un schéma zod partagé
//     shared/catalog-schema.ts, réutilisé par l'admin : voir le skill json-catalog-data).
// Erreur = build arrêté. Avertissement = affiché seulement (ex. produit masqué sans photo).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const DATA = join(ROOT, 'data');
const errors = [];
const warnings = [];

const walk = (dir) =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
      )
    : [];

const files = new Map();
for (const file of walk(DATA).filter((f) => f.endsWith('.json'))) {
  const rel = relative(DATA, file).replaceAll('\\', '/');
  if (/^(raw|fixtures)\//.test(rel)) continue;
  const raw = readFileSync(file, 'utf8');
  if (/\{\{[A-Z_]+\}\}|\bTODO\b/.test(raw)) errors.push(`${rel} : placeholder ou TODO restant`);
  try {
    files.set(rel, JSON.parse(raw));
  } catch (e) {
    errors.push(`${rel} : JSON invalide (${e.message})`);
  }
}

/** Parcourt toutes les valeurs « images/… » et vérifie le fichier source. */
const visit = (value, rel) => {
  if (typeof value === 'string' && /^images\/.+\.(jpe?g|png|webp|svg)$/i.test(value)) {
    if (!existsSync(join(DATA, value))) errors.push(`${rel} : image absente ${value}`);
  } else if (Array.isArray(value)) value.forEach((v) => visit(v, rel));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => visit(v, rel));
};
for (const [rel, data] of files) visit(data, rel);

/** Règles propres au projet (unicité des slugs, catégories existantes, photo obligatoire si visible…). */
function checkProject(data) {
  const products = data.get('products.json');
  if (!Array.isArray(products)) return;
  const slugs = new Set();
  for (const p of products) {
    if (slugs.has(p.slug)) errors.push(`products.json : slug en double ${p.slug}`);
    slugs.add(p.slug);
    if (!p.images?.length) (p.visible === false ? warnings : errors).push(`products.json : ${p.slug} sans photo`);
  }
}
checkProject(files);

for (const w of warnings) console.warn(`avertissement : ${w}`);
if (errors.length) {
  console.error(`validate-data : ${errors.length} erreur(s)\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`validate-data : ${files.size} fichier(s) JSON OK`);
