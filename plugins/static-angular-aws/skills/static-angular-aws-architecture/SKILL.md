---
name: static-angular-aws-architecture
description: Point d'entrée de l'architecture « site vitrine / catalogue statique » Angular (SSG, signals, i18n) hébergé sur S3 + CloudFront (forfait gratuit), déployé par GitHub Actions OIDC, commande WhatsApp, admin serverless optionnel. À charger en premier pour créer, faire évoluer ou auditer un site vitrine, un catalogue produits, un site prérendu Angular sur AWS quasi gratuit, ou quand on hésite entre plusieurs skills de ce plugin.
---

# Architecture static-angular-aws

Architecture éprouvée en production sur un catalogue B2B/B2C bilingue (≈ 250 produits, 550 pages
prérendues, coût AWS ≈ 0 $). Elle vise : **rapide** (Lighthouse mobile ≥ 90), **sobre et pro**,
**SEO complet**, **zéro serveur applicatif**, **quasi gratuit**.

## Vue d'ensemble

```
data/*.json ──prebuild──▶ web/public/data ──ng build (outputMode static, localize)──▶ dist/<projet>/browser/<langue>/
     ▲                                                                                     │ postbuild : sitemap, robots, 404
     │ (option) admin : Cognito MFA → API Gateway → Lambda → S3 draft/ live/ history/     ▼
     └───────────── publication : data/* écrits directement dans le bucket du site ── S3 privé + OAC ── CloudFront
                                                                                          (Function viewer-request, WAF Free)
GitHub : PR → ci.yml (lint, tests, build, check-seo, check-cloudfront) · main → deploy.yml (OIDC, sync, invalidation)
Navigateur : panier en signals (localStorage) → wa.me/<numéro>?text=… · demandes spéciales → mailto:
```

## Quel skill pour quoi

| Besoin | Skill |
|---|---|
| Nouveau projet de bout en bout | `/static-angular-aws:new-static-app <nom>` (puis `scaffold-static-app`) |
| Prérendu, routes à paramètres, `@defer`, hydratation, FR/EN | `angular-ssg-i18n` |
| Données JSON, images WebP, validation, données fraîches sans rebuild | `json-catalog-data` |
| Direction artistique, tokens, typo, hero | `frontend-design-pro` |
| Animations | `gsap-motion` |
| Score Lighthouse, images, polices, cache | `web-perf-lighthouse` |
| Balises, JSON-LD, sitemap, robots, noindex | `seo-static-site` |
| S3, CloudFront, Function, anti-scraping, WAF, coûts | `aws-static-hosting` |
| Pipeline, OIDC, erreurs de déploiement | `github-actions-oidc-deploy` |
| Espace admin (catalogue modifiable par le client) | `serverless-json-admin` |
| Panier, WhatsApp, mailto | `whatsapp-mailto-ordering` |
| Nom de domaine, certificat, emails | `domain-dns-cutover` |
| Audit indépendant | `/static-angular-aws:audit-perf-seo <url>` ou agent `perf-seo-auditor` |
| Vérifier une config de déploiement | `/static-angular-aws:deploy-check` |

Skills tiers à charger **s'ils sont disponibles** (le plugin ne recopie pas leur contenu) :
`frontend-design` (Anthropic), `gsap-core`, `gsap-scrolltrigger`, `gsap-performance`, `gsap-frameworks`…
(GreenSock, jamais `gsap-react`), skills Firecrawl (reprise d'un site existant), MCP `angular-cli`
(`get_best_practices` **avant** d'écrire du code Angular ; `ng generate` plutôt que des fichiers à la main).

## Règles de décision

1. **Statique d'abord.** Une page qui peut être prérendue l'est. Seul l'admin est rendu côté client
   (`RenderMode.Client` → `index.csr.html`).
2. **Pas de backend public.** Commande = lien WhatsApp ; formulaire = `mailto:` ; données = JSON.
   Un besoin qui exige un serveur (paiement, compte client) sort de cette architecture : le dire.
3. **Une seule source par donnée** : URL publique dans `environment.ts`, redirections dans
   `scripts/redirects.mjs`, catégories non commandables dans `order-mode.config.ts`, config des
   scripts dans `site.config.mjs`.
4. **Admin seulement si le client modifie lui-même le catalogue** plus d'une fois par mois.
   Sinon : JSON dans le repo, PR, déploiement.
5. **Langues** : la langue par défaut à la racine, les autres sous `/<code>/`, mêmes slugs.
6. **Un seul moment animé par page**, jamais au-dessus de la ligne de flottaison.

## Règles transverses (non négociables)

- **Jamais de push sur `main`** : une branche par évolution, PR, CI verte (tests + build) avant merge.
- **Aucun secret** dans le repo, `.mcp.json`, les workflows ou Terraform (OIDC, variables GitHub, SSM).
- **Aucune ressource AWS payante sans accord explicite** de l'utilisateur, même à quelques centimes ;
  ne jamais appeler l'API Cost Explorer (`aws ce …`, payante à la requête). Dans le doute : s'arrêter et demander.
- **Ne jamais inventer** de produit, prix, chiffre, avis ou coordonnée : champ vide + `data/MISSING.md`.
- Terraform et les commandes AWS qui modifient la production : **proposer, l'utilisateur exécute**.
- Fin de chaque étape : `npm run build` vert, contrôles (`check:seo`, `check:cloudfront`), résumé
  « fait / reste », puis attendre la validation.

## Pièges déjà rencontrés (résumé, détail dans chaque skill)

| Piège | Skill |
|---|---|
| Placeholder `<ACCOUNT_ID>` resté dans une policy IAM | `github-actions-oidc-deploy` |
| ARN ou `s3://` à la place du nom de bucket dans `S3_BUCKET` | `github-actions-oidc-deploy` |
| Function non associée au comportement : `AccessDenied` XML sur `/page` | `aws-static-hosting` |
| `sub` OIDC incorrect (format à identifiants immuables) | `github-actions-oidc-deploy` |
| `validate-data` bloque : produit visible sans photo | `json-catalog-data` |
| Push forcé sur une branche de brouillon : modifications du client perdues | `serverless-json-admin` |
| Scope-down WAF / options payantes avec le forfait Free | `aws-static-hosting` |
| Query string perdue (ou double encodée) dans les redirections | `aws-static-hosting` |
| Vidéo lourde sur le hero : LCP 4,4 s | `web-perf-lighthouse` |
| Trop d'animations au chargement : TBT 450 ms | `gsap-motion` |

Référence complète de l'architecture d'origine : `references/architecture.md`.
