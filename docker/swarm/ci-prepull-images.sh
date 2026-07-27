#!/usr/bin/env bash
# Pre-pull GHCR images onto the Swarm node (via DOCKER_CONTEXT / docker.sock tunnel).
# Avoids task Rejected "No such image" when registry auth on the node is missing/stale:
# pull uses the CI client's ~/.docker/config.json (after ghcr login) against the remote daemon.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-${ROOT}/docker/swarm/dev.env}"
DOCKER_CONTEXT="${DOCKER_CONTEXT:-}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing ${ENV_FILE}" >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a && source "$ENV_FILE" && set +a

REGISTRY="${GHCR_REGISTRY:-ghcr.io}"
OWNER="${GHCR_OWNER:-andrewb76}"
TAG="${GIT_SHA:?GIT_SHA is required in dev.env}"

docker_cmd=(docker)
if [[ -n "$DOCKER_CONTEXT" ]]; then
  docker_cmd=(docker --context "$DOCKER_CONTEXT")
fi

IMAGES=(
  tavrida-billing
  tavrida-plan-config
  tavrida-auction
  tavrida-subscriptions
  tavrida-user-profile
  tavrida-scalar-config
  tavrida-forum
  tavrida-periods
  tavrida-marketplace
  tavrida-notifications
  tavrida-chat
  tavrida-bff
  tavrida-deal-feedback
  tavrida-frontend
)

echo "Pre-pull ${#IMAGES[@]} images ${REGISTRY}/${OWNER}/*:${TAG} (context=${DOCKER_CONTEXT:-default})" >&2

failed=0
for name in "${IMAGES[@]}"; do
  image="${REGISTRY}/${OWNER}/${name}:${TAG}"
  echo "==> pull ${image}" >&2
  if ! "${docker_cmd[@]}" pull "$image"; then
    echo "WARN: pull failed: ${image}" >&2
    failed=$((failed + 1))
  fi
done

if [[ "$failed" -gt 0 ]]; then
  echo "FATAL: ${failed} image pull(s) failed — check ghcr login and package visibility." >&2
  exit 1
fi

echo "Pre-pull done." >&2
