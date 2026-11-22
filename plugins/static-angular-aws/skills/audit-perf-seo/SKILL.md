---
name: audit-perf-seo
description: Audit performance (Lighthouse mobile, médiane de 3 passes) et SEO technique d'un site statique, sur une URL publique ou le build local, avec rapport priorisé dans docs/audit-<date>.md. Lancé par l'agent indépendant perf-seo-auditor.
argument-hint: <url> [url2 url3…]
disable-model-invocation: true
---

# /audit-perf-seo

URLs : `$ARGUMENTS`. Sans URL : auditer le build local (`web/dist/…`, servi par un serveur statique
qui reproduit la production) sur l'accueil, une liste et une fiche.

1. Déléguer l'audit à l'agent **`perf-seo-auditor`** (sous-agent) : il n'a pas écrit le code, il ne relit
   pas son propre travail. Lui transmettre les URLs et le chemin du projet.
2. L'agent applique les skills `web-perf-lighthouse` et `seo-static-site` :
   - `node "${CLAUDE_PLUGIN_ROOT}/skills/web-perf-lighthouse/scripts/lighthouse-budget.mjs" <urls> --runs 3` ;
   - `node scripts/check-seo.mjs` sur le build local s'il existe ;
   - en ligne : `robots.txt`, `sitemap.xml`, canonical/hreflang/JSON-LD de 3 pages, codes HTTP
     (`curl -A "Mozilla/5.0"`), 404, une ancienne URL redirigée.
3. Rapport `docs/audit-<AAAA-MM-JJ>.md` : tableau des mesures vs budget, élément LCP, problèmes classés
   (bloquant / important / confort) avec la cause **mesurée** et la correction proposée (fichier visé).
4. Ne rien corriger pendant l'audit : proposer, puis attendre la validation.
