import { LOCALE_ID, inject } from '@angular/core';

/**
 * Langues du site. Chaque langue est un build séparé (i18n compilée d'Angular, `localize: true`) :
 * la langue par défaut est servie à la racine, les autres sous /<code>/. Les slugs sont identiques.
 * Ajouter une langue : ici, dans angular.json (i18n.locales + baseHref) et dans site.config.mjs.
 */
export type SiteLocale = 'fr' | 'en';

export const SITE_LOCALES: readonly SiteLocale[] = ['fr'];
export const DEFAULT_LOCALE: SiteLocale = 'fr';

/** Préfixe d'URL de chaque langue (la langue par défaut n'en a pas). */
const PREFIX: Record<SiteLocale, string> = { fr: '', en: '/en' };

/** Codes Open Graph (pays du public visé). */
export const OG_LOCALE: Record<SiteLocale, string> = { fr: '{{OG_LOCALE}}', en: 'en_GB' };

export function toSiteLocale(localeId: string): SiteLocale {
  return localeId.toLowerCase().startsWith('en') ? 'en' : 'fr';
}

/** Langue du build courant (LOCALE_ID est fixé par `ng build --localize`). */
export function injectSiteLocale(): SiteLocale {
  return toSiteLocale(inject(LOCALE_ID));
}

/** Chemin d'application (« /produit/x?y=1 ») -> chemin depuis la racine du domaine (« /en/produit/x?y=1 »). */
export function localizedPath(path: string, locale: SiteLocale): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return PREFIX[locale] + normalized;
}
