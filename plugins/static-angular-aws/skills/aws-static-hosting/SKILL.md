---
name: aws-static-hosting
description: Hébergement quasi gratuit d'un site statique sur AWS - bucket S3 privé + Origin Access Control + CloudFront (forfait Free), CloudFront Function viewer-request générée (redirections 301 avec query string, index.html, admin SPA, anti-scraping par User-Agent, anti-hotlinking), WAF limite par IP, en-têtes de cache, pages d'erreur, surveillance des coûts. À utiliser pour « S3 », « CloudFront », « CloudFront Function », « redirection 301 », « anti-scraping », « hotlinking », « WAF », « coût AWS », « AccessDenied », « héberger un site statique ».
---

# Hébergement S3 + CloudFront

> **Aucune ressource ni option AWS payante sans accord explicite.** Proposer les commandes,
> l'utilisateur les exécute (ou valide chacune). Ne jamais appeler l'API Cost Explorer.

## Cible

```
Navigateur ─▶ CloudFront (forfait Free, web ACL incluse) ─▶ Function viewer-request ─▶ S3 privé (OAC)
                    └─ (option) comportement /images/products/* ─▶ bucket de données (OAC)
Erreurs 403/404 ─▶ /404.html (code 404) · Compression auto · HTTP/2+3 · TLS 1.2+
```

Procédure pas à pas (console et CLI) : `references/setup.md`.

## CloudFront Function (assets)

- `scripts/redirects.mjs` (depuis `redirects.example.mjs`) : `REDIRECTS` (anciennes URLs, `:segments`,
  règles précises **d'abord**) et `RENAMES` (préfixes renommés, appliqués dans chaque langue).
- `site.config.mjs` : `locales`, `adminSpa`, `protectedImagesPrefix`, `imageHosts`, `canonicalHost`,
  listes `allowedAgents` / `blockedAgents` facultatives.
- `node scripts/build-cloudfront-function.mjs` → `infra/cloudfront/viewer-request.js` (généré, commité,
  ≤ 10 Ko, runtime `cloudfront-js-2.0`).
- `node scripts/check-cloudfront-function.mjs` (script du skill) : User-Agents, chaque redirection et
  renommage avec query string encodée, `index.html`, `/en` → `/en/`, admin, hotlinking, domaine
  canonique, règles masquées. **Obligatoire avant toute publication** (la CI le lance).
- Publication : `update-function` (étape DEVELOPMENT) → `test-function` avec les événements de
  `assets/test-events/` → `publish-function` → vérifier l'association au comportement par défaut
  (et au comportement des photos s'il existe).

Ordre des règles : 403 scraping → domaine canonique → photos protégées → admin → redirections →
renommages → `/xx` → `/xx/` → ajout de `index.html`.

## Anti-scraping (gratuit)

- User-Agent vide ou d'outil (curl, python-requests, Go, Java, axios, HeadlessChrome, Bytespider…) → 403 ;
  moteurs de recherche et aperçus de liens (WhatsApp, LinkedIn, Facebook…) toujours autorisés, vérifiés
  en premier. Freine la copie naïve, n'empêche pas un script déguisé : c'est assumé.
- Anti-hotlinking des photos par `Referer` : absent = autorisé (applis, aperçus), site ou moteur de
  recherche = autorisé, autre site = 403.
- robots.txt : skill `seo-static-site`.
- Limite par IP : **seulement avec le forfait CloudFront Free** (web ACL incluse, 5 règles). Règle
  `assets/waf-rate-rule.json` (2 000 requêtes / 5 min / IP), en **Count** 3 à 7 jours (requêtes
  échantillonnées), puis **Block**. Le forfait ne s'active que depuis la console (l'utilisateur le fait).

## En-têtes de cache (`assets/deploy-s3.sh`)

| Fichiers | Cache-Control | Comparaison |
|---|---|---|
| `*.js`, `*.css` (hashés) | `public,max-age=31536000,immutable` | taille |
| `*.html`, `*.json`, `*.xml`, `*.txt`, `_redirects` | `no-cache` | MD5 ↔ ETag (`SYNC_DOCS=changed`) |
| `*.webp` | `public,max-age=604800` + `Content-Type: image/webp` forcé | taille |
| reste (svg, mp4, ico…) | `public,max-age=604800` | taille |

Chaque passe avec `--delete` ; la langue par défaut exclut les sous-dossiers des autres langues et `data/*`.

## Coûts (tout gratuit)

AWS Budgets (alertes email 50/80/100 %) ; Cost Anomaly Detection (abonnement **email**, pas SNS) ;
rapports CloudFront (Usage, Popular objects, Top referrers, Cache statistics) une fois par mois ;
quotas du forfait Free : 1 M requêtes et 100 Go/mois (au-delà : pas de facture mais performances réduites).

## Pièges déjà rencontrés

- **Function non associée** (ou associée à l'étape DEVELOPMENT seulement) : `/a-propos` renvoie le
  XML `AccessDenied` de S3 (l'objet `a-propos` n'existe pas, seul `a-propos/index.html` existe).
- **Query string perdue** dans une redirection (`?utm_source=…` ou filtres) ; ou **réencodée**
  (`%20` → `%2520`) : CloudFront donne les valeurs déjà encodées, les recopier telles quelles.
- **Redirection en chaîne** ancienne URL → slug renommé → nouveau slug : appliquer les renommages à la
  cible des redirections (le générateur le fait).
- **Règle générique avant une règle précise** : la précise ne sert jamais (le contrôle le détecte).
- **Scope-down et options du forfait Free** : la console peut refuser une règle ou une option hors du
  forfait (règles gérées payantes, Bot Control, journaux). Rester sur une règle de débit simple ; si un
  scope-down (préfixes de chemin) est accepté par la console, le garder, sinon s'en passer.
- Le forfait Free exclut Lambda@Edge, les journaux temps réel et une Function partagée avec une autre
  distribution : vérifier l'éligibilité (survol du forfait grisé) avant.
- Une fois sur un forfait, la web ACL ne peut plus être retirée sans revenir au paiement à l'usage.
- `curl` de test bloqué par sa propre Function : `curl -A "Mozilla/5.0" -I https://…`.
- Mauvais `Content-Type` des `.webp` selon la machine qui synchronise : le forcer.
