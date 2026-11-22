import { IMAGE_LOADER, ImageLoaderConfig } from '@angular/common';
import { Provider } from '@angular/core';

/**
 * Largeurs générées au build (scripts/sync-data.mjs : nom-240.webp … nom-1440.webp).
 * Garder en phase avec WIDTHS du script.
 */
export const IMAGE_WIDTHS = [240, 360, 640, 960, 1440] as const;

const variant = (src: string, width: number): string =>
  `${src.slice(0, -'.webp'.length)}-${width}.webp`;

/** Plus grande variante (Open Graph, JSON-LD). */
export function largestImage(src: string): string {
  return src.startsWith('/images/') && src.endsWith('.webp') ? variant(src, IMAGE_WIDTHS.at(-1)!) : src;
}

/**
 * NgOptimizedImage : choisit la plus petite variante WebP couvrant la largeur demandée.
 * SVG et images externes servis tels quels. Toujours donner `sizes` = taille réellement affichée.
 */
export function localImageLoader(config: ImageLoaderConfig): string {
  const { src, width } = config;
  if (!src.startsWith('/images/') || !src.endsWith('.webp')) return src;
  if (!width) return largestImage(src);
  return variant(src, IMAGE_WIDTHS.find((w) => w >= width) ?? IMAGE_WIDTHS.at(-1)!);
}

export function provideLocalImageLoader(): Provider {
  return { provide: IMAGE_LOADER, useValue: localImageLoader };
}
