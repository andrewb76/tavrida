#!/usr/bin/env bash
# Prune old GHCR container package versions for tavrida-* images.
#
# Keeps:
#   - any version that has a protected tag (default: dev, latest)
#   - the newest KEEP_LAST versions per package (by updated_at)
#
# Usage:
#   export GHCR_OWNER=andrewb76   # user or org login
#   ./docker/swarm/prune-ghcr-dev.sh
#   KEEP_LAST=5 DRY_RUN=1 ./docker/swarm/prune-ghcr-dev.sh
#
# Requires: gh auth (GITHUB_TOKEN with packages:read + packages:delete / write)
set -euo pipefail

OWNER="${GHCR_OWNER:-${GITHUB_REPOSITORY_OWNER:-andrewb76}}"
KEEP_LAST="${KEEP_LAST:-10}"
KEEP_TAGS="${KEEP_TAGS:-dev,latest}"
DRY_RUN="${DRY_RUN:-0}"
# user | org — auto: if OWNER matches github.actor / user, use user API
API_SCOPE="${GHCR_API_SCOPE:-auto}"

PACKAGES=(
  tavrida-bff
  tavrida-billing
  tavrida-plan-config
  tavrida-auction
  tavrida-subscriptions
  tavrida-user-profile
  tavrida-scalar-config
  tavrida-forum
  tavrida-periods
  tavrida-marketplace
  tavrida-chat
  tavrida-frontend
)

IFS=',' read -r -a PROTECTED_TAGS <<<"$KEEP_TAGS"

resolve_scope() {
  if [[ "$API_SCOPE" != "auto" ]]; then
    echo "$API_SCOPE"
    return
  fi
  if gh api "users/${OWNER}" --jq '.type' 2>/dev/null | grep -qi Organization; then
    echo org
  else
    echo user
  fi
}

versions_path() {
  local pkg="$1" scope="$2"
  if [[ "$scope" == "org" ]]; then
    echo "orgs/${OWNER}/packages/container/${pkg}/versions"
  else
    echo "users/${OWNER}/packages/container/${pkg}/versions"
  fi
}

has_protected_tag() {
  local tags_json="$1"
  local t
  for t in "${PROTECTED_TAGS[@]}"; do
    t="${t// /}"
    [[ -z "$t" ]] && continue
    if echo "$tags_json" | jq -e --arg t "$t" 'index($t) != null' >/dev/null 2>&1; then
      return 0
    fi
  done
  return 1
}

prune_package() {
  local pkg="$1" scope="$2" path
  path="$(versions_path "$pkg" "$scope")"

  echo "==> ${OWNER}/${pkg} (keep ${KEEP_LAST} + tags: ${KEEP_TAGS})" >&2

  local versions
  if ! versions="$(gh api "$path" --paginate -q '.' 2>/dev/null)"; then
    echo "  skip: package not found or no access" >&2
    return 0
  fi

  # Flatten paginated arrays → one array sorted by updated_at desc
  local sorted
  sorted="$(echo "$versions" | jq -s 'add | sort_by(.updated_at) | reverse')"

  local count
  count="$(echo "$sorted" | jq 'length')"
  if [[ "$count" -eq 0 ]]; then
    echo "  (empty)" >&2
    return 0
  fi

  local i=0
  while IFS= read -r row; do
    local id tags updated
    id="$(echo "$row" | jq -r '.id')"
    updated="$(echo "$row" | jq -r '.updated_at')"
    tags="$(echo "$row" | jq -c '.metadata.container.tags // []')"

    i=$((i + 1))
    if has_protected_tag "$tags"; then
      echo "  keep #${i} id=${id} (protected tag) tags=${tags} ${updated}" >&2
      continue
    fi
    if [[ "$i" -le "$KEEP_LAST" ]]; then
      echo "  keep #${i} id=${id} (within KEEP_LAST) tags=${tags} ${updated}" >&2
      continue
    fi

    if [[ "$DRY_RUN" == "1" ]]; then
      echo "  [dry-run] delete id=${id} tags=${tags} ${updated}" >&2
    else
      echo "  delete id=${id} tags=${tags} ${updated}" >&2
      gh api --method DELETE "${path}/${id}" >/dev/null
    fi
  done < <(echo "$sorted" | jq -c '.[]')
}

SCOPE="$(resolve_scope)"
echo "Prune GHCR owner=${OWNER} scope=${SCOPE} KEEP_LAST=${KEEP_LAST} DRY_RUN=${DRY_RUN}" >&2

for pkg in "${PACKAGES[@]}"; do
  prune_package "$pkg" "$SCOPE"
done

echo "Done." >&2
