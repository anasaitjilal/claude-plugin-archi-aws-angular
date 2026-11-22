import { DestroyRef, ElementRef, afterNextRender, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { filter } from 'rxjs';

let registered = false;

/** Enregistre les plugins GSAP une seule fois, côté navigateur uniquement. */
function registerPlugins(): void {
  if (registered) return;
  gsap.registerPlugin(ScrollTrigger);
  registered = true;
}

export interface GsapConditions {
  /** Vrai si l'utilisateur n'a pas demandé de réduire les animations. */
  motionOk: boolean;
  /** Vrai si prefers-reduced-motion: reduce est actif : afficher l'état final, sans mouvement. */
  reduceMotion: boolean;
  /** Vrai si l'écran fait au moins 768 px de large. */
  isDesktop: boolean;
}

/**
 * Crée des animations GSAP scoppées à l'élément hôte du composant appelant :
 * - exécution dans afterNextRender (jamais au constructeur ni pendant le prérendu) ;
 * - gsap.matchMedia() scoppé à l'hôte, avec une branche mouvement et une branche
 *   « mouvement réduit » (état final statique) ; la fonction est rejouée si une condition change ;
 * - ScrollTrigger.refresh() après chaque navigation du routeur ;
 * - revert() automatique à la destruction du composant.
 *
 * La fonction `setup` peut retourner une fonction de nettoyage.
 * À appeler dans un contexte d'injection (constructeur ou initialiseur de champ).
 */
export function useGsap(
  setup: (conditions: GsapConditions, scope: HTMLElement) => void | (() => void),
): void {
  const host = inject<ElementRef<HTMLElement>>(ElementRef);
  const destroyRef = inject(DestroyRef);
  const router = inject(Router);
  let mm: gsap.MatchMedia | null = null;

  afterNextRender(() => {
    registerPlugins();
    mm = gsap.matchMedia(host.nativeElement);
    mm.add(
      {
        motionOk: '(prefers-reduced-motion: no-preference)',
        reduceMotion: '(prefers-reduced-motion: reduce)',
        isDesktop: '(min-width: 768px)',
      },
      (context) => {
        const {
          motionOk = false,
          reduceMotion = false,
          isDesktop = false,
        } = context.conditions ?? {};
        return setup({ motionOk, reduceMotion, isDesktop }, host.nativeElement);
      },
    );
  });

  const sub = router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
    if (registered) requestAnimationFrame(() => ScrollTrigger.refresh());
  });

  destroyRef.onDestroy(() => {
    sub.unsubscribe();
    mm?.revert();
  });
}

export { prefersReducedMotion } from './motion';

export { gsap, ScrollTrigger };
