import { Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SITE_NAME, WHATSAPP_NUMBER } from '../../../core/config/site';
import { buildWhatsappUrl } from '../../../core/order/whatsapp-message';

/**
 * Hero sobre : compris en 3 secondes (qui, quoi, que faire), immobile au premier affichage.
 * - Aucune animation d'entrée, aucune vidéo au chargement : le titre (ou l'image) est l'élément LCP.
 * - Image éventuelle : <img ngSrc ... priority fetchpriority="high" sizes="100vw"> en version mobile légère.
 * - Deux actions au plus ; repères de confiance tirés des données (jamais inventés).
 */
@Component({
  selector: 'app-home-hero',
  imports: [RouterLink],
  template: `
    <section class="hero" aria-labelledby="hero-title">
      <p class="hero__eyebrow">{{ siteName }}</p>
      <h1 id="hero-title" class="hero__title" i18n="@@home.hero.title">{{HERO_TITLE}}</h1>
      <p class="hero__lead" i18n="@@home.hero.lead">{{HERO_LEAD}}</p>
      <div class="hero__actions">
        <a class="button button--primary" routerLink="/" fragment="offre" i18n="@@home.hero.cta">Voir l'offre</a>
        @if (whatsappUrl(); as url) {
          <a class="button button--whatsapp" [href]="url" target="_blank" rel="noopener" i18n="@@home.hero.whatsapp">
            Écrire sur WhatsApp
          </a>
        }
      </div>
    </section>
  `,
  styleUrl: './home-hero.scss',
})
export class HomeHero {
  protected readonly siteName = SITE_NAME;
  protected readonly whatsappUrl = computed(() =>
    WHATSAPP_NUMBER ? buildWhatsappUrl(WHATSAPP_NUMBER, `Bonjour ${SITE_NAME},`) : null,
  );
}
