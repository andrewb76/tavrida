#!/usr/bin/env bash
# Create Docker context pointing at remote Swarm manager over SSH.
#
# Env:
#   DEV_SWARM_SSH_HOST   e.g. 193.142.148.175  (or hostname)
#   DEV_SWARM_SSH_USER   e.g. deploy
#   DEV_SWARM_CONTEXT    context name (default: dev-swarm)
#
# Important: do not export DOCKER_CONTEXT while creating/removing the context —
# the CLI would try to use that (missing/broken) context for the management calls.
set -euo pipefail

CONTEXT_NAME="${DEV_SWARM_CONTEXT:-dev-swarm}"
HOST="${DEV_SWARM_SSH_HOST:?DEV_SWARM_SSH_HOST is required}"
USER="${DEV_SWARM_SSH_USER:?DEV_SWARM_SSH_USER is required}"

# Force local default context for create/rm/inspect of contexts themselves.
unset DOCKER_CONTEXT || true

mkdir -p ~/.ssh
chmod 700 ~/.ssh
ssh-keyscan -H "$HOST" >>~/.ssh/known_hosts 2>/dev/null || true

if docker context inspect "$CONTEXT_NAME" >/dev/null 2>&1; then
  docker context rm -f "$CONTEXT_NAME" >/dev/null
fi

docker context create "$CONTEXT_NAME" --docker "host=ssh://${USER}@${HOST}"

state="$(
  docker --context "$CONTEXT_NAME" info --format '{{.Swarm.LocalNodeState}}' 2>/tmp/docker-context-info.err \
    || true
)"
if [[ "$state" != "active" ]]; then
  echo "Remote context '${CONTEXT_NAME}' (ssh://${USER}@${HOST}) Swarm state='${state:-<empty>}' (want active)." >&2
  echo "--- docker info stderr ---" >&2
  cat /tmp/docker-context-info.err >&2 || true
  echo "--- docker info (full) ---" >&2
  docker --context "$CONTEXT_NAME" info >&2 || true
  exit 1
fi

echo "Swarm=active Context=${CONTEXT_NAME} Host=ssh://${USER}@${HOST}" >&2
echo "DOCKER_CONTEXT=${CONTEXT_NAME}" >&2
