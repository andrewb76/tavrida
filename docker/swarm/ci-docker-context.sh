#!/usr/bin/env bash
# Create Docker context pointing at remote Swarm manager over SSH.
#
# Env:
#   DEV_SWARM_SSH_HOST   e.g. 193.142.148.175  (or hostname)
#   DEV_SWARM_SSH_USER   e.g. deploy
#   DOCKER_CONTEXT       default: dev-swarm
set -euo pipefail

CONTEXT_NAME="${DOCKER_CONTEXT:-dev-swarm}"
HOST="${DEV_SWARM_SSH_HOST:?DEV_SWARM_SSH_HOST is required}"
USER="${DEV_SWARM_SSH_USER:?DEV_SWARM_SSH_USER is required}"

mkdir -p ~/.ssh
chmod 700 ~/.ssh
ssh-keyscan -H "$HOST" >>~/.ssh/known_hosts 2>/dev/null || true

if docker context inspect "$CONTEXT_NAME" >/dev/null 2>&1; then
  docker context rm -f "$CONTEXT_NAME" >/dev/null
fi

docker context create "$CONTEXT_NAME" --docker "host=ssh://${USER}@${HOST}"
docker --context "$CONTEXT_NAME" info --format 'Swarm={{.Swarm.LocalNodeState}} Context={{.Name}}' >&2

echo "DOCKER_CONTEXT=${CONTEXT_NAME}" >&2
