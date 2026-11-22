#!/usr/bin/env bash
# Synchronise un dossier de build vers S3 (appelé par .github/workflows/deploy.yml).
#
#   scripts/deploy-s3.sh <dossier source> <s3://bucket/préfixe/> [--exclude <motif>]...
#
# Quatre passes, chacune avec --delete (les fichiers retirés du build disparaissent du bucket) :
# 1. *.js, *.css   noms hashés par le build        public,max-age=31536000,immutable  (--size-only)
# 2. documents     *.html, *.json, *.xml, *.txt…   no-cache                            (date + taille)
# 3. *.webp        images converties               public,max-age=604800, image/webp   (--size-only)
# 4. le reste      svg, mp4, jpg, ico…             public,max-age=604800               (--size-only)
#
# Rapidité : le build recopie les fichiers avec une date récente, ce qui ferait renvoyer toutes les
# images à chaque déploiement. --size-only ne renvoie que les fichiers dont la taille change : sûr pour
# les fichiers hashés et les images (une image modifiée change de taille ; à défaut, renommer le fichier).
# Les documents HTML/JSON, dont le contenu peut changer à taille égale, gardent la comparaison par date.
# Les --exclude supplémentaires protègent un sous-dossier (ex. en/* lors de la synchro du français).
#
# Variables (docs/data-s3.md §7) :
#   SYNC_DOCS=changed  passe 2 par scripts/sync-changed.mjs : seuls les documents dont le contenu a
#                      changé sont envoyés (MD5 local comparé à l'ETag S3), au lieu de la date ;
#   SKIP_STATIC=1      passes 3 et 4 ignorées (publication de l'admin : les images du site et les
#                      vidéos viennent du dépôt, elles ne changent pas avec les données).
# Les photos de produits ne sont plus dans le build : elles sont servies par CloudFront depuis le
# bucket de données (/images/products/*), que ce script ne touche jamais.
set -euo pipefail

SRC="${1:?dossier source manquant}"
DEST="${2:?destination s3:// manquante}"
shift 2
PROTECT=("$@")

sync() {
  aws s3 sync "$SRC" "$DEST" --delete --only-show-errors --no-progress "$@" "${PROTECT[@]}"
}

DOCS=(--include '*.html' --include '*.json' --include '*.xml' --include '*.txt' --include '_redirects')

# 1. Fichiers hashés
sync --size-only --exclude '*' --include '*.js' --include '*.css' \
  --cache-control 'public,max-age=31536000,immutable'

# 2. Documents toujours revalidés
if [ "${SYNC_DOCS:-}" = "changed" ]; then
  rest="${DEST#s3://}"
  bucket="${rest%%/*}"
  prefix="${rest#*/}"
  [ "$prefix" = "$rest" ] && prefix=""
  changed_args=()
  [ -n "$prefix" ] && changed_args+=(--prefix "$prefix")
  # --exclude 'en/*' devient --exclude-prefix en/
  for ((i = 0; i < ${#PROTECT[@]}; i++)); do
    if [ "${PROTECT[$i]}" = "--exclude" ]; then
      pattern="${PROTECT[$((i + 1))]}"
      changed_args+=(--exclude-prefix "${prefix}${pattern%\*}")
    fi
  done
  node "$(dirname "$0")/sync-changed.mjs" "$SRC" "$bucket" "${changed_args[@]}"
else
  sync --exclude '*' "${DOCS[@]}" --cache-control 'no-cache'
fi

if [ "${SKIP_STATIC:-}" = "1" ]; then
  echo "deploy-s3 : images et fichiers statiques ignorés (SKIP_STATIC=1)"
  exit 0
fi

# 3. Images WebP (type MIME forcé : la détection automatique n'est pas fiable partout)
sync --size-only --exclude '*' --include '*.webp' \
  --cache-control 'public,max-age=604800' --content-type 'image/webp'

# 4. Le reste
sync --size-only --exclude '*.js' --exclude '*.css' --exclude '*.webp' \
  --exclude '*.html' --exclude '*.json' --exclude '*.xml' --exclude '*.txt' --exclude '_redirects' \
  --cache-control 'public,max-age=604800'
