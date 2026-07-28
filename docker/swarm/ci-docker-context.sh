#!/usr/bin/env bash
# Create Docker context pointing at remote Swarm manager.
#
# CI path: SSH-forward remote /var/run/docker.sock → local unix socket, then
# `docker context` uses `unix://…` (one SSH tunnel). Avoids per-API
# `ssh … docker system dial-stdio`, which drops mid `stack deploy` (exit 255).
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
LOCAL_SOCK="${DEV_SWARM_DOCKER_SOCK:-${HOME}/.docker/tavrida-swarm-dev.sock}"

# Force local default context for create/rm/inspect of contexts themselves.
unset DOCKER_CONTEXT || true
unset DOCKER_HOST || true

mkdir -p ~/.ssh ~/.docker
chmod 700 ~/.ssh

# Prefer file-based known_hosts so ssh sees a stable trust store.
KNOWN_HOSTS="${HOME}/.ssh/known_hosts"
SSH_CONFIG="${HOME}/.ssh/config"
touch "$KNOWN_HOSTS"
chmod 600 "$KNOWN_HOSTS"

# Drop any stale / conflicting entries for this host (hashed or plain).
ssh-keygen -R "$HOST" -f "$KNOWN_HOSTS" >/dev/null 2>&1 || true

scan_ok=0
for attempt in 1 2 3 4 5; do
  # stdout = host keys; do not hash (-H) so failures are easier to debug in CI logs
  if keys="$(ssh-keyscan -T 15 -t rsa,ecdsa,ed25519 "$HOST" 2>/tmp/ssh-keyscan.err)"; then
    if [[ -n "${keys}" ]]; then
      printf '%s\n' "$keys" >>"$KNOWN_HOSTS"
      scan_ok=1
      echo "ssh-keyscan: ok for ${HOST} (attempt ${attempt})" >&2
      break
    fi
  fi
  echo "ssh-keyscan: empty/failed for ${HOST} (attempt ${attempt}/5)" >&2
  cat /tmp/ssh-keyscan.err >&2 || true
  sleep 2
done

if [[ "$scan_ok" -ne 1 ]]; then
  echo "FATAL: could not fetch SSH host keys for ${HOST} — refusing to create Docker context." >&2
  echo "Check DEV_SWARM_SSH_HOST, VPS sshd, and GitHub Actions → VPS network path." >&2
  exit 1
fi

# Trust store only — auth comes from ssh-agent (ci-ssh-agent.sh / SSH_AUTH_SOCK).
# Do NOT set IdentitiesOnly=yes without IdentityFile: that ignores the agent.
CM_DIR="${HOME}/.ssh/cm"
mkdir -p "$CM_DIR"
chmod 700 "$CM_DIR"
{
  echo "Host ${HOST}"
  echo "  User ${USER}"
  echo "  StrictHostKeyChecking yes"
  echo "  UserKnownHostsFile ${KNOWN_HOSTS}"
  echo "  PreferredAuthentications publickey"
  echo "  PubkeyAuthentication yes"
  echo "  ConnectTimeout 30"
  echo "  ServerAliveInterval 15"
  # Long stack deploy / secret sync can be quiet on the tunnel; keep SSH alive.
  echo "  ServerAliveCountMax 12"
  echo "  TCPKeepAlive yes"
  echo "  ControlMaster auto"
  echo "  ControlPath ${CM_DIR}/%r@%h:%p"
  echo "  ControlPersist 45m"
  if [[ -n "${SSH_AUTH_SOCK:-}" ]]; then
    echo "  IdentityAgent ${SSH_AUTH_SOCK}"
  fi
} >>"$SSH_CONFIG"
chmod 600 "$SSH_CONFIG"

if [[ -z "${SSH_AUTH_SOCK:-}" ]]; then
  echo "FATAL: SSH_AUTH_SOCK is empty — run ci-ssh-agent.sh first." >&2
  exit 1
fi
if ! ssh-add -l >/dev/null 2>&1; then
  echo "FATAL: ssh-agent has no identities (ssh-add -l failed)." >&2
  exit 1
fi
echo "ssh-agent identities:" >&2
ssh-add -l >&2

# Prove SSH works before opening the docker.sock tunnel.
if ! ssh -o BatchMode=yes -T "${USER}@${HOST}" 'docker version --format "{{.Server.Version}}"'; then
  echo "FATAL: ssh ${USER}@${HOST} failed after known_hosts update." >&2
  echo "Check DEV_SWARM_SSH_KEY matches deploy authorized_keys on the VPS." >&2
  exit 1
fi

# Drop stale ControlMaster / leftover local socket from a previous step.
ssh -O exit "${USER}@${HOST}" >/dev/null 2>&1 || true
rm -f "$LOCAL_SOCK"

# One SSH session forwarding remote docker.sock → local unix socket.
# stack deploy then talks to unix://… (no per-call dial-stdio).
ssh -fN \
  -o BatchMode=yes \
  -o ExitOnForwardFailure=yes \
  -L "${LOCAL_SOCK}:/var/run/docker.sock" \
  "${USER}@${HOST}"

for _ in 1 2 3 4 5 6 7 8 9 10; do
  if [[ -S "$LOCAL_SOCK" ]]; then
    break
  fi
  sleep 0.3
done
if [[ ! -S "$LOCAL_SOCK" ]]; then
  echo "FATAL: local docker.sock tunnel missing at ${LOCAL_SOCK}" >&2
  exit 1
fi
echo "SSH docker.sock tunnel: ${LOCAL_SOCK} ← ${USER}@${HOST}:/var/run/docker.sock" >&2

if docker context inspect "$CONTEXT_NAME" >/dev/null 2>&1; then
  docker context rm -f "$CONTEXT_NAME" >/dev/null
fi

docker context create "$CONTEXT_NAME" --docker "host=unix://${LOCAL_SOCK}"

state="$(
  docker --context "$CONTEXT_NAME" info --format '{{.Swarm.LocalNodeState}}' 2>/tmp/docker-context-info.err \
    || true
)"
if [[ "$state" != "active" ]]; then
  echo "Remote context '${CONTEXT_NAME}' (unix://${LOCAL_SOCK} via ssh ${USER}@${HOST}) Swarm state='${state:-<empty>}' (want active)." >&2
  echo "--- docker info stderr ---" >&2
  cat /tmp/docker-context-info.err >&2 || true
  echo "--- docker info (full) ---" >&2
  docker --context "$CONTEXT_NAME" info >&2 || true
  exit 1
fi

echo "Swarm=active Context=${CONTEXT_NAME} Host=unix://${LOCAL_SOCK} (ssh tunnel ${USER}@${HOST})" >&2
echo "DOCKER_CONTEXT=${CONTEXT_NAME}" >&2
