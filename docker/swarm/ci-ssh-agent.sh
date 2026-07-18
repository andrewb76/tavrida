#!/usr/bin/env bash
# Load DEV_SWARM_SSH_KEY into ssh-agent for CI Docker context over SSH.
#
# Secret may be:
#   1) base64 of the private key file (preferred — one line, no paste corruption)
#      base64 -w0 tavrida-dev-swarm   # Linux
#      base64 < tavrida-dev-swarm | tr -d '\n'   # macOS
#   2) raw OpenSSH private key (multiline) — CRLF stripped, trailing LF ensured
#
# Exports SSH_AUTH_SOCK / SSH_AGENT_PID to GITHUB_ENV when present.
set -euo pipefail

KEY_RAW="${DEV_SWARM_SSH_KEY:?DEV_SWARM_SSH_KEY is required}"

eval "$(ssh-agent -s)"
if [[ -n "${GITHUB_ENV:-}" ]]; then
  {
    echo "SSH_AUTH_SOCK=${SSH_AUTH_SOCK}"
    echo "SSH_AGENT_PID=${SSH_AGENT_PID}"
  } >>"$GITHUB_ENV"
fi

KEY_FILE="$(mktemp)"
cleanup() { rm -f "$KEY_FILE"; }
trap cleanup EXIT

if [[ "$KEY_RAW" == *"BEGIN OPENSSH PRIVATE KEY"* ]] || [[ "$KEY_RAW" == *"BEGIN RSA PRIVATE KEY"* ]]; then
  printf '%s' "$KEY_RAW" | tr -d '\r' >"$KEY_FILE"
else
  # single-line base64 (or base64 with incidental whitespace)
  printf '%s' "$KEY_RAW" | tr -d '\r\n\t ' | base64 -d >"$KEY_FILE"
fi

# OpenSSH requires a trailing newline after END line
if [[ -s "$KEY_FILE" ]] && [[ "$(tail -c1 "$KEY_FILE" | wc -l)" -eq 0 ]]; then
  printf '\n' >>"$KEY_FILE"
fi

chmod 600 "$KEY_FILE"
ssh-add "$KEY_FILE"
echo "ssh-agent: key loaded ($(ssh-add -l | wc -l) identities)" >&2
