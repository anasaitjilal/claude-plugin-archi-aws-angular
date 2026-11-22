# static-angular-aws

Plugin Claude Code pour démarrer et faire évoluer des **sites vitrines et catalogues statiques**
avec l'architecture éprouvée sur un catalogue B2B/B2C en production : Angular (SSG, signals, i18n),
S3 + CloudFront (forfait Free), GitHub Actions OIDC, commande WhatsApp, admin serverless optionnel.
Objectifs : Lighthouse mobile ≥ 90, SEO complet, coût AWS ≈ 0 $.

Installation :

```text
/plugin marketplace add anasaitjilal/claude-plugins
/plugin install static-angular-aws@anasaitjilal-plugins
```

## Skills

| Skill | Rôle | Déclenchement |
|---|---|---|
| `static-angular-aws-architecture` | point d'entrée : architecture, règles transverses, quel skill pour quoi | automatique |
| `scaffold-static-app` | nouveau projet : `ng new` + gabarit testé + build vert | automatique |
| `angular-ssg-i18n` | prérendu, routes à paramètres, `@defer`, hydratation, FR/EN | automatique |
| `json-catalog-data` | données JSON, images WebP, validation, données fraîches | automatique |
| `frontend-design-pro` | plan de design, tokens, typo, hero sobre (complète `frontend-design`) | automatique |
| `gsap-motion` | un moment fort par page, `useGsap`, reduced-motion (complète les skills GSAP) | automatique |
| `web-perf-lighthouse` | budget Lighthouse, images, polices, cache | automatique |
| `seo-static-site` | balises, JSON-LD, sitemap, robots, `check-seo` | automatique |
| `aws-static-hosting` | S3 + OAC + CloudFront, Function générée, anti-scraping, WAF, coûts | automatique |
| `github-actions-oidc-deploy` | OIDC, workflows, dépannage | automatique |
| `serverless-json-admin` | Cognito MFA, API, Lambda, catalogue S3 `If-Match` (Terraform) | automatique |
| `whatsapp-mailto-ordering` | panier en signals, message WhatsApp, mailto (tests inclus) | automatique |
| `domain-dns-cutover` | ACM us-east-1, bascule DNS 2 phases, Cloudflare gris, emails | automatique |
| `/static-angular-aws:new-static-app <nom>` | création guidée de bout en bout | manuel |
| `/static-angular-aws:audit-perf-seo <url>` | audit Lighthouse + SEO par l'agent indépendant | manuel |
| `/static-angular-aws:deploy-check [--aws] [--github]` | contrôle en lecture seule du déploiement | manuel |

Agent : `perf-seo-auditor` (audit indépendant, ne modifie rien).

## Scripts vérifiables

| Script | Vérifie |
|---|---|
| `skills/aws-static-hosting/scripts/check-cloudfront-function.mjs` | User-Agents, redirections (query string), renommages, index.html, admin, hotlinking, domaine canonique, règles masquées, taille |
| `skills/seo-static-site/scripts/check-seo.mjs` | h1, titres/descriptions uniques, canonical, hreflang, JSON-LD, noindex, alt |
| `skills/web-perf-lighthouse/scripts/lighthouse-budget.mjs` | budget Lighthouse en médiane de N passes |
| `skills/deploy-check/scripts/deploy-check.mjs` | placeholders, policies, workflows, Function, variables GitHub, distribution |
| `skills/scaffold-static-app/scripts/apply-template.mjs` | applique le gabarit à un `ng new` |

## Skills et outils tiers recommandés (non requis)

- `frontend-design@claude-code-plugins` (Anthropic) ;
- `gsap-skills@gsap-skills` (GreenSock : `gsap-core`, `gsap-scrolltrigger`, `gsap-performance`…) ;
- Firecrawl (reprise du contenu d'un site existant) ;
- MCP `angular-cli` (écrit dans `.mcp.json` par le scaffold).

## Règles transverses

Jamais de push sur `main` · aucun secret dans le dépôt ni dans `.mcp.json` · **aucune ressource AWS
payante sans accord explicite** · une branche par évolution · tests et build verts avant la PR ·
ne jamais inventer de donnée.
