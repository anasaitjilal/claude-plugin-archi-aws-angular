---
name: deploy-check
description: Vérifie en lecture seule la configuration de déploiement d'un projet static-angular-aws - placeholders et policies OIDC, workflows, CloudFront Function générée et contrôlée, variables GitHub de l'environnement production, bucket privé, OAC, association de la Function, pages d'erreur, options coûteuses.
argument-hint: [--aws] [--github]
disable-model-invocation: true
allowed-tools: Bash(node *deploy-check.mjs*)
---

# /deploy-check

Lancer depuis la racine du projet :

```bash
node "${CLAUDE_SKILL_DIR}/scripts/deploy-check.mjs" --root . $ARGUMENTS
```

- Sans option : contrôles locaux seulement (aucun réseau).
- `--github` : variables de l'environnement `production` via `gh` (connecté).
- `--aws` : appels AWS **en lecture seule et gratuits** (`sts get-caller-identity`, `s3api get-public-access-block`,
  `cloudfront get-distribution-config`, `cloudfront describe-function`). Demander à l'utilisateur avant
  si le profil AWS actif n'est pas évident ; ne jamais lancer de commande qui crée, modifie ou facture,
  ni l'API Cost Explorer.

Puis expliquer chaque ✘ avec sa correction (skills `github-actions-oidc-deploy` et `aws-static-hosting`,
tableaux « Pièges déjà rencontrés ») et proposer les commandes, **sans les exécuter**.
