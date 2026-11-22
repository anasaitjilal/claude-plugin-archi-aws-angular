import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import {
  provideClientHydration,
  withEventReplay,
  withI18nSupport,
  withIncrementalHydration,
} from '@angular/platform-browser';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';
import { routes } from './app.routes';
import { dataFileInterceptor } from './core/data/data-reader';
import { provideLocalImageLoader } from './core/image/image-loader';

/** Chemin d'une route (sans query params), pour comparer deux navigations. */
function routePath(snapshot: ActivatedRouteSnapshot): string {
  const segments: string[] = [];
  for (let s: ActivatedRouteSnapshot | null = snapshot; s; s = s.firstChild) {
    segments.push(...s.url.map((u) => u.path));
  }
  return segments.join('/');
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Pendant le prérendu, /data/*.json est lu sur disque (dataFileInterceptor + DATA_FILE_READER).
    provideHttpClient(withFetch(), withInterceptors([dataFileInterceptor])),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
      withViewTransitions({
        // Simple changement de query params (filtres) : pas de transition de page.
        onViewTransitionCreated: ({ transition, from, to }) => {
          if (routePath(from) === routePath(to)) transition.skipTransition();
        },
      }),
    ),
    // withI18nSupport : sans lui, les templates traduits ne sont pas hydratés (la page « saute »).
    provideClientHydration(withEventReplay(), withIncrementalHydration(), withI18nSupport()),
    provideLocalImageLoader(),
  ],
};
