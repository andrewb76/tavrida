#!/usr/bin/env sh
# Create public MinIO buckets via running BFF container (no minio/mc pull).
# Usage on VPS:
#   BFF=$(docker ps -q -f name=tavrida-dev_bff) ./scripts/ensure-minio-buckets-via-bff.sh
# Or:
#   DOCKER_CONTEXT=dev-swarm ./scripts/ensure-minio-buckets-via-bff.sh
set -e

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
STACK_NAME="${STACK_NAME:-tavrida-dev}"
BFF_CID="${BFF:-$(docker ps -q -f "name=${STACK_NAME}_bff" -f status=running | head -n1)}"
REMOTE_SCRIPT=/app/ensure-minio-buckets.cjs

if [ -z "$BFF_CID" ]; then
  echo "BFF container not found (name=${STACK_NAME}_bff)" >&2
  exit 1
fi

echo "Using BFF container $BFF_CID"
docker cp "$SCRIPT_DIR/ensure-minio-buckets.cjs" "$BFF_CID:$REMOTE_SCRIPT"
docker exec -w /app "$BFF_CID" node ensure-minio-buckets.cjs
docker exec "$BFF_CID" rm -f "$REMOTE_SCRIPT"
