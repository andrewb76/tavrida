# Dev Swarm (`evatorg.su`)

Docker Swarm на VPS `193.142.148.175`: **инфраструктура** из public images, **core-сервисы** — из **GHCR**.

План миграции с nip.io и чеклист: [docs/04-deployment/dev-evatorg.md](../../docs/04-deployment/dev-evatorg.md).

## Домены

| Host | Сервис |
|------|--------|
| `evatorg.su` / `www.evatorg.su` | 301 → `app.evatorg.su` |
| `app.evatorg.su` | Vue frontend |
| `api.evatorg.su` | BFF (`/api/v1`) |
| `auth.evatorg.su` | Logto OSS (OIDC) |
| `logto.evatorg.su` | Logto Admin Console |
| `s3.evatorg.su` | MinIO S3 API |
| `minio.evatorg.su` | MinIO Console |
| `img.evatorg.su` | imgproxy |
| `rabbitmq.evatorg.su` | RabbitMQ Management |
| `traefik.evatorg.su` | Traefik dashboard |

TLS: Let's Encrypt (HTTP-01) через Traefik.

## Файлы

| Файл | Назначение |
|------|------------|
| `stack-infra.dev.yml` | Traefik (+ apex redirect), Postgres, Redis, RabbitMQ, MinIO, imgproxy, Keto |
| `stack-platform.dev.yml` | BFF + domain services + frontend (**GHCR**) + `plan-config-renew` (hourly) |
| `dev.env.example` | Публичный конфиг → `dev.env` (домены, GHCR, Logto URLs) |
| `dev.secrets.env.example` | Секреты → `dev.secrets.env` (**только на ноутбуке**, gitignore) |
| `secrets-manifest.dev` | Список ключей → Swarm secret `tavrida_dev_*` |
| `sync-secrets-dev.sh` | Push секретов в Swarm через `DOCKER_CONTEXT` |
| `deploy-dev.sh` | `docker stack deploy` (оба stack-файла); retry при `update out of sequence` |
| `build-images.sh` | Сборка образов `ghcr.io/<owner>/tavrida-*` (+ `VITE_LOGTO_*`) |
| `prune-ghcr-dev.sh` | Удаление старых версий в GHCR (keep N + `:dev`) |
| `ci-write-dev-env.sh` | Сборка `dev.env` из env (CI) |
| `ci-docker-context.sh` | `docker context` → SSH Swarm |
| `../images/Dockerfile.service` | NestJS monorepo image |
| `../images/Dockerfile.frontend` | Vue + nginx |
| `../config/traefik/traefik.dev.yml` | Traefik static (entrypoints, ACME, Swarm provider) |
| `../config/keto/`, `../config/postgres/init/` | Keto + PG schemas (bind-mount / Swarm configs) |

## Секреты (отдельно от stack)

**Подход для dev:** секреты живут в Swarm, не в git и не в env-файле на VPS. Деплой и sync — **с ноутбука** через named Docker context.

Почему так (и почему Infisical не обязан быть в `tavrida-dev` stack):

| Вариант | Плюсы | Минусы |
|---------|-------|--------|
| **Swarm secrets + sync с ноутбука** | Просто, без Infisical; секреты не на диске VPS | Ротация = `--force` + redeploy; `DATABASE_URL` пока ещё в spec сервиса при deploy |
| **Infisical в отдельном stack** | Центральный UI, аудит, ротация | Ещё один сервис; нужен доступ/backup |
| **Infisical в том же stack** | Один `stack deploy` | Больше blast radius; обновление платформы трогает хранилище секретов |

Infisical **в отдельном stack** (`tavrida-secrets`) на том же VPS — нормальная и часто более безопасная схема: другой lifecycle, можно не публиковать в Traefik, доступ только по VPN/SSH. В основной stack позже можно добавить только **Infisical Agent** (read-only inject), без UI.

### Named context

```bash
docker context create dev-swarm --docker "host=ssh://user@193.142.148.175"
docker context ls
export DOCKER_CONTEXT=dev-swarm   # или --context в каждой команде
```

На VPS: Swarm init (один раз), checkout в **`TAVRIDA_REPO_ROOT`** (по умолчанию `/opt/tavrida`) на ветке **`dev`** для bind-mount `docker/config/*`, **без** `dev.secrets.env`.

## GitHub Actions

| Workflow | Когда |
|----------|--------|
| [Deploy dev](../../.github/workflows/deploy-dev.yml) | push **`dev`** (paths) или manual — build/push GHCR + `stack deploy` |
| [Sync secrets (dev)](../../.github/workflows/sync-secrets-dev.yml) | **только manual** — Secrets → Swarm |
| [Prune GHCR](../../.github/workflows/prune-ghcr-dev.yml) | weekly / manual — удалить старые `:sha`, оставить `:dev` + last N |

Настройка Environment `dev` (vars/secrets): [github-actions.md](../../docs/04-deployment/github-actions.md).

Первый раз: Sync secrets → Deploy. Дальше обычный Deploy не трогает app-секреты.

## Первый деплой (ноутбук)

