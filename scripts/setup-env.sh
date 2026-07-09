#!/usr/bin/env sh
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_EXAMPLE="$ROOT/.env.example"
ENV_LOCAL="$ROOT/.env.local"

if [ -f "$ENV_LOCAL" ]; then
  echo "✓ $ENV_LOCAL already exists"
  node "$ROOT/scripts/merge-env-example.mjs"
else
  cp "$ENV_EXAMPLE" "$ENV_LOCAL"
  echo "Created $ENV_LOCAL from .env.example"
  echo "Edit it: add VITE_LOGTO_ENDPOINT and VITE_LOGTO_APP_ID for Logto auth"
fi

node "$ROOT/scripts/check-logto-env.mjs"
