#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-${ROOT}/docker/swarm/dev.env}"
STACK_NAME="${STACK_NAME:-tavrida-dev}"
DOCKER_CONTEXT="${DOCKER_CONTEXT:-}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing ${ENV_FILE}. Copy from dev.env.example" >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a && source "$ENV_FILE" && set +a

docker_cmd=(docker)
if [[ -n "$DOCKER_CONTEXT" ]]; then
  docker_cmd=(docker --context "$DOCKER_CONTEXT")
fi

if ! "${docker_cmd[@]}" info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null | grep -q active; then
  if [[ -z "$DOCKER_CONTEXT" ]]; then
    echo "Initializing Docker Swarm (single-node dev)..." >&2
    docker swarm init || true
  else
    echo "Context '${DOCKER_CONTEXT}' is not an active Swarm manager." >&2
    exit 1
  fi
fi

echo "Deploying stack ${STACK_NAME} (infra + platform)..." >&2
echo "Ensure secrets are synced: DOCKER_CONTEXT=${DOCKER_CONTEXT:-default} ./docker/swarm/sync-secrets-dev.sh" >&2

"${docker_cmd[@]}" stack deploy \
  --with-registry-auth \
  --resolve-image always \
  -c "${ROOT}/docker/swarm/stack-infra.dev.yml" \
  -c "${ROOT}/docker/swarm/stack-platform.dev.yml" \
  "$STACK_NAME"

echo "Done. URLs (after LE certs propagate):" >&2
echo "  App:      https://app.${DEV_DOMAIN}" >&2
echo "  API/BFF:  https://api.${DEV_DOMAIN}/api/v1" >&2
echo "  MinIO:    https://s3.${DEV_DOMAIN}" >&2
echo "  imgproxy: https://img.${DEV_DOMAIN}" >&2
echo "  Traefik:  https://traefik.${DEV_DOMAIN}" >&2
