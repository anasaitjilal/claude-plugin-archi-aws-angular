# claude-plugin-archi-aws-angular

Marketplace Claude Code personnelle (`anasaitjilal-plugins`).

## Installation

```text
/plugin marketplace add anasaitjilal/claude-plugin-archi-aws-angular
/plugin install static-angular-aws@anasaitjilal-plugins
/reload-plugins        (ou redémarrer Claude Code)
```

En ligne de commande : `claude plugin marketplace add anasaitjilal/claude-plugin-archi-aws-angular` puis
`claude plugin install static-angular-aws@anasaitjilal-plugins`.
Depuis un clone local : `claude plugin marketplace add ./claude-plugin-archi-aws-angular` (les modifications sont prises en
compte au prochain démarrage ou avec `/reload-plugins`).

## Plugins

| Plugin | Version | Contenu |
|---|---|---|
| [`static-angular-aws`](plugins/static-angular-aws/README.md) | 1.0.0 | 13 skills, 3 skills-commandes, 1 agent : sites statiques Angular sur S3 + CloudFront |

### static-angular-aws

| Skill / commande | Pour |
|---|---|
| `static-angular-aws-architecture` | point d'entrée, règles transverses |
| `scaffold-static-app` · `/static-angular-aws:new-static-app <nom>` | créer un projet |
| `angular-ssg-i18n` | prérendu, hydratation, langues |
| `json-catalog-data` | données JSON, images, validation |
| `frontend-design-pro` | design sobre et pro |
| `gsap-motion` | animations GSAP |
| `web-perf-lighthouse` · `/static-angular-aws:audit-perf-seo <url>` | performance |
| `seo-static-site` | SEO technique |
| `aws-static-hosting` | S3, CloudFront, Function, WAF, coûts |
| `github-actions-oidc-deploy` · `/static-angular-aws:deploy-check` | déploiement |
| `serverless-json-admin` | espace admin |
| `whatsapp-mailto-ordering` | panier et commande |
| `domain-dns-cutover` | domaine, certificat, emails |

## Développement

```bash
claude plugin validate .                                   # marketplace + plugins
claude plugin validate ./plugins/static-angular-aws
```

`docs/extraction-ansafood.md` : d'où vient chaque brique (projet d'origine) et ce qui est resté spécifique.
