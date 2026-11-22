/**
 * Catégories dont les produits ne se commandent PAS sur WhatsApp (produits frais, sur devis…) :
 * pas de bouton « Ajouter », retirés d'un panier restauré, contact par email (mailto:) à la place.
 * Seul endroit du code où ces slugs sont écrits ; les sous-catégories héritent de la règle.
 */
export const EMAIL_ONLY_CATEGORY_SLUGS: readonly string[] = [];

interface CategoryRef {
  slug: string;
  parent: string | null;
}

/** Slugs concernés : ceux de la liste et toutes leurs descendantes. */
export function emailOnlyCategorySlugs(
  categories: readonly CategoryRef[],
  roots: readonly string[] = EMAIL_ONLY_CATEGORY_SLUGS,
): Set<string> {
  const result = new Set(roots);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of categories) {
      if (c.parent && result.has(c.parent) && !result.has(c.slug)) {
        result.add(c.slug);
        grew = true;
      }
    }
  }
  return result;
}
