import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { SITE_NAME } from './core/config/site';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  template: `
    <a class="skip-link" href="#contenu" i18n="@@layout.skip">Aller au contenu</a>
    <header class="site-header">
      <a class="brand" routerLink="/">{{ siteName }}</a>
    </header>
    <main id="contenu" tabindex="-1">
      <router-outlet />
    </main>
    <footer class="site-footer">
      <p>© {{ siteName }}</p>
    </footer>
  `,
  styles: `
    :host { display: flex; flex-direction: column; min-height: 100dvh; }
    main { flex: 1; }
    .site-header, .site-footer {
      padding: var(--space-4) var(--gutter);
      max-width: var(--max-width);
      margin-inline: auto;
      width: 100%;
    }
    .brand { font-weight: 700; text-decoration: none; color: var(--color-ink); }
    .skip-link { position: absolute; left: -9999px; }
    .skip-link:focus { left: var(--space-3); top: var(--space-3); z-index: 10; }
  `,
})
export class App {
  protected readonly siteName = SITE_NAME;
}
