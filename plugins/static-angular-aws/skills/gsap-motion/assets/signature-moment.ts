import { Component } from '@angular/core';
import { gsap, useGsap } from '../../../core/animation/use-gsap';

/**
 * Le « seul moment fort » de la page, sous la ligne de flottaison, chargé par @defer (on viewport).
 * - transform/opacity seulement ; scrub léger, pas d'épinglage lourd sur mobile ;
 * - mouvement réduit : rien n'est animé, l'état final est affiché tel quel (CSS par défaut).
 */
@Component({
  selector: 'app-signature-moment',
  template: `
    <section class="moment" aria-labelledby="moment-title">
      <h2 id="moment-title" i18n="@@home.moment.title">{{MOMENT_TITLE}}</h2>
      <ol class="moment__steps">
        <li class="moment__step" i18n="@@home.moment.step1">Étape 1</li>
        <li class="moment__step" i18n="@@home.moment.step2">Étape 2</li>
        <li class="moment__step" i18n="@@home.moment.step3">Étape 3</li>
      </ol>
    </section>
  `,
  styles: `
    .moment { max-width: var(--max-width); margin-inline: auto; padding: var(--space-8) var(--gutter); }
    .moment__steps { display: grid; gap: var(--space-4); list-style: none; padding: 0; }
    @media (min-width: 768px) { .moment__steps { grid-template-columns: repeat(3, 1fr); } }
    .moment__step { padding: var(--space-5); background: var(--color-surface); border-radius: var(--radius-md); }
  `,
})
export class SignatureMoment {
  constructor() {
    useGsap(({ motionOk, isDesktop }, scope) => {
      if (!motionOk) return;
      const steps = scope.querySelectorAll<HTMLElement>('.moment__step');
      gsap.from(steps, {
        y: isDesktop ? 24 : 12,
        opacity: 0,
        duration: 0.5,
        ease: 'power2.out',
        stagger: 0.12,
        scrollTrigger: { trigger: scope, start: 'top 75%', once: true },
      });
    });
  }
}
