#!/usr/bin/env sh
# Grant platform admin in Ory Keto (bootstrap day 0).
# Usage: grant-admin.sh <logto_sub>
# Example: pnpm grant:admin zox2u6bqqefb
#
# Local: KETO_WRITE_URL=http://localhost:4467 (default)
# Swarm (on VPS or with DOCKER_CONTEXT): uses ephemeral curl on overlay network
#   DOCKER_SWARM_NETWORK=tavrida-dev_tavrida_net pnpm grant:admin <sub>
#   # or auto when localhost write fails and docker is available
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
USER_ID="${1:?Usage: grant-admin.sh <logto_sub> (Logto sub from /profile/me)}"

if [ -f "$ROOT/.env.local" ]; then
  # shellcheck disable=SC1091
  . "$ROOT/.env.local"
fi
if [ -f "$ROOT/docker/swarm/dev.env" ]; then
  # shellcheck disable=SC1091
  . "$ROOT/docker/swarm/dev.env"
fi

KETO_WRITE_URL="${KETO_WRITE_URL:-http://localhost:4467}"
KETO_READ_URL="${KETO_READ_URL:-http://localhost:4466}"
NAMESPACE="${KETO_NAMESPACE:-TavridaLot}"
OBJECT="${KETO_PLATFORM_OBJECT:-platform:tavrida-lot}"
RELATION="${KETO_ADMIN_RELATION:-admin}"
STACK_NAME="${STACK_NAME:-tavrida-dev}"
SWARM_NETWORK="${DOCKER_SWARM_NETWORK:-${TRAEFIK_SWARM_NETWORK:-${STACK_NAME}_tavrida_net}}"
KETO_HOST="${KETO_HOST:-keto}"

BODY=$(cat <<EOF
{
  "namespace": "$NAMESPACE",
  "object": "$OBJECT",
  "relation": "$RELATION",
  "subject_id": "user:$USER_ID"
}
EOF
)

docker_cmd() {
  if [ -n "${DOCKER_CONTEXT:-}" ] && [ "$DOCKER_CONTEXT" != "default" ]; then
    docker --context "$DOCKER_CONTEXT" "$@"
  else
    docker "$@"
  fi
}

write_via_localhost() {
  curl -sf -X PUT "${KETO_WRITE_URL}/admin/relation-tuples" \
    -H 'Content-Type: application/json' \
    -d "$BODY" >/dev/null
}

write_via_swarm_network() {
  echo "Keto not on localhost — writing from a Swarm task (overlay)…"

  # Prefer BFF (has node + on tavrida_net). Host cannot reach overlay IPs.
  bff_cid="$(docker_cmd ps -q -f "name=${STACK_NAME}_bff" -f status=running | head -n1)"
  if [ -n "$bff_cid" ]; then
    docker_cmd exec "$bff_cid" node -e \
      "fetch('http://${KETO_HOST}:4467/admin/relation-tuples',{method:'PUT',headers:{'Content-Type':'application/json'},body:process.argv[1]}).then(async r=>{const t=await r.text();if(!r.ok){console.error(r.status,t);process.exit(1)}})" \
      "$BODY"
    return $?
  fi

  echo "No running ${STACK_NAME}_bff — cannot reach Keto write API from host overlay." >&2
  return 1
}

check_via_swarm_network() {
  bff_cid="$(docker_cmd ps -q -f "name=${STACK_NAME}_bff" -f status=running | head -n1)"
  if [ -z "$bff_cid" ]; then
    return 0
  fi
  docker_cmd exec "$bff_cid" node -e \
    "fetch('http://${KETO_HOST}:4466/relation-tuples/check?namespace='+encodeURIComponent(process.argv[1])+'&object='+encodeURIComponent(process.argv[2])+'&relation='+encodeURIComponent(process.argv[3])+'&subject_id='+encodeURIComponent('user:'+process.argv[4])).then(r=>r.json()).then(j=>console.log(JSON.stringify(j)))" \
    "$NAMESPACE" "$OBJECT" "$RELATION" "$USER_ID" || true
}

USED_SWARM=0
if write_via_localhost 2>/dev/null; then
  :
elif command -v docker >/dev/null 2>&1 && write_via_swarm_network; then
  USED_SWARM=1
else
  echo "Failed to write Keto tuple."
  echo "  Local: ensure Keto is up (pnpm keto:up) and KETO_WRITE_URL=${KETO_WRITE_URL}"
  echo "  Swarm (on VPS): unset DOCKER_CONTEXT, then:"
  echo "    DOCKER_SWARM_NETWORK=${SWARM_NETWORK} pnpm grant:admin ${USER_ID}"
  exit 1
fi

echo "✓ platform admin granted: user:$USER_ID"
echo "  tuple: ${OBJECT}#${RELATION}@user:${USER_ID} (namespace ${NAMESPACE})"

if [ "$USED_SWARM" = 1 ]; then
  echo "Verify:"
  check_via_swarm_network || true
else
  echo "Verify:"
  echo "  curl -s \"${KETO_READ_URL}/relation-tuples/check?namespace=${NAMESPACE}&object=${OBJECT}&relation=${RELATION}&subject_id=user:${USER_ID}\""
fi
