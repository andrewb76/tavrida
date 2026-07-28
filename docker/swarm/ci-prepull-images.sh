#!/usr/bin/env bash
# Pre-pull GHCR images onto the Swarm node before stack deploy.
# Avoids task Rejected "No such image" when private packages cannot be pulled
# with missing/stale Swarm registry auth.
#
# Preferred path: SSH to the node and `docker pull` there (after login).
# Image layers never traverse the CI↔VPS tunnel; only a thin SSH session does.
# Fallback: docker --context (unix sock tunnel / local) — used for laptop deploys.
#
# Env:
#   GIT_SHA / GHCR_*          from docker/swarm/dev.env (or caller)
#   DOCKER_CONTEXT            optional; fallback pull path
#   DEV_SWARM_SSH_HOST/USER   preferred remote pull path
#   GHCR_USER / GHCR_TOKEN    required for remote login (Actions: github.actor + GITHUB_TOKEN)
#   PREPULL_RETRIES           attempts per image (default 3)
#   PREPULL_RETRY_SLEEP_S     base sleep between retries (default 5)
#   PREPULL_PARALLEL          concurrent pulls on the node (default 3)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-${ROOT}/docker/swarm/dev.env}"
DOCKER_CONTEXT="${DOCKER_CONTEXT:-}"
RETRIES="${PREPULL_RETRIES:-3}"
RETRY_SLEEP_S="${PREPULL_RETRY_SLEEP_S:-5}"
PARALLEL="${PREPULL_PARALLEL:-3}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing ${ENV_FILE}" >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a && source "$ENV_FILE" && set +a

REGISTRY="${GHCR_REGISTRY:-ghcr.io}"
OWNER="${GHCR_OWNER:-andrewb76}"
TAG="${GIT_SHA:?GIT_SHA is required in dev.env}"

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

pull_one_local() {
  local image="$1"
  local attempt=1
  local docker_cmd=(docker)
  if [[ -n "$DOCKER_CONTEXT" ]]; then
    docker_cmd=(docker --context "$DOCKER_CONTEXT")
  fi
  if "${docker_cmd[@]}" image inspect "$image" >/dev/null 2>&1; then
    echo "==> skip ${image} (already present)" >&2
    return 0
  fi
  while [[ "$attempt" -le "$RETRIES" ]]; do
    echo "==> pull ${image} (attempt ${attempt}/${RETRIES}, context=${DOCKER_CONTEXT:-default})" >&2
    if "${docker_cmd[@]}" pull "$image"; then
      return 0
    fi
    echo "WARN: pull failed: ${image} (attempt ${attempt}/${RETRIES})" >&2
    if [[ "$attempt" -lt "$RETRIES" ]]; then
      sleep $((RETRY_SLEEP_S * attempt))
    fi
    attempt=$((attempt + 1))
  done
  return 1
}

pull_via_ssh() {
  local host="$1"
  local user="$2"
  local target="${user}@${host}"

  if [[ -z "${GHCR_TOKEN:-}" || -z "${GHCR_USER:-}" ]]; then
    echo "FATAL: remote pre-pull needs GHCR_USER + GHCR_TOKEN (workflow login on the node)." >&2
    exit 1
  fi

  echo "Pre-pull ${#IMAGES[@]} images ${REGISTRY}/${OWNER}/*:${TAG} via ssh ${target} (parallel=${PARALLEL})" >&2

  # One SSH session: login + bounded-parallel pulls. Layers stay on the VPS.
  # shellcheck disable=SC2029
  ssh -o BatchMode=yes -o ConnectTimeout=30 \
    -o ServerAliveInterval=15 -o ServerAliveCountMax=20 \
    "$target" \
    env \
      GHCR_TOKEN="$GHCR_TOKEN" \
      GHCR_USER="$GHCR_USER" \
      REGISTRY="$REGISTRY" \
      OWNER="$OWNER" \
      TAG="$TAG" \
      RETRIES="$RETRIES" \
      RETRY_SLEEP_S="$RETRY_SLEEP_S" \
      PARALLEL="$PARALLEL" \
      bash -s <<'REMOTE'
set -euo pipefail

echo "$GHCR_TOKEN" | docker login "$REGISTRY" -u "$GHCR_USER" --password-stdin >/dev/null

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

pull_one() {
  local name="$1"
  local image="${REGISTRY}/${OWNER}/${name}:${TAG}"
  if docker image inspect "$image" >/dev/null 2>&1; then
    echo "==> skip ${image} (already present)" >&2
    return 0
  fi
  local attempt=1
  while [[ "$attempt" -le "$RETRIES" ]]; do
    echo "==> pull ${image} (attempt ${attempt}/${RETRIES})" >&2
    if docker pull "$image"; then
      return 0
    fi
    echo "WARN: pull failed: ${image} (attempt ${attempt}/${RETRIES})" >&2
    if [[ "$attempt" -lt "$RETRIES" ]]; then
      sleep $((RETRY_SLEEP_S * attempt))
    fi
    attempt=$((attempt + 1))
  done
  return 1
}

fail_file="$(mktemp)"
pids=()
for name in "${IMAGES[@]}"; do
  while [[ "${#pids[@]}" -ge "$PARALLEL" ]]; do
    pid="${pids[0]}"
    pids=("${pids[@]:1}")
    if ! wait "$pid"; then
      true # failure recorded by child
    fi
  done
  (
    if ! pull_one "$name"; then
      echo "$name" >>"$fail_file"
    fi
  ) &
  pids+=("$!")
done
for pid in "${pids[@]}"; do
  wait "$pid" || true
done

failed=0
if [[ -s "$fail_file" ]]; then
  failed="$(wc -l <"$fail_file" | tr -d ' ')"
  echo "FATAL: ${failed} image pull(s) failed on node:" >&2
  sort -u "$fail_file" >&2
  rm -f "$fail_file"
  echo "Check GHCR auth, package visibility, VPS→ghcr.io network." >&2
  exit 1
fi
rm -f "$fail_file"
echo "Pre-pull done (ssh)." >&2
REMOTE
}

pull_via_context() {
  echo "Pre-pull ${#IMAGES[@]} images ${REGISTRY}/${OWNER}/*:${TAG} (context=${DOCKER_CONTEXT:-default})" >&2
  local failed=0
  local name image
  for name in "${IMAGES[@]}"; do
    image="${REGISTRY}/${OWNER}/${name}:${TAG}"
    if ! pull_one_local "$image"; then
      failed=$((failed + 1))
    fi
  done
  if [[ "$failed" -gt 0 ]]; then
    echo "FATAL: ${failed} image pull(s) failed — check ghcr login and package visibility." >&2
    exit 1
  fi
  echo "Pre-pull done." >&2
}

if [[ -n "${DEV_SWARM_SSH_HOST:-}" && -n "${DEV_SWARM_SSH_USER:-}" ]]; then
  pull_via_ssh "$DEV_SWARM_SSH_HOST" "$DEV_SWARM_SSH_USER"
else
  pull_via_context
fi
