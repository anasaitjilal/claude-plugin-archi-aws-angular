import type { gsap as Gsap } from 'gsap';

/** Vrai si l'utilisateur préfère réduire les animations (faux côté serveur). */
export function prefersReducedMotion(): boolean {
  return typeof matchMedia !== 'function' || matchMedia('(prefers-reduced-motion: reduce)').matches;
}

let gsapPromise: Promise<typeof Gsap> | null = null;

/**
 * Micro-animations déclenchées par l'utilisateur (compteur, tiroir, menu, galerie).
 * GSAP est chargé à la première utilisation : il ne pèse pas sur le bundle initial.
 * Rien ne se passe côté serveur ni en mouvement réduit.
 */
export function withGsap(run: (gsap: typeof Gsap) => void): void {
  if (prefersReducedMotion()) return;
  gsapPromise ??= import('gsap').then((m) => m.gsap);
  void gsapPromise.then(run);
}

/** Variante qui exécute `fallback` immédiatement si l'animation est impossible. */
export function withGsapOr(run: (gsap: typeof Gsap) => void, fallback: () => void): void {
  if (prefersReducedMotion()) {
    fallback();
    return;
  }
  withGsap(run);
}
