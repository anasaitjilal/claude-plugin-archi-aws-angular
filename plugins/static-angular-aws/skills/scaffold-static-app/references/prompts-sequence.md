# Séquence de prompts type (dossier `prompts/` du projet)

Méthode éprouvée : un fichier par étape, exécuté avec « Lis prompts/NN-….md et exécute-le ».
Chaque prompt dit **quoi**, **les contraintes**, **un seul point d'arrêt** (souvent avant de coder)
et **la livraison** (build vert, contrôles, résumé fait/reste, documentation mise à jour).

| N° | Étape | Point d'arrêt | Skills |
|---|---|---|---|
| 00 | Outils : MCP angular-cli, skills GSAP / frontend-design / Firecrawl présents | aucun | architecture |
| 01 | Contenu : carte du site existant, crawl, normalisation `data/*.json`, images, `MISSING.md` | inventaire montré | Firecrawl, json-catalog-data |
| 02 | Direction artistique : concept, palette (contrastes AA chiffrés), typo, grille, wireframes ASCII | plan validé | frontend-design-pro |
| 03 | Architecture Angular : modèles, stores en signals, routes, prérendu | aucun | angular-ssg-i18n |
| 04 | Pages et composants, **un** moment GSAP | aucun | gsap-motion |
| 05 | Panier + message WhatsApp (tests) ; mailto pour les cas particuliers | numéro confirmé | whatsapp-mailto-ordering |
| 06 | Qualité : accessibilité AA, perf, SEO, 404, redirections | aucun | web-perf-lighthouse, seo-static-site |
| 07 | Langue supplémentaire | relecture client | angular-ssg-i18n |
| 08 | Déploiement : S3, CloudFront, Function, OIDC, workflows | commandes AWS relues | aws-static-hosting, github-actions-oidc-deploy |
| 09+ | Admin, évolutions demandées par le client (un prompt par lot de demandes, daté) | selon le cas | serverless-json-admin |
| — | Bascule du domaine | jour J | domain-dns-cutover |

Gabarit d'un prompt :

```markdown
# NN — Titre

Avant de commencer : lis CLAUDE.md, <docs utiles> ; charge les skills <…>.
Branche `feat/<sujet>`, sans pousser sur main, sans aucune ressource payante.

## Périmètre
- ce qui change / ce qui ne doit PAS changer (visuellement, fonctionnellement)

## Travail
1. …

## Livraison
Un seul point d'arrêt : <quoi montrer> avant de coder. Puis tout implémenter.
À la fin : tests, lint, build verts ; check:seo ; docs/<sujet>.md ; résumé fait / reste.
```
