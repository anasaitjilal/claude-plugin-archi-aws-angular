# Arborescence générée par apply-template.mjs

Chaque fichier a une seule source dans le plugin : corriger la source, jamais une copie.

| Fichier du projet | Source (skills/…) |
|---|---|
| `web/src/app/app.config.ts` | `angular-ssg-i18n/assets/app.config.ts` |
| `web/src/app/app.config.server.ts` | `angular-ssg-i18n/assets/app.config.server.ts` |
| `web/src/app/app.routes.server.ts` | `angular-ssg-i18n/assets/app.routes.server.ts` |
| `web/src/app/core/data/data-reader.ts` | `angular-ssg-i18n/assets/data-reader.ts` |
| `web/src/app/core/data/read-data-file.server.ts` | `angular-ssg-i18n/assets/read-data-file.server.ts` |
| `web/src/app/core/i18n/locale.ts` | `angular-ssg-i18n/assets/locale.ts` |
| `web/src/app/core/image/image-loader.ts` | `angular-ssg-i18n/assets/image-loader.ts` |
| `web/src/app/core/seo/seo.ts` | `seo-static-site/assets/seo.ts` |
| `web/src/app/core/animation/use-gsap.ts` | `gsap-motion/assets/use-gsap.ts` |
| `web/src/app/core/animation/motion.ts` | `gsap-motion/assets/motion.ts` |
| `web/src/app/core/order/whatsapp-message.ts` | `whatsapp-mailto-ordering/assets/whatsapp-message.ts` |
| `web/src/app/core/order/whatsapp-message.spec.ts` | `whatsapp-mailto-ordering/assets/whatsapp-message.spec.ts` |
| `web/src/app/core/order/cart-store.ts` | `whatsapp-mailto-ordering/assets/cart-store.ts` |
| `web/src/app/core/order/cart-store.spec.ts` | `whatsapp-mailto-ordering/assets/cart-store.spec.ts` |
| `web/src/app/core/order/browser-storage.ts` | `whatsapp-mailto-ordering/assets/browser-storage.ts` |
| `web/src/app/core/order/order-mode.config.ts` | `whatsapp-mailto-ordering/assets/order-mode.config.ts` |
| `web/src/app/features/home/home-hero/home-hero.ts` | `frontend-design-pro/assets/home-hero.ts` |
| `web/src/app/features/home/home-hero/home-hero.scss` | `frontend-design-pro/assets/home-hero.scss` |
| `web/src/app/features/home/signature-moment/signature-moment.ts` | `gsap-motion/assets/signature-moment.ts` |
| `web/src/styles/_tokens.scss` | `frontend-design-pro/assets/_tokens.scss` |
| `scripts/postbuild.mjs` | `seo-static-site/assets/postbuild.mjs` |
| `scripts/robots.mjs` | `seo-static-site/assets/robots.mjs` |
| `scripts/check-seo.mjs` | `seo-static-site/scripts/check-seo.mjs` |
| `scripts/sync-data.mjs` | `json-catalog-data/assets/sync-data.mjs` |
| `scripts/validate-data.mjs` | `json-catalog-data/assets/validate-data.mjs` |
| `scripts/build-cloudfront-function.mjs` | `aws-static-hosting/assets/build-cloudfront-function.mjs` |
| `scripts/check-cloudfront-function.mjs` | `aws-static-hosting/scripts/check-cloudfront-function.mjs` |
| `scripts/redirects.mjs` | `aws-static-hosting/assets/redirects.example.mjs` |
| `scripts/deploy-s3.sh` | `aws-static-hosting/assets/deploy-s3.sh` |
| `scripts/sync-changed.mjs` | `aws-static-hosting/assets/sync-changed.mjs` |
| `scripts/data-lib.mjs` | `aws-static-hosting/assets/data-lib.mjs` |
| `scripts/ts-extension-hook.mjs` | `aws-static-hosting/assets/ts-extension-hook.mjs` |
| `.github/workflows/ci.yml` | `github-actions-oidc-deploy/assets/workflows/ci.yml` |
| `.github/workflows/deploy.yml` | `github-actions-oidc-deploy/assets/workflows/deploy.yml` |
| `.github/workflows/nightly-rebuild.yml` | `github-actions-oidc-deploy/assets/workflows/nightly-rebuild.yml` |
| `infra/github-oidc/trust-policy.json` | `github-actions-oidc-deploy/assets/iam/trust-policy.json` |
| `infra/github-oidc/deploy-policy.json` | `github-actions-oidc-deploy/assets/iam/deploy-policy.json` |
| `infra/github-oidc/github-oidc.tf` | `github-actions-oidc-deploy/assets/terraform/github-oidc.tf` |
| `infra/cloudfront/waf-rate-rule.json` | `aws-static-hosting/assets/waf-rate-rule.json` |
| `test:ci` | `ng test --watch=false` |
| `check:seo` | `node ../scripts/check-seo.mjs --root ..` |
| `check:cloudfront` | `node ../scripts/build-cloudfront-function.mjs && node ../scripts/check-cloudfront-function.mjs --root ..` |

Gabarit (`scaffold-static-app/assets/template/`) : `CLAUDE.md`, `.mcp.json`, `site.config.mjs`, `data/site.json`, `web/src/environments/environment.ts`, `web/src/styles.scss`, `web/src/app/app.ts`, `app.routes.ts`, `core/config/site.ts`, `features/home/home-page/home-page.ts`, `features/not-found/not-found-page/not-found-page.ts`.

Modifiés : `web/angular.json` (outputMode static, sans ssr.entry, i18n, localize et budgets en production), `web/package.json` (prestart/prebuild, postbuild, test:ci, check:seo, check:cloudfront), `.gitignore`. Supprimés : `server.ts`, `app.html`, `app.scss`, `app.spec.ts`.
