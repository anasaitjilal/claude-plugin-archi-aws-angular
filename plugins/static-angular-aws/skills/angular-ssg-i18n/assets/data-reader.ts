import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { InjectionToken, inject } from '@angular/core';
import { of, throwError } from 'rxjs';

/** Lit un fichier JSON de public/data. Fourni uniquement côté serveur (prérendu). */
export type DataFileReader = (fileName: string) => unknown;

export const DATA_FILE_READER = new InjectionToken<DataFileReader>('DATA_FILE_READER');

const DATA_PREFIX = '/data/';

/**
 * Pendant le prérendu, les requêtes vers /data/*.json sont servies depuis le disque :
 * aucun serveur HTTP n'existe au moment du build statique.
 * Le cache de transfert d'hydratation réutilise ensuite ces réponses côté navigateur.
 * Un fichier absent (data/version.json d'un build sur les données du dépôt) donne une 404, comme
 * dans le navigateur, et non une erreur de prérendu.
 */
export const dataFileInterceptor: HttpInterceptorFn = (req, next) => {
  const reader = inject(DATA_FILE_READER, { optional: true });
  if (!reader || req.method !== 'GET' || !req.url.startsWith(DATA_PREFIX)) {
    return next(req);
  }
  let body: unknown;
  try {
    body = reader(req.url.slice(DATA_PREFIX.length));
  } catch {
    return throwError(
      () => new HttpErrorResponse({ status: 404, statusText: 'Not Found', url: req.url }),
    );
  }
  return of(new HttpResponse({ status: 200, url: req.url, body }));
};
