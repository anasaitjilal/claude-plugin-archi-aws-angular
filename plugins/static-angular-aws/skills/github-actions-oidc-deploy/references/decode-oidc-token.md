# Lire le `sub` exact du jeton OIDC

Ajouter **temporairement** cette étape avant `configure-aws-credentials` (dans le job qui a
`environment: production` et `permissions: id-token: write`), lancer le workflow, recopier le `sub`
dans `trust-policy.json`, puis **retirer l'étape**. Le jeton n'est pas affiché, seules ses revendications.

```yaml
- name: Revendications OIDC (temporaire)
  run: |
    token=$(curl -sS -H "Authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" \
      "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=sts.amazonaws.com" | jq -r .value)
    p=$(echo "$token" | cut -d. -f2 | tr '_-' '/+'); while [ $(( ${#p} % 4 )) -ne 0 ]; do p="$p="; done
    echo "$p" | base64 -d | jq '{sub, aud, environment, repository}'
```

Formats possibles du `sub` :

- `repo:<OWNER>/<REPO>:environment:production`
- `repo:<OWNER>@<OWNER_ID>/<REPO>@<REPO_ID>:environment:production` (identifiants immuables)

La condition `aud` vaut toujours `sts.amazonaws.com`.
