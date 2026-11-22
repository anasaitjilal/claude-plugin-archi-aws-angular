---
name: domain-dns-cutover
description: Bascule d'un nom de domaine vers un site statique CloudFront - certificat ACM en us-east-1 validé par DNS, noms alternatifs, bascule DNS en deux phases (TTL bas puis enregistrements), Cloudflare en DNS seul (proxy gris), redirection du domaine technique cloudfront.net, mise à jour de siteUrl, préservation des emails (MX, SPF, DKIM, DMARC), Search Console. À utiliser pour « nom de domaine », « DNS », « certificat », « ACM », « Cloudflare », « mettre en ligne sur le domaine », « bascule », « emails du domaine ».
---

# Bascule du domaine vers CloudFront

> Procédure **pas encore éprouvée en production** sur le projet d'origine (le site y est servi par
> `*.cloudfront.net`). Avancer étape par étape, avec l'utilisateur, en vérifiant chaque résultat.
> Aucun coût : ACM public et DNS chez le registrar ou Cloudflare (gratuit).

## Phase 0 — Inventaire (J-7)

1. Exporter **toute** la zone DNS actuelle (registrar, Cloudflare, hébergeur WordPress…).
2. Repérer les enregistrements à conserver tels quels : `MX`, `SPF` (TXT `v=spf1`), `DKIM`
   (`*._domainkey`), `DMARC` (`_dmarc`), vérifications (Google, Microsoft), sous-domaines (mail, webmail).
   **Les emails ne doivent pas bouger** : ne toucher qu'aux enregistrements web (`@`, `www`).
3. Baisser le TTL des enregistrements web à 300 s (attendre l'ancien TTL avant la phase 2).

## Phase 1 — Certificat et distribution (sans effet visible)

1. ACM **en us-east-1** (obligatoire pour CloudFront) : certificat pour `exemple.ma` et `www.exemple.ma`,
   validation **DNS** (CNAME `_xxxx` à créer, à laisser en place pour le renouvellement automatique).
2. Une fois « Issued » : distribution → *Alternate domain names* (`www.exemple.ma`, `exemple.ma`),
   certificat, TLS 1.2 minimum. Ajouter le domaine aux origines CORS de l'API admin s'il y en a une.

## Phase 2 — Bascule (jour J, heure creuse)

1. DNS : `www` → CNAME vers `dxxxx.cloudfront.net`. Apex : enregistrement ALIAS/ANAME/CNAME-flattening
   (Cloudflare l'aplatit automatiquement) ou redirection apex → `www`.
2. **Cloudflare : proxy désactivé (nuage gris, « DNS only »)** pour ces enregistrements : un proxy orange
   devant CloudFront double le cache, casse la validation ACM et peut boucler en redirection.
3. Code : `siteUrl` dans `environment.ts` (canonical, hreflang, OG, JSON-LD, sitemap, robots, liens
   WhatsApp), variable GitHub `SITE_URL`, `imageHosts` de `site.config.mjs` ; déployer.
4. `site.config.mjs` : `canonicalHost: 'www.exemple.ma'` → la Function redirige `*.cloudfront.net` en 301 ;
   `check-cloudfront-function`, puis publier la Function.
5. Ancien site (WordPress…) : ses URLs sont déjà couvertes par `scripts/redirects.mjs` ; le garder
   accessible sur un sous-domaine temporaire si le client doit récupérer du contenu.

## Vérifier

```bash
dig +short www.exemple.ma CNAME; dig +short exemple.ma MX      # MX inchangés
curl -sI -A "Mozilla/5.0" https://www.exemple.ma/              # 200, canonical sur www
curl -sI -A "Mozilla/5.0" https://dxxxx.cloudfront.net/produits # 301 → https://www.exemple.ma/produits
curl -sI -A "Mozilla/5.0" https://exemple.ma/                   # 301 → www (si choisi)
```

Envoyer et recevoir un email de test sur l'adresse du domaine. Vérifier SPF/DKIM/DMARC (en-têtes
d'un email reçu : `spf=pass dkim=pass dmarc=pass`).

## Après

Search Console (propriété de domaine, vérification TXT) et Bing Webmaster Tools : soumettre le sitemap,
suivre l'indexation. Remonter le TTL à 3600 s après une semaine stable.

## Retour arrière

Remettre les anciens enregistrements web (gardés de la phase 0) ; `canonicalHost: null` et republier la
Function ; `siteUrl` précédent et redéployer.

## Pièges à éviter

- Certificat demandé dans la région du bucket au lieu de us-east-1 : invisible dans CloudFront.
- Suppression d'un `MX` ou du TXT SPF en « nettoyant » la zone : emails perdus.
- Proxy Cloudflare orange devant CloudFront.
- Activer la redirection `*.cloudfront.net` **avant** que le domaine réponde : site inaccessible.
