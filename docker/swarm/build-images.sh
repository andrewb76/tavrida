#!/usr/bin/env bash
# Build and optionally push core service images to GHCR.
#
# Usage:
#   # Dev (default) — images tagged with git SHA + :dev floating tag
#   ./docker/swarm/build-images.sh --push
#
#   # Stage — images tagged with git tag + :stage floating tag
#   GIT_SHA=v1.2.3 ./docker/swarm/build-images.sh --push --env stage
#
#   # Explicit tag override
#   ./docker/swarm/build-images.sh --push --tag v1.2.3 --env stage
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
REGISTRY="${GHCR_REGISTRY:-ghcr.io}"
OWNER="${GHCR_OWNER:-${GITHUB_REPOSITORY_OWNER:-andrewb76}}"
ENV="dev"
PUSH=false
EXPLICIT_TAG=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --push) PUSH=true; shift ;;
    --env) ENV="$2"; shift 2 ;;
    --tag) EXPLICIT_TAG="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,/^set /p' "$0" | head -n -1 | sed 's/^# \?//'
      exit 0
      ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

if [[ -n "$EXPLICIT_TAG" ]]; then
  TAG="$EXPLICIT_TAG"
elif [[ -n "${GIT_SHA:-}" ]]; then
  TAG="$GIT_SHA"
elif [[ -n "${GITHUB_SHA:-}" ]]; then
  TAG="${GITHUB_SHA:0:7}"
else
  TAG=latest
fi

FLOATING_TAG="$ENV"

# DEV_DOMAIN is used for frontend build args; stage uses tavridalot.ru, dev uses evatorg.su
if [[ "$ENV" == "stage" ]]; then
  DEV_DOMAIN="${DEV_DOMAIN:-tavridalot.ru}"
else
  DEV_DOMAIN="${DEV_DOMAIN:-evatorg.su}"
fi

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
  [chat]="@tavrida/chat|services/chat"
  [presence]="@tavrida/presence|services/presence"
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
    docker tag "${image}" "${REGISTRY}/${OWNER}/tavrida-${name}:${FLOATING_TAG}"
    docker push "${REGISTRY}/${OWNER}/tavrida-${name}:${FLOATING_TAG}"
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
  --build-arg "VITE_WS_URL=wss://api.${DEV_DOMAIN}/ws/v1" \
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
  docker tag "${frontend_image}" "${REGISTRY}/${OWNER}/tavrida-frontend:${FLOATING_TAG}"
  docker push "${REGISTRY}/${OWNER}/tavrida-frontend:${FLOATING_TAG}"
fi

echo "Built tag: ${TAG} (+ :${FLOATING_TAG})" >&2
