---
name: github-actions-oidc-deploy
description: Pipeline GitHub Actions d'un site statique vers S3 + CloudFront avec authentification OIDC (sans clé AWS) - rôle IAM limité à l'environnement production, policy minimale, workflows ci.yml (PR) / deploy.yml (main, workflow_dispatch) / nightly-rebuild.yml, contrôle des données et des variables, sync S3 par langue, invalidation, caches, dépannage des erreurs connues. À utiliser pour « GitHub Actions », « OIDC », « déploiement », « CI/CD », « AssumeRoleWithWebIdentity », « pipeline », « invalidation CloudFront », « workflow échoue ».
---

# Déploiement GitHub Actions + OIDC

## Mise en place (une fois par compte / dépôt)

1. **Provider OIDC** (une fois par compte AWS) : `aws iam list-open-id-connect-providers` ; s'il manque
   `token.actions.githubusercontent.com` : `aws iam create-open-id-connect-provider --url
   https://token.actions.githubusercontent.com --client-id-list sts.amazonaws.com`.
2. **Rôle** : `infra/github-oidc/trust-policy.json` + `deploy-policy.json` (assets), placeholders
   `<ACCOUNT_ID>`, `<OWNER>/<REPO>`, `<BUCKET>`, `<DISTRIBUTION_ID>` remplacés, puis `aws iam create-role`
   et `put-role-policy` — ou `github-oidc.tf` (Terraform, lancé à la main).
3. **Environnement GitHub `production`** (Settings → Environments), branches limitées à `main`,
   variables (pas des secrets : rien de sensible) : `AWS_ROLE_ARN`, `AWS_REGION`, `S3_BUCKET` (nom
   seul), `CLOUDFRONT_DISTRIBUTION_ID`, `SITE_URL`.
4. Workflows (assets) dans `.github/workflows/`. Vérifier avec `/static-angular-aws:deploy-check`.

## Workflows

| Fichier | Déclencheur | Contenu |
|---|---|---|
| `ci.yml` | PR vers main | validate-data, lint, tests, build, check-seo, Function régénérée = commitée + check. **Sans AWS.** |
| `deploy.yml` | push main (hors docs/infra), manuel, `workflow_call` | caches, contrôle des variables et placeholders, OIDC, validate-data, build, check-seo, sync S3 parallèle par langue, invalidation `/*` non attendue |
| `nightly-rebuild.yml` | cron 02:07 UTC, manuel (`force`) | rebuild seulement si `data/version.json` ≠ `build-data-version.txt` (avec admin) |

Principes : un seul job de déploiement (pas d'artefact à transférer), `concurrency: deploy-production`
sans annulation, clés de cache Angular **stables** (une par version des dépendances), invalidation
lancée sans attendre, résumé dans `$GITHUB_STEP_SUMMARY`. Lint et tests en PR seulement.
Retour arrière : `git revert` + merge, ou *Run workflow* sur un tag.

## Règles

- Jamais de clé d'accès AWS dans GitHub ; jamais de push direct sur `main` (protection de branche).
- Policy au moindre privilège : `s3:ListBucket` sur le bucket, `Get/Put/DeleteObject` sur `bucket/*`,
  `cloudfront:CreateInvalidation`/`GetInvalidation` sur la seule distribution.
- Les commandes IAM et Terraform sont proposées, l'utilisateur les exécute.

## Dépannage (pièges déjà rencontrés)

| Symptôme | Cause | Correction |
|---|---|---|
| `Not authorized to perform sts:AssumeRoleWithWebIdentity` | `sub` de la trust policy ≠ jeton. Certains comptes envoient le format à **identifiants immuables** `repo:<OWNER>@<OWNER_ID>/<REPO>@<REPO_ID>:environment:production` ; ou job sans `environment: production` | Décoder le jeton (`references/decode-oidc-token.md`) et recopier le `sub` exact |
| `Could not load credentials` | `permissions: id-token: write` manquant (aussi dans le workflow appelant d'un `workflow_call`) | Ajouter la permission |
| `MalformedPolicyDocument` / accès refusé partout | placeholder `<ACCOUNT_ID>` ou `<BUCKET>` resté dans une policy | `deploy-check` liste les placeholders |
| `Invalid bucket name "arn:aws:s3:::…"` ou `s3://s3://` | `S3_BUCKET` contient un ARN ou `s3://` | Nom seul ; `deploy.yml` le refuse désormais |
| Déploiement bloqué par `validate-data` | donnée publiée invalide (ex. produit visible sans photo) | Le message donne produit et champ ; corriger la donnée, pas le contrôle |
| Bucket vidé de l'anglais | sync de la langue par défaut sans `--exclude 'en/*'` | Exclusions générées depuis `site.config.mjs` |
| Cache GitHub saturé, runs lents | clé de cache avec le SHA du commit | clé par `hashFiles(package-lock)` |
| Brouillon de l'admin écrasé | `git push --force` sur une branche de brouillon | Jamais de push forcé sur une branche que l'admin écrit ; avancer en fast-forward ou refuser (422) |
