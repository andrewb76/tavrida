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

# Prefer file-based known_hosts so Docker's `ssh … docker system dial-stdio` sees the same trust as we do.
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
{
  echo "Host ${HOST}"
  echo "  User ${USER}"
  echo "  StrictHostKeyChecking yes"
  echo "  UserKnownHostsFile ${KNOWN_HOSTS}"
  echo "  PreferredAuthentications publickey"
  echo "  PubkeyAuthentication yes"
  echo "  ConnectTimeout 30"
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

# Prove SSH works before Docker wraps it (clearer errors than dial-stdio).
if ! ssh -o BatchMode=yes -T "${USER}@${HOST}" 'docker version --format "{{.Server.Version}}"'; then
  echo "FATAL: ssh ${USER}@${HOST} failed after known_hosts update." >&2
  echo "Check DEV_SWARM_SSH_KEY matches deploy authorized_keys on the VPS." >&2
  exit 1
fi

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
