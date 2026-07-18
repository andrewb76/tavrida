#!/usr/bin/env bash
# Build and optionally push core service images to GHCR.
#
# Usage:
#   export GHCR_OWNER=andrewb76 GIT_SHA=$(git rev-parse --short HEAD)
#   ./docker/swarm/build-images.sh
#   ./docker/swarm/build-images.sh --push
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
REGISTRY="${GHCR_REGISTRY:-ghcr.io}"
OWNER="${GHCR_OWNER:-${GITHUB_REPOSITORY_OWNER:-andrewb76}}"
if [[ -n "${GIT_SHA:-}" ]]; then
  TAG="$GIT_SHA"
elif [[ -n "${GITHUB_SHA:-}" ]]; then
  TAG="${GITHUB_SHA:0:7}"
else
  TAG=latest
fi
PUSH=false

if [[ "${1:-}" == "--push" ]]; then
  PUSH=true
fi

DEV_DOMAIN="${DEV_DOMAIN:-evatorg.su}"

declare -A SERVICES=(
  [bff]="@tavrida/bff|services/bff"
  [billing]="@tavrida/billing|services/billing"
  [plan-config]="@tavrida/plan-config|services/plan-config"
  [auction]="@tavrida/auction|services/auction"
  [subscriptions]="@tavrida/subscriptions|services/subscriptions"
  [user-profile]="@tavrida/user-profile|services/user-profile"
  [scalar-config]="@tavrida/scalar-config|services/scalar-config"
  [forum]="@tavrida/forum|services/forum"
  [periods]="@tavrida/periods|services/periods"
  [marketplace]="@tavrida/marketplace|services/marketplace"
  [deal-feedback]="@tavrida/deal-feedback|services/deal-feedback"
  [notifications]="@tavrida/notifications|services/notifications"
)

build_service() {
  local name="$1" pkg="$2" dir="$3"
  local image="${REGISTRY}/${OWNER}/tavrida-${name}:${TAG}"
  echo "==> Building ${image}" >&2
  docker build -f "${ROOT}/docker/images/Dockerfile.service" \
    --build-arg "SERVICE_PKG=${pkg}" \
    --build-arg "SERVICE_DIR=${dir}" \
    -t "${image}" \
    "${ROOT}"
  if $PUSH; then
    docker push "${image}"
    # Floating tag for current deploy / prune protection
    docker tag "${image}" "${REGISTRY}/${OWNER}/tavrida-${name}:dev"
    docker push "${REGISTRY}/${OWNER}/tavrida-${name}:dev"
  fi
}

for name in "${!SERVICES[@]}"; do
  IFS='|' read -r pkg dir <<< "${SERVICES[$name]}"
  build_service "$name" "$pkg" "$dir"
done

frontend_image="${REGISTRY}/${OWNER}/tavrida-frontend:${TAG}"
echo "==> Building ${frontend_image}" >&2
docker build -f "${ROOT}/docker/images/Dockerfile.frontend" \
  --build-arg "VITE_API_BASE_URL=https://api.${DEV_DOMAIN}/api/v1" \
  --build-arg "VITE_IMAGE_PROXY_URL=https://img.${DEV_DOMAIN}" \
  --build-arg "VITE_IMAGE_PROXY_FETCH_BASE_URL=http://minio:9000" \
  --build-arg "VITE_MEDIA_PUBLIC_BASE_URL=https://s3.${DEV_DOMAIN}" \
  --build-arg "VITE_USE_MOCK=false" \
  --build-arg "VITE_LOGTO_ENDPOINT=${VITE_LOGTO_ENDPOINT:-}" \
  --build-arg "VITE_LOGTO_APP_ID=${VITE_LOGTO_APP_ID:-}" \
  --build-arg "VITE_LOGTO_API_RESOURCE=${VITE_LOGTO_API_RESOURCE:-https://api.${DEV_DOMAIN}}" \
  -t "${frontend_image}" \
  "${ROOT}"
if $PUSH; then
  docker push "${frontend_image}"
  docker tag "${frontend_image}" "${REGISTRY}/${OWNER}/tavrida-frontend:dev"
  docker push "${REGISTRY}/${OWNER}/tavrida-frontend:dev"
fi

echo "Built tag: ${TAG} (+ :dev)" >&2
