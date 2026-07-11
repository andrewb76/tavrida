#!/usr/bin/env sh
# Grant platform admin in Ory Keto (bootstrap day 0).
# Usage: grant-admin.sh <logto_sub>
# Example: pnpm grant:admin zox2u6bqqefb
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
USER_ID="${1:?Usage: grant-admin.sh <logto_sub> (Logto sub from /profile/me)}"

if [ -f "$ROOT/.env.local" ]; then
  # shellcheck disable=SC1091
  . "$ROOT/.env.local"
fi

KETO_WRITE_URL="${KETO_WRITE_URL:-http://localhost:4467}"
KETO_READ_URL="${KETO_READ_URL:-http://localhost:4466}"
NAMESPACE="${KETO_NAMESPACE:-TavridaLot}"
OBJECT="${KETO_PLATFORM_OBJECT:-platform:tavrida-lot}"
RELATION="${KETO_ADMIN_RELATION:-admin}"

BODY=$(cat <<EOF
{
  "namespace": "$NAMESPACE",
  "object": "$OBJECT",
  "relation": "$RELATION",
  "subject_id": "user:$USER_ID"
}
EOF
)

if ! curl -sf -X PUT "${KETO_WRITE_URL}/admin/relation-tuples" \
  -H 'Content-Type: application/json' \
  -d "$BODY" >/dev/null; then
  echo "Failed to write Keto tuple. Is Keto running?"
  echo "  pnpm keto:up"
  exit 1
fi

echo "✓ platform admin granted: user:$USER_ID"
echo "  tuple: ${OBJECT}#${RELATION}@user:${USER_ID} (namespace ${NAMESPACE})"
echo "Verify:"
echo "  curl -s \"${KETO_READ_URL}/relation-tuples/check?namespace=${NAMESPACE}&object=${OBJECT}&relation=${RELATION}&subject_id=user:${USER_ID}\""
