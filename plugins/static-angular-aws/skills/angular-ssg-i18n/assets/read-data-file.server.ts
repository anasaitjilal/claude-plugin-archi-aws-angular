import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const cache = new Map<string, unknown>();

/**
 * Lit un JSON de public/data depuis le disque (build et prérendu uniquement).
 * Le build est lancé depuis web/, d'où le chemin relatif au répertoire courant.
 */
export function readDataFile(fileName: string): unknown {
  // « products.json » ou une traduction « i18n/en/products.json » ; rien d'autre (pas de « .. »).
  if (!/^(i18n\/[a-z]{2}\/)?[a-z0-9-]+\.json$/.test(fileName)) {
    throw new Error(`Fichier de données invalide : ${fileName}`);
  }
  if (!cache.has(fileName)) {
    cache.set(
      fileName,
      JSON.parse(
        readFileSync(join(process.cwd(), 'public', 'data', ...fileName.split('/')), 'utf8'),
      ),
    );
  }
  return cache.get(fileName);
}
