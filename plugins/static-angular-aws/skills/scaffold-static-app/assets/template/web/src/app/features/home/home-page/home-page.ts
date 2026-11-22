import { Component, inject } from '@angular/core';
import { SITE_NAME, SITE_URL } from '../../../core/config/site';
import { Seo } from '../../../core/seo/seo';
import { HomeHero } from '../home-hero/home-hero';
import { SignatureMoment } from '../signature-moment/signature-moment';

@Component({
  selector: 'app-home-page',
  imports: [HomeHero, SignatureMoment],
  template: `
    <app-home-hero />
    <!-- Sous la ligne de flottaison : chargé et hydraté seulement à l'approche. -->
    @defer (on viewport; hydrate on viewport) {
      <app-signature-moment />
    } @placeholder {
      <div class="moment-placeholder"></div>
    }
  `,
  styles: `.moment-placeholder { min-height: 60vh; }`,
})
export class HomePage {
  constructor() {
    inject(Seo).set({
      title: SITE_NAME,
      description: $localize`:@@home.meta.description:{{SITE_DESCRIPTION}}`,
      path: '/',
      jsonLd: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL + '/' },
    });
  }
}
