#!/usr/bin/env bash
# Push dev secrets to Docker Swarm (remote via named context).
#
#   cp docker/swarm/dev.env.example docker/swarm/dev.env
#   cp docker/swarm/dev.secrets.env.example docker/swarm/dev.secrets.env
#   docker context create dev-swarm --docker "host=ssh://user@193.142.148.175"
#   DOCKER_CONTEXT=dev-swarm ./docker/swarm/sync-secrets-dev.sh
#
# Swarm secrets are immutable. `--force` rotates in-use secrets via a temporary
# `*__next` secret + service rebind (cannot `secret rm` while referenced).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DOCKER_CONTEXT="${DOCKER_CONTEXT:-dev-swarm}"
SECRET_PREFIX="${SECRET_PREFIX:-tavrida_dev}"
CONFIG_FILE="${CONFIG_FILE:-${ROOT}/docker/swarm/dev.env}"
ENV_FILE="${ENV_FILE:-${ROOT}/docker/swarm/dev.secrets.env}"
MANIFEST="${MANIFEST:-${ROOT}/docker/swarm/secrets-manifest.dev}"
STACK_NAME="${STACK_NAME:-tavrida-dev}"
NEXT_SUFFIX="__next"

DRY_RUN=0
FORCE=0
PRUNE=0

COMPUTED_KEYS=(
  RABBITMQ_URL
  BILLING_DATABASE_URL
  PLAN_CONFIG_DATABASE_URL
  AUCTION_DATABASE_URL
  SUBSCRIPTIONS_DATABASE_URL
  USER_PROFILE_DATABASE_URL
  SCALAR_CONFIG_DATABASE_URL
  FORUM_DATABASE_URL
  PERIODS_DATABASE_URL
  MARKETPLACE_DATABASE_URL
  NOTIFICATIONS_DATABASE_URL
  BFF_DATABASE_URL
  CHAT_DATABASE_URL
)

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Sync Swarm secrets from dev.env + dev.secrets.env to context "${DOCKER_CONTEXT}".
Prefix: ${SECRET_PREFIX}_*

Options:
  --dry-run       Show actions without creating/removing secrets
  --force         Rotate existing secrets (rebind services if still referenced)
  --prune         Remove ${SECRET_PREFIX}_* secrets not in manifest/computed set
  --context NAME  Docker context (default: dev-swarm)
  --env-file PATH Secrets env file (default: docker/swarm/dev.secrets.env)
  --config-file PATH Public config (default: docker/swarm/dev.env)
  -h, --help      This help

After changing secrets: redeploy (or use workflow redeploy=true)
  DOCKER_CONTEXT=${DOCKER_CONTEXT} ./docker/swarm/deploy-dev.sh
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1 ;;
    --force) FORCE=1 ;;
    --prune) PRUNE=1 ;;
    --context) DOCKER_CONTEXT="$2"; shift ;;
    --env-file) ENV_FILE="$2"; shift ;;
    --config-file) CONFIG_FILE="$2"; shift ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "Missing ${CONFIG_FILE}. Copy from dev.env.example" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing ${ENV_FILE}. Copy from dev.secrets.env.example" >&2
  exit 1
fi

docker_ctx() {
  docker --context "$DOCKER_CONTEXT" "$@"
}

if ! docker_ctx info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null | grep -q active; then
  echo "Context '${DOCKER_CONTEXT}' is not an active Swarm manager." >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a && source "$CONFIG_FILE" && source "$ENV_FILE" && set +a

build_computed_secrets() {
  RABBITMQ_URL="amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@rabbitmq:5672"
  BILLING_DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?sslmode=disable&search_path=billing"
  PLAN_CONFIG_DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?sslmode=disable&search_path=plan_config"
  AUCTION_DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?sslmode=disable&search_path=auction"
  SUBSCRIPTIONS_DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?sslmode=disable&search_path=subscriptions"
  USER_PROFILE_DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?sslmode=disable&search_path=user_profile"
  SCALAR_CONFIG_DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?sslmode=disable&search_path=scalar_config"
  FORUM_DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?sslmode=disable&search_path=forum"
  PERIODS_DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?sslmode=disable&search_path=periods"
  MARKETPLACE_DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?sslmode=disable&search_path=marketplace"
  NOTIFICATIONS_DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?sslmode=disable&search_path=notifications"
  BFF_DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?sslmode=disable&search_path=bff"
  CHAT_DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?sslmode=disable&search_path=chat"
}

