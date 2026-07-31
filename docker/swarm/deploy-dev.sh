#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-${ROOT}/docker/swarm/dev.env}"
STACK_NAME="${STACK_NAME:-tavrida-dev}"
DOCKER_CONTEXT="${DOCKER_CONTEXT:-}"
# Pre-pull already warms GHCR tags on the node. "always" makes the Swarm manager
# re-query every registry (incl. Docker Hub for imgproxy/alloy) and hangs/fails
# when VPS→registry is flaky. Prefer "changed" (or STACK_DEPLOY_RESOLVE_IMAGE=never).
# After a successful CI pre-pull, prefer "never" (set STACK_DEPLOY_RESOLVE_IMAGE /
# PREPULL_OK) so the manager does not re-query registries mid-deploy.
if [[ -n "${STACK_DEPLOY_RESOLVE_IMAGE:-}" ]]; then
  RESOLVE_IMAGE="${STACK_DEPLOY_RESOLVE_IMAGE}"
elif [[ "${PREPULL_OK:-}" == "1" || "${PREPULL_OK:-}" == "true" ]]; then
  RESOLVE_IMAGE="never"
else
  RESOLVE_IMAGE="changed"
fi

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

COMPOSE_ARGS=(
  -c "${ROOT}/docker/swarm/stack-infra.dev.yml"
  -c "${ROOT}/docker/swarm/stack-platform.dev.yml"
)
if [[ -n "${GRAFANA_CLOUD_PROMETHEUS_URL:-}" ]]; then
  missing=()
  for v in \
    GRAFANA_CLOUD_PROMETHEUS_USERNAME \
    GRAFANA_CLOUD_LOKI_URL \
    GRAFANA_CLOUD_LOKI_USERNAME
  do
    if [[ -z "${!v:-}" ]]; then
      missing+=("$v")
    fi
  done
  if ((${#missing[@]} > 0)); then
    echo "Observability: GRAFANA_CLOUD_PROMETHEUS_URL is set, but Alloy needs metrics/logs Cloud vars." >&2
    echo "Missing: ${missing[*]}" >&2
    echo "Set them in GitHub Environment 'dev' (or dev.env) and redeploy." >&2
    exit 1
  fi
  COMPOSE_ARGS+=(-c "${ROOT}/docker/swarm/stack-tools.dev.yml")
  echo "Observability: Grafana Alloy → Cloud (metrics+logs; traces deferred)" >&2
else
  echo "Observability: skip Alloy (set GRAFANA_CLOUD_PROMETHEUS_URL in dev.env to enable)" >&2
  # Leave orphaned Alloy crashing with an old/empty OTLP config out of the way.
  if "${docker_cmd[@]}" service inspect "${STACK_NAME}_alloy" >/dev/null 2>&1; then
    echo "Observability: removing leftover ${STACK_NAME}_alloy" >&2
    "${docker_cmd[@]}" service rm "${STACK_NAME}_alloy" >/dev/null || true
  fi
fi

echo "Deploying stack ${STACK_NAME} (infra + platform${GRAFANA_CLOUD_PROMETHEUS_URL:+ + tools}) resolve-image=${RESOLVE_IMAGE}..." >&2
echo "Ensure secrets are synced: DOCKER_CONTEXT=${DOCKER_CONTEXT:-default} ./docker/swarm/sync-secrets-dev.sh" >&2

is_retryable_deploy_error() {
  local out="$1"
  # Swarm optimistic concurrency mid multi-service update
  [[ "$out" == *"update out of sequence"* ]] && return 0
  # SSH / docker context tunnel blips (unix socket or dial-stdio)
  [[ "$out" == *"error during connect"* ]] && return 0
  [[ "$out" == *"dial-stdio"* ]] && return 0
  [[ "$out" == *"exit status 255"* ]] && return 0
  [[ "$out" == *"connection reset"* ]] && return 0
  [[ "$out" == *"broken pipe"* ]] && return 0
  [[ "$out" == *"EOF"* ]] && return 0
  [[ "$out" == *"context deadline"* ]] && return 0
  [[ "$out" == *"session closed"* ]] && return 0
  [[ "$out" == *"Unable to connect"* ]] && return 0
  [[ "$out" == *"Cannot connect to the Docker daemon"* ]] && return 0
  # Registry flakiness when resolve-image is not "never"
  [[ "$out" == *"failed to resolve image"* ]] && return 0
  [[ "$out" == *"TLS handshake timeout"* ]] && return 0
  [[ "$out" == *"i/o timeout"* ]] && return 0
  [[ "$out" == *"Error response from daemon"* && "$out" == *"timeout"* ]] && return 0
  return 1
}

# stack deploy is idempotent — safe to re-run after partial updates.
MAX_ATTEMPTS="${STACK_DEPLOY_RETRIES:-12}"
attempt=1
while true; do
  set +e
  out="$("${docker_cmd[@]}" stack deploy \
    --with-registry-auth \
    --resolve-image "$RESOLVE_IMAGE" \
    "${COMPOSE_ARGS[@]}" \
    "$STACK_NAME" 2>&1)"
  rc=$?
  set -e
  printf '%s\n' "$out"

  if [[ "$rc" -eq 0 ]]; then
    break
  fi

  reason="unknown"
  if [[ "$out" == *"update out of sequence"* ]]; then
    reason="update out of sequence"
  elif [[ "$out" == *"failed to resolve image"* ]] \
    || [[ "$out" == *"TLS handshake timeout"* ]] \
    || [[ "$out" == *"i/o timeout"* ]]; then
    reason="registry resolve/timeout"
  elif is_retryable_deploy_error "$out"; then
    reason="SSH/docker connect blip"
  fi

  if is_retryable_deploy_error "$out" && [[ "$attempt" -lt "$MAX_ATTEMPTS" ]]; then
    # Cap backoff so a long flake still finishes within ~CI step budget.
    sleep_s=$((attempt * 3))
    if [[ "$sleep_s" -gt 30 ]]; then
      sleep_s=30
    fi
    echo "stack deploy: ${reason} (attempt ${attempt}/${MAX_ATTEMPTS}), retrying in ${sleep_s}s..." >&2
    # On tunnel errors, briefly poke the API so a dead ControlMaster reconnects.
    "${docker_cmd[@]}" info >/dev/null 2>&1 || true
    sleep "$sleep_s"
    attempt=$((attempt + 1))
    continue
  fi
  echo "stack deploy: giving up after ${attempt} attempt(s) (rc=${rc}, reason=${reason})" >&2
  exit "$rc"
done

echo "Done. URLs (after LE certs propagate):" >&2
echo "  App:      https://app.${DEV_DOMAIN}" >&2
echo "  API/BFF:  https://api.${DEV_DOMAIN}/api/v1" >&2
echo "  MinIO:    https://s3.${DEV_DOMAIN}" >&2
echo "  imgproxy: https://img.${DEV_DOMAIN}" >&2
echo "  Traefik:  https://traefik.${DEV_DOMAIN}" >&2
