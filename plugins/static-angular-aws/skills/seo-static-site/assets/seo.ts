import { DOCUMENT, Service, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { SITE_NAME, SITE_URL } from '../config/site';
import {
  DEFAULT_LOCALE,
  OG_LOCALE,
  SITE_LOCALES,
  injectSiteLocale,
  localizedPath,
} from '../i18n/locale';

export interface SeoData {
  title: string;
  description?: string | null;
  /** Chemin sans préfixe de langue, ex. /produit/x */
  path: string;
  /** Chemin absolu depuis la racine du domaine, ex. /images/site/og/accueil.jpg (1200 × 630). */
  image?: string | null;
  type?: 'website' | 'product' | 'article';
  jsonLd?: Record<string, unknown> | null;
  breadcrumbs?: { name: string; path: string }[];
  /** Page privée ou utilitaire (panier, 404) : noindex, pas de hreflang, hors sitemap. */
  noindex?: boolean;
}

const JSON_LD_ID = 'app-json-ld';
const DEFAULT_IMAGE = '/images/site/og/defaut.jpg';

/**
 * Title, description, Open Graph, Twitter, canonical, hreflang (+ x-default) et JSON-LD de chaque page.
 * Appelé une fois par page, dans le constructeur ou un effect quand les données arrivent :
 * le prérendu écrit les balises dans le HTML statique.
 */
@Service()
export class Seo {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly locale = injectSiteLocale();

  set(data: SeoData): void {
    const fullTitle = data.title === SITE_NAME ? SITE_NAME : `${data.title} · ${SITE_NAME}`;
    const absolute = (path: string) => SITE_URL + localizedPath(path, this.locale);
    const url = absolute(data.path);
    const image = SITE_URL + (data.image ?? DEFAULT_IMAGE);

    this.title.setTitle(fullTitle);
    this.upsert('name', 'description', data.description ?? null);
    this.upsert('name', 'robots', data.noindex ? 'noindex, follow' : null);
    this.upsert('property', 'og:title', fullTitle);
    this.upsert('property', 'og:description', data.description ?? null);
    this.upsert('property', 'og:type', data.type ?? 'website');
    this.upsert('property', 'og:url', url);
    this.upsert('property', 'og:image', image);
    this.upsert('property', 'og:site_name', SITE_NAME);
    this.upsert('property', 'og:locale', OG_LOCALE[this.locale]);
    this.upsert('name', 'twitter:card', 'summary_large_image');
    this.upsert('name', 'twitter:title', fullTitle);
    this.upsert('name', 'twitter:description', data.description ?? null);
    this.upsert('name', 'twitter:image', image);
    this.setCanonical(url);
    this.setAlternates(data.noindex ? null : data.path);

    const graph = [
      ...(data.jsonLd ? [data.jsonLd] : []),
      ...(data.breadcrumbs?.length
        ? [
            {
              '@type': 'BreadcrumbList',
              itemListElement: data.breadcrumbs.map((b, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                name: b.name,
                item: absolute(b.path),
              })),
            },
          ]
        : []),
    ];
    this.setJsonLd(graph.length ? { '@graph': graph } : null);
  }

  private upsert(attr: 'name' | 'property', key: string, content: string | null): void {
    const selector = `${attr}="${key}"`;
    if (content) this.meta.updateTag({ [attr]: key, content }, selector);
    else this.meta.removeTag(selector);
  }

  private setCanonical(url: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  /** Une balise par langue + x-default (langue par défaut). Rien pour une page non indexable. */
  private setAlternates(path: string | null): void {
    for (const link of this.document.head.querySelectorAll('link[rel="alternate"][hreflang]')) {
      link.remove();
    }
    if (path === null || SITE_LOCALES.length < 2) return;
    const entries: [string, string][] = [
      ...SITE_LOCALES.map((l): [string, string] => [l, localizedPath(path, l)]),
      ['x-default', localizedPath(path, DEFAULT_LOCALE)],
    ];
    for (const [hreflang, href] of entries) {
      const link = this.document.createElement('link');
      link.setAttribute('rel', 'alternate');
      link.setAttribute('hreflang', hreflang);
      link.setAttribute('href', SITE_URL + href);
      this.document.head.appendChild(link);
    }
  }

  private setJsonLd(data: Record<string, unknown> | null): void {
    this.document.getElementById(JSON_LD_ID)?.remove();
    if (!data) return;
    const script = this.document.createElement('script');
    script.id = JSON_LD_ID;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({ '@context': 'https://schema.org', ...data });
    this.document.head.appendChild(script);
  }
}
