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

if ! state="$("${docker_cmd[@]}" info --format '{{.Swarm.LocalNodeState}}' 2>/tmp/deploy-swarm-info.err)"; then
  state=""
fi
if [[ "$state" != "active" ]]; then
  if [[ -z "$DOCKER_CONTEXT" ]]; then
    echo "Initializing Docker Swarm (single-node dev)..." >&2
    docker swarm init || true
  else
    echo "Context '${DOCKER_CONTEXT}' is not an active Swarm manager (state='${state:-<empty>})." >&2
    cat /tmp/deploy-swarm-info.err >&2 || true
    "${docker_cmd[@]}" info >&2 || true
    exit 1
  fi
fi

echo "Deploying stack ${STACK_NAME} (infra + platform)..." >&2
echo "Ensure secrets are synced: DOCKER_CONTEXT=${DOCKER_CONTEXT:-default} ./docker/swarm/sync-secrets-dev.sh" >&2

# Swarm optimistic concurrency: concurrent/internal version bumps can yield
# "update out of sequence" mid stack deploy — retry is the usual workaround.
MAX_ATTEMPTS="${STACK_DEPLOY_RETRIES:-5}"
attempt=1
while true; do
  set +e
  out="$("${docker_cmd[@]}" stack deploy \
    --with-registry-auth \
    --resolve-image always \
    -c "${ROOT}/docker/swarm/stack-infra.dev.yml" \
    -c "${ROOT}/docker/swarm/stack-platform.dev.yml" \
    "$STACK_NAME" 2>&1)"
  rc=$?
  set -e
  printf '%s\n' "$out"

  if [[ "$rc" -eq 0 ]]; then
    break
  fi
  if [[ "$out" == *"update out of sequence"* ]] && [[ "$attempt" -lt "$MAX_ATTEMPTS" ]]; then
    echo "stack deploy: update out of sequence (attempt ${attempt}/${MAX_ATTEMPTS}), retrying in ${attempt}s..." >&2
    sleep "$attempt"
    attempt=$((attempt + 1))
    continue
  fi
  exit "$rc"
done

echo "Done. URLs (after LE certs propagate):" >&2
echo "  App:      https://app.${DEV_DOMAIN}" >&2
echo "  API/BFF:  https://api.${DEV_DOMAIN}/api/v1" >&2
echo "  MinIO:    https://s3.${DEV_DOMAIN}" >&2
echo "  imgproxy: https://img.${DEV_DOMAIN}" >&2
echo "  Traefik:  https://traefik.${DEV_DOMAIN}" >&2