```bash
cp docker/swarm/dev.env.example docker/swarm/dev.env
cp docker/swarm/dev.secrets.env.example docker/swarm/dev.secrets.env
# dev.env: LOGTO_*, VITE_LOGTO_*, ACME_EMAIL, TAVRIDA_REPO_ROOT=/opt/tavrida
# DEV_DOMAIN=evatorg.su
# dev.secrets.env: пароли

docker context create dev-swarm --docker "host=ssh://user@193.142.148.175"

echo "$GITHUB_TOKEN" | docker --context dev-swarm login ghcr.io -u "$GITHUB_USER" --password-stdin

export GHCR_OWNER=andrewb76 GIT_SHA=$(git rev-parse --short HEAD) DEV_DOMAIN=evatorg.su
# + VITE_LOGTO_* из отдельного Logto tenant
./docker/swarm/build-images.sh --push

DOCKER_CONTEXT=dev-swarm ./docker/swarm/sync-secrets-dev.sh
DOCKER_CONTEXT=dev-swarm ./docker/swarm/deploy-dev.sh
```

На VPS: `git clone … /opt/tavrida`, `git checkout dev`, Swarm manager, порты 80/443, DNS `*.evatorg.su`.

## Образы GHCR

```
ghcr.io/<owner>/tavrida-bff:<git-sha>
ghcr.io/<owner>/tavrida-billing:<git-sha>
ghcr.io/<owner>/tavrida-plan-config:<git-sha>
ghcr.io/<owner>/tavrida-auction:<git-sha>
ghcr.io/<owner>/tavrida-user-profile:<git-sha>
ghcr.io/<owner>/tavrida-scalar-config:<git-sha>
ghcr.io/<owner>/tavrida-forum:<git-sha>
ghcr.io/<owner>/tavrida-frontend:<git-sha>
```

`:dev` — плавающий указатель «текущий dev deploy» (и защита от prune). В CI — `:git-sha` + `:dev`.

## Очистка GHCR

```bash
KEEP_LAST=10 DRY_RUN=1 ./docker/swarm/prune-ghcr-dev.sh
KEEP_LAST=10 ./docker/swarm/prune-ghcr-dev.sh
```

Или Actions → **Prune GHCR (dev images)**.

## Logto OSS (в Swarm)

Сервисы `logto-db-init` + `logto` в `stack-infra.dev.yml` (`svhd/logto:1.41.0`).

| URL | Назначение |
|-----|------------|
| `https://auth.${DEV_DOMAIN}` | OIDC / sign-in (`ENDPOINT`) |
| `https://logto.${DEV_DOMAIN}` | Admin Console (`ADMIN_ENDPOINT`) |

Env в `dev.env` / GitHub Environment:

- BFF: `LOGTO_ENDPOINT=https://auth.…`, `LOGTO_JWKS_URL=…/oidc/jwks`, `LOGTO_AUDIENCE=https://api.…`
- M2M resource (**OSS**): `LOGTO_M2M_RESOURCE=https://default.logto.app/api` — не cloud tenant URL
- Frontend build: `VITE_LOGTO_ENDPOINT`, `VITE_LOGTO_APP_ID`, `VITE_LOGTO_API_RESOURCE=https://api.…`

После первого deploy откройте Admin Console и создайте SPA + API resource + M2M (см. [dev-evatorg.md](../../docs/04-deployment/dev-evatorg.md)). Затем **Deploy с build** frontend.

Redirect URIs в консоли:

- `https://app.evatorg.su/callback`
- `https://app.evatorg.su`

API resource indicator — **точно** как `LOGTO_AUDIENCE` / `VITE_LOGTO_API_RESOURCE`.

Local laptop по-прежнему может использовать `docker/compose/logto.local.yml` отдельно от Swarm.
## Swarm configs (immutable)

Docker Swarm **не обновляет** содержимое `configs:` — только Labels. При правке
`docker/config/traefik/traefik.dev.yml` или `keto.yml` нужно **поднять суффикс**
ключа в `stack-infra.dev.yml` (`traefik_static_v2` → `v3`, …), иначе:

`failed to update config … only updates to Labels are allowed`

После успешного deploy старые объекты можно убрать:

```bash
docker config ls
docker config rm tavrida-dev_traefik_static   # если больше не в use
```

`docker/config/keto/keto.yml` DSN: `postgres://postgres:postgres@postgres:5432/…search_path=keto`.
В `dev.secrets.env` / GitHub Secret **`POSTGRES_PASSWORD` должен быть `postgres`**, иначе migrate/serve не подключатся.

Schema `keto` создаётся init-скриптом Postgres (только на пустом volume) и сервисом **`keto-schema-init`** в stack. Затем **`keto-migrate`**, затем **`keto` serve** (restart on-failure, пока migrate не пройдёт).

Ручной ремонт на VPS:

```bash
PG=$(docker ps -q -f name=tavrida-dev_postgres)
docker exec -e PGPASSWORD=postgres "$PG" \
  psql -U postgres -d tavrida_lot -c 'CREATE SCHEMA IF NOT EXISTS keto;'

docker run --rm --network tavrida-dev_tavrida_net \
  -v /opt/tavrida/docker/config/keto:/home/ory:ro \
  -w /home/ory oryd/keto:v0.14.0 migrate up -y -c keto.yml

docker service update --force tavrida-dev_keto
```

После первого входа:

```bash
pnpm grant:admin <logto_sub>
```

## Обновление релиза

```bash
# CI (push to dev) или локально: push новых образов с новым SHA
# dev.env: GIT_SHA=<new-sha>
DOCKER_CONTEXT=dev-swarm ./docker/swarm/deploy-dev.sh
```

## Связанные документы

- [dev-evatorg.md](../../docs/04-deployment/dev-evatorg.md)
- [swarm-stacks.md](../../docs/04-deployment/swarm-stacks.md)
- [stage-deployment-todo.md](../../docs/04-deployment/stage-deployment-todo.md)
- [02-infrastructure/README.md](../../docs/02-infrastructure/README.md)
