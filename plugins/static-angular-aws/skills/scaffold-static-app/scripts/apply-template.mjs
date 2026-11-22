#!/usr/bin/env node
// Applique le gabarit static-angular-aws à un projet dont web/ vient d'être créé par `ng new`
// (voir SKILL.md du skill scaffold-static-app pour l'ordre complet des commandes).
//
//   node apply-template.mjs --target <racine du projet> --project <slug> --site-name "Nom"
//        [--domain www.exemple.ma] [--site-url https://…] [--cloudfront-domain dxxxx.cloudfront.net]
//        [--whatsapp 2126XXXXXXXX] [--email contact@exemple.ma] [--og-locale fr_MA]
//        [--description "…"] [--hero-title "…"] [--hero-lead "…"] [--force]
//
// Ce que fait le script (idempotent, refuse d'écraser un fichier modifié sans --force) :
// 1. copie le gabarit et les fichiers des autres skills du plugin (une seule source par fichier) ;
// 2. remplace les placeholders {{…}} ; un texte non fourni reçoit « [À valider] … » (jamais inventé) ;
// 3. adapte web/angular.json (outputMode static, sans ssr.entry, i18n fr à la racine, localize en
//    production, budgets) et web/package.json (prebuild, postbuild, check:seo) ;
// 4. supprime les fichiers de `ng new` remplacés (app.html, app.scss, app.spec.ts, server.ts).
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const SKILLS = resolve(new URL('../..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));

// ---------- arguments ----------
const argv = process.argv.slice(2);
const opt = (name, fallback = undefined) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};
const force = argv.includes('--force');
const target = resolve(opt('target', process.cwd()));
const project = opt('project');
const siteName = opt('site-name');
if (!project || !/^[a-z][a-z0-9-]*$/.test(project) || !siteName) {
  console.error('Usage : --target <dossier> --project <slug-kebab> --site-name "Nom" [options]');
  process.exit(2);
}
if (!existsSync(join(target, 'web', 'angular.json'))) {
  console.error(`${target}/web/angular.json introuvable : lancer d'abord ng new (voir SKILL.md).`);
  process.exit(2);
}
const domain = opt('domain', 'www.example.org');
const cloudfrontDomain = opt('cloudfront-domain', 'd111111abcdef8.cloudfront.net');
const todo = (what) => `[À valider] ${what}`;
const values = {
  PROJECT: project,
  SITE_NAME: siteName,
  DOMAIN: domain,
  CLOUDFRONT_DOMAIN: cloudfrontDomain,
  SITE_URL: opt('site-url', `https://${domain}`).replace(/\/$/, ''),
  WHATSAPP_NUMBER: (opt('whatsapp', '') ?? '').replace(/\D/g, ''),
  CONTACT_EMAIL: opt('email', ''),
  OG_LOCALE: opt('og-locale', 'fr_FR'),
  SITE_DESCRIPTION: opt('description', todo('description de la page d’accueil (150 caractères)')),
  HERO_TITLE: opt('hero-title', todo('titre principal')),
  HERO_LEAD: opt('hero-lead', todo('une phrase qui décrit précisément l’offre')),
  MOMENT_TITLE: opt('moment-title', todo('titre du moment fort')),
  CLIENT_DESCRIPTION: opt('client', todo('activité, ville, offre')),
  AUDIENCE: opt('audience', todo('publics visés')),
};

// ---------- fichiers : destination <- source (relative au dossier skills/) ----------
const APP = 'web/src/app';
const FILES = {
  [`${APP}/app.config.ts`]: 'angular-ssg-i18n/assets/app.config.ts',
  [`${APP}/app.config.server.ts`]: 'angular-ssg-i18n/assets/app.config.server.ts',
  [`${APP}/app.routes.server.ts`]: 'angular-ssg-i18n/assets/app.routes.server.ts',
  [`${APP}/core/data/data-reader.ts`]: 'angular-ssg-i18n/assets/data-reader.ts',
  [`${APP}/core/data/read-data-file.server.ts`]: 'angular-ssg-i18n/assets/read-data-file.server.ts',
  [`${APP}/core/i18n/locale.ts`]: 'angular-ssg-i18n/assets/locale.ts',
  [`${APP}/core/image/image-loader.ts`]: 'angular-ssg-i18n/assets/image-loader.ts',
  [`${APP}/core/seo/seo.ts`]: 'seo-static-site/assets/seo.ts',
  [`${APP}/core/animation/use-gsap.ts`]: 'gsap-motion/assets/use-gsap.ts',
  [`${APP}/core/animation/motion.ts`]: 'gsap-motion/assets/motion.ts',
  [`${APP}/core/order/whatsapp-message.ts`]: 'whatsapp-mailto-ordering/assets/whatsapp-message.ts',
  [`${APP}/core/order/whatsapp-message.spec.ts`]: 'whatsapp-mailto-ordering/assets/whatsapp-message.spec.ts',
  [`${APP}/core/order/cart-store.ts`]: 'whatsapp-mailto-ordering/assets/cart-store.ts',
  [`${APP}/core/order/cart-store.spec.ts`]: 'whatsapp-mailto-ordering/assets/cart-store.spec.ts',
  [`${APP}/core/order/browser-storage.ts`]: 'whatsapp-mailto-ordering/assets/browser-storage.ts',
  [`${APP}/core/order/order-mode.config.ts`]: 'whatsapp-mailto-ordering/assets/order-mode.config.ts',
  [`${APP}/features/home/home-hero/home-hero.ts`]: 'frontend-design-pro/assets/home-hero.ts',
  [`${APP}/features/home/home-hero/home-hero.scss`]: 'frontend-design-pro/assets/home-hero.scss',
  [`${APP}/features/home/signature-moment/signature-moment.ts`]: 'gsap-motion/assets/signature-moment.ts',
  'web/src/styles/_tokens.scss': 'frontend-design-pro/assets/_tokens.scss',
  'scripts/postbuild.mjs': 'seo-static-site/assets/postbuild.mjs',
  'scripts/robots.mjs': 'seo-static-site/assets/robots.mjs',
  'scripts/check-seo.mjs': 'seo-static-site/scripts/check-seo.mjs',
  'scripts/sync-data.mjs': 'json-catalog-data/assets/sync-data.mjs',
  'scripts/validate-data.mjs': 'json-catalog-data/assets/validate-data.mjs',
  'scripts/build-cloudfront-function.mjs': 'aws-static-hosting/assets/build-cloudfront-function.mjs',
  'scripts/check-cloudfront-function.mjs': 'aws-static-hosting/scripts/check-cloudfront-function.mjs',
  'scripts/redirects.mjs': 'aws-static-hosting/assets/redirects.example.mjs',
  'scripts/deploy-s3.sh': 'aws-static-hosting/assets/deploy-s3.sh',
  'scripts/sync-changed.mjs': 'aws-static-hosting/assets/sync-changed.mjs',
  'scripts/data-lib.mjs': 'aws-static-hosting/assets/data-lib.mjs',
  'scripts/ts-extension-hook.mjs': 'aws-static-hosting/assets/ts-extension-hook.mjs',
  '.github/workflows/ci.yml': 'github-actions-oidc-deploy/assets/workflows/ci.yml',
  '.github/workflows/deploy.yml': 'github-actions-oidc-deploy/assets/workflows/deploy.yml',
  '.github/workflows/nightly-rebuild.yml': 'github-actions-oidc-deploy/assets/workflows/nightly-rebuild.yml',
  'infra/github-oidc/trust-policy.json': 'github-actions-oidc-deploy/assets/iam/trust-policy.json',
  'infra/github-oidc/deploy-policy.json': 'github-actions-oidc-deploy/assets/iam/deploy-policy.json',
  'infra/github-oidc/github-oidc.tf': 'github-actions-oidc-deploy/assets/terraform/github-oidc.tf',
  'infra/cloudfront/waf-rate-rule.json': 'aws-static-hosting/assets/waf-rate-rule.json',
  'infra/cloudfront/test-event-admin.json': 'aws-static-hosting/assets/test-events/test-event-admin.json',
  'infra/cloudfront/test-event-hotlink.json': 'aws-static-hosting/assets/test-events/test-event-hotlink.json',
  'infra/cloudfront/test-event-photo.json': 'aws-static-hosting/assets/test-events/test-event-photo.json',
  'infra/cloudfront/test-event-scraper.json': 'aws-static-hosting/assets/test-events/test-event-scraper.json',
};
const TEMPLATE = join(SKILLS, 'scaffold-static-app', 'assets', 'template');
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
for (const file of walk(TEMPLATE)) FILES[relative(TEMPLATE, file).replaceAll('\\', '/')] = file;

// ---------- copie + placeholders ----------
const TEXT = /\.(ts|mjs|js|json|md|scss|html|yml|yaml|sh|tf|txt)$|^\.|\/\.[^/]+$/;
const fill = (content) => content.replace(/\{\{([A-Z_]+)\}\}/g, (m, key) => (key in values ? values[key] : m));
let written = 0;
const conflicts = [];
const leftovers = [];
for (const [dest, src] of Object.entries(FILES)) {
  const from = src.startsWith('/') || /^[A-Za-z]:/.test(src) ? src : join(SKILLS, src);
  const to = join(target, dest);
  const raw = readFileSync(from);
  const content = TEXT.test(dest) ? Buffer.from(fill(raw.toString('utf8'))) : raw;
  if (existsSync(to) && !force) {
    const current = readFileSync(to);
    if (current.equals(content)) continue;
    // Fichiers générés par ng new que le gabarit remplace : autorisés.
    if (!/^web\/src\/(app\/app\.(ts|routes\.ts|config\.ts|config\.server\.ts|routes\.server\.ts)|styles\.scss|environments\/)/.test(dest)) {
      conflicts.push(dest);
      continue;
    }
  }
  mkdirSync(dirname(to), { recursive: true });
  writeFileSync(to, content);
  written++;
  const left = TEXT.test(dest) ? content.toString('utf8').match(/\{\{[A-Z_]+\}\}/g) : null;
  if (left && !dest.startsWith('.github/')) leftovers.push(`${dest} : ${[...new Set(left)].join(', ')}`);
}

// ---------- angular.json ----------
const angularPath = join(target, 'web', 'angular.json');
const angular = JSON.parse(readFileSync(angularPath, 'utf8'));
const name = Object.keys(angular.projects)[0];
const proj = angular.projects[name];
const build = proj.architect.build;
build.options.outputMode = 'static';
delete build.options.ssr;
build.options.polyfills = [...new Set([...(build.options.polyfills ?? []), '@angular/localize/init'])];
proj.i18n = proj.i18n ?? { sourceLocale: { code: 'fr', baseHref: '/' } };
build.configurations.production = {
  ...build.configurations.production,
  localize: true,
  budgets: [
    { type: 'initial', maximumWarning: '400kB', maximumError: '600kB' },
    { type: 'anyComponentStyle', maximumWarning: '6kB', maximumError: '10kB' },
  ],
};
writeFileSync(angularPath, JSON.stringify(angular, null, 2) + '\n');

// ---------- package.json ----------
const pkgPath = join(target, 'web', 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
pkg.scripts = {
  ...pkg.scripts,
  prestart: 'node ../scripts/sync-data.mjs',
  prebuild: 'node ../scripts/sync-data.mjs',
  postbuild: 'node ../scripts/postbuild.mjs',
  'test:ci': 'ng test --watch=false',
  'check:seo': 'node ../scripts/check-seo.mjs --root ..',
  'check:cloudfront': 'node ../scripts/build-cloudfront-function.mjs && node ../scripts/check-cloudfront-function.mjs --root ..',
};
delete pkg.scripts['serve:ssr:' + name];
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

// ---------- nettoyage ng new ----------
for (const f of ['src/server.ts', 'src/app/app.html', 'src/app/app.scss', 'src/app/app.css', 'src/app/app.spec.ts']) {
  rmSync(join(target, 'web', f), { force: true });
}
const nvmrc = join(target, 'web', '.nvmrc');
if (!existsSync(nvmrc)) writeFileSync(nvmrc, `${process.versions.node.split('.')[0]}\n`);
for (const dir of ['data/images', 'data/raw']) mkdirSync(join(target, dir), { recursive: true });
const gitignore = join(target, '.gitignore');
const ignore = ['node_modules/', 'web/dist/', 'web/.angular/', 'web/public/data/', 'web/public/images/', '.firecrawl/', 'data/raw/', '*.tfstate*', '.terraform/'];
const existing = existsSync(gitignore) ? readFileSync(gitignore, 'utf8') : '';
writeFileSync(gitignore, existing + ignore.filter((l) => !existing.includes(l)).join('\n') + '\n');

console.log(`apply-template : ${written} fichier(s) écrits dans ${target} (projet Angular « ${name} »)`);
if (conflicts.length) {
  console.error(`Fichiers existants modifiés, non écrasés (relancer avec --force si voulu) :\n- ${conflicts.join('\n- ')}`);
}
if (leftovers.length) console.warn(`Placeholders restants (à remplir) :\n- ${leftovers.join('\n- ')}`);
const pending = Object.entries(values).filter(([, v]) => String(v).startsWith('[À valider]')).map(([k]) => k);
if (pending.length) console.warn(`Textes à valider avec le client : ${pending.join(', ')}`);
if (statSync(target).isDirectory()) process.exit(conflicts.length ? 1 : 0);
