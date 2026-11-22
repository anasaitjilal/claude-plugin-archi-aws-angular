import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Seo } from '../../../core/seo/seo';

/** Prérendue sous /404/ puis copiée en /404.html (CloudFront : 403 et 404 -> /404.html, code 404). */
@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  template: `
    <section class="not-found">
      <h1 i18n="@@notFound.title">Page introuvable</h1>
      <p i18n="@@notFound.text">Cette adresse n'existe pas ou plus.</p>
      <a routerLink="/" i18n="@@notFound.home">Retour à l'accueil</a>
    </section>
  `,
  styles: `.not-found { max-width: var(--max-width); margin-inline: auto; padding: var(--space-8) var(--gutter); display: grid; gap: var(--space-4); }`,
})
export class NotFoundPage {
  constructor() {
    inject(Seo).set({ title: $localize`:@@notFound.meta:Page introuvable`, path: '/404', noindex: true });
  }
}