build_computed_secrets

secret_full_name() {
  local key="$1"
  echo "${SECRET_PREFIX}_$(echo "$key" | tr '[:upper:]' '[:lower:]')"
}

read_manifest_keys() {
  grep -v '^[[:space:]]*#' "$MANIFEST" | grep -v '^[[:space:]]*$' || true
}

secret_exists() {
  docker_ctx secret inspect "$1" >/dev/null 2>&1
}

remove_secret() {
  local name="$1"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] docker secret rm ${name}"
    return 0
  fi
  docker_ctx secret rm "$name"
  echo "Removed ${name}"
}

create_secret() {
  local name="$1"
  local value="$2"
  if [[ -z "$value" ]]; then
    echo "Skip ${name} — empty value" >&2
    return 0
  fi
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] create secret ${name} (${#value} bytes)"
    return 0
  fi
  if secret_exists "$name"; then
    docker_ctx secret rm "$name" >/dev/null 2>&1 || true
  fi
  printf '%s' "$value" | docker_ctx secret create "$name" -
  echo "Created ${name}"
}

# Lines: SecretName|ServiceName|File.Name (container mount basename)
collect_secret_bindings() {
  local sid svc line sname target
  while IFS= read -r sid; do
    [[ -z "$sid" ]] && continue
    svc="$(docker_ctx service inspect "$sid" --format '{{.Spec.Name}}')"
    while IFS= read -r line; do
      [[ -z "$line" ]] && continue
      sname="${line%%|*}"
      target="${line#*|}"
      [[ -z "$sname" || -z "$target" ]] && continue
      printf '%s|%s|%s\n' "$sname" "$svc" "$target"
    done < <(
      docker_ctx service inspect "$sid" --format \
        '{{range .Spec.TaskTemplate.ContainerSpec.Secrets}}{{.SecretName}}|{{.File.Name}}{{"\n"}}{{end}}' \
        2>/dev/null || true
    )
  done < <(docker_ctx service ls -q)
}

# Args: from_secret to_secret — rebind every consumer of from_secret → to_secret (same target).
# Optional 3rd arg: precomputed "svc|target" lines (skip scanning SECRET_BINDINGS).
rebind_secret_consumers() {
  local from_secret="$1"
  local to_secret="$2"
  local precomputed="${3-}"
  local -a services=()
  local -A targets=()
  local line sname svc target rest svc_name

  if [[ -n "$precomputed" ]]; then
    while IFS= read -r line; do
      [[ -z "$line" ]] && continue
      svc="${line%%|*}"
      target="${line#*|}"
      targets["$svc"]="$target"
      services+=("$svc")
    done <<<"$precomputed"
  else
    while IFS= read -r line; do
      [[ -z "$line" ]] && continue
      sname="${line%%|*}"
      rest="${line#*|}"
      svc="${rest%%|*}"
      target="${rest#*|}"
      if [[ "$sname" == "$from_secret" ]]; then
        targets["$svc"]="$target"
        services+=("$svc")
      fi
    done <<<"$SECRET_BINDINGS"
  fi

  if [[ ${#services[@]} -eq 0 ]]; then
    return 0
  fi
  mapfile -t services < <(printf '%s\n' "${services[@]}" | sort -u)

  for svc_name in "${services[@]}"; do
    target="${targets[$svc_name]}"
    echo "  rebind ${svc_name}: ${from_secret} → ${to_secret} (target=${target})"
    if [[ "$DRY_RUN" -eq 1 ]]; then
      echo "[dry-run] docker service update --secret-rm ${from_secret} --secret-add source=${to_secret},target=${target} ${svc_name}"
      continue
    fi
    docker_ctx service update --detach=false \
      --secret-rm "$from_secret" \
      --secret-add "source=${to_secret},target=${target}" \
      "$svc_name" >/dev/null
  done
}

consumers_of_secret() {
  local secret_name="$1"
  local line sname rest svc target
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    sname="${line%%|*}"
    rest="${line#*|}"
    svc="${rest%%|*}"
    target="${rest#*|}"
    if [[ "$sname" == "$secret_name" ]]; then
      printf '%s|%s\n' "$svc" "$target"
    fi
  done <<<"$SECRET_BINDINGS"
}

rotate_secret() {
  local name="$1"
  local value="$2"
  local next="${name}${NEXT_SUFFIX}"
  local consumers

  echo "Rotating ${name} (in-use safe)..."
  consumers="$(consumers_of_secret "$name")"
  if [[ -z "$consumers" ]]; then
    remove_secret "$name" || true
    create_secret "$name" "$value"
    return 0
  fi

  if secret_exists "$next"; then
    echo "  cleaning leftover ${next}"
    if ! remove_secret "$next" 2>/dev/null; then
      # Leftover next still bound — move those tasks back to canonical if present, else leave
      local leftover
      leftover="$(consumers_of_secret "$next")"
      if [[ -n "$leftover" ]] && secret_exists "$name"; then
        rebind_secret_consumers "$next" "$name" "$leftover"
      fi
      remove_secret "$next" || true
    fi
  fi

  create_secret "$next" "$value"
  rebind_secret_consumers "$name" "$next" "$consumers"
  remove_secret "$name"
  create_secret "$name" "$value"
  rebind_secret_consumers "$next" "$name" "$consumers"
  remove_secret "$next"

  SECRET_BINDINGS="$(collect_secret_bindings)"
}

sync_one() {
  local key="$1"
  local name value
  name="$(secret_full_name "$key")"

  if [[ -z "${!key+x}" ]]; then
    echo "Skip ${name} — \${${key}} not set" >&2
    return 0
  fi

  value="${!key}"
  if [[ -z "$value" ]]; then
    echo "Skip ${name} — empty value" >&2
    return 0
  fi

  if ! secret_exists "$name"; then
    create_secret "$name" "$value"
    return 0
  fi

  if [[ "$FORCE" -ne 1 ]]; then
    echo "Keep ${name} (exists; use --force to rotate)"
    return 0
  fi

  # Try cheap recreate when nothing references the secret.
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] rotate ${name}"
    return 0
  fi

  if docker_ctx secret rm "$name" 2>/dev/null; then
    echo "Removed ${name} (unreferenced)"
    create_secret "$name" "$value"
    return 0
  fi

  rotate_secret "$name" "$value"
}

echo "Syncing secrets → context '${DOCKER_CONTEXT}' (prefix ${SECRET_PREFIX}_)" >&2

SECRET_BINDINGS="$(collect_secret_bindings)"

declare -a ALL_KEYS=()

while IFS= read -r key; do
  ALL_KEYS+=("$key")
  sync_one "$key"
done < <(read_manifest_keys)

for key in "${COMPUTED_KEYS[@]}"; do
  ALL_KEYS+=("$key")
  sync_one "$key"
done

if [[ "$PRUNE" -eq 1 ]]; then
  echo "Pruning orphaned ${SECRET_PREFIX}_* secrets..." >&2
  SECRET_BINDINGS="$(collect_secret_bindings)"
  mapfile -t existing < <(docker_ctx secret ls --format '{{.Name}}' | grep "^${SECRET_PREFIX}_" || true)
  for name in "${existing[@]}"; do
    [[ "$name" == *"$NEXT_SUFFIX" ]] && continue
    keep=0
    for key in "${ALL_KEYS[@]}"; do
      if [[ "$(secret_full_name "$key")" == "$name" ]]; then
        keep=1
        break
      fi
    done
    if [[ "$keep" -eq 0 ]]; then
      if [[ "$FORCE" -eq 1 ]]; then
        if docker_ctx secret rm "$name" 2>/dev/null; then
          echo "Removed orphan ${name}"
        else
          echo "Skip orphan ${name} — still referenced" >&2
        fi
      else
        echo "Orphan ${name} (use --prune --force to remove)" >&2
      fi
    fi
  done
fi

echo "Done. Active secrets:" >&2
docker_ctx secret ls --format '  {{.Name}}' | grep "^${SECRET_PREFIX}_" || echo "  (none)" >&2
