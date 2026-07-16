# Dev Swarm (`193.142.148.175.nip.io`)

Docker Swarm на VPS: **инфраструктура** из public images, **core-сервисы** — из **GHCR**.

## Домены

| Host | Сервис |
|------|--------|
| `app.193.142.148.175.nip.io` | Vue frontend |
| `api.193.142.148.175.nip.io` | BFF (`/api/v1`) |
| `s3.193.142.148.175.nip.io` | MinIO S3 API |
| `minio.193.142.148.175.nip.io` | MinIO Console |
| `img.193.142.148.175.nip.io` | imgproxy |
| `rabbitmq.193.142.148.175.nip.io` | RabbitMQ Management |
| `traefik.193.142.148.175.nip.io` | Traefik dashboard |

TLS: Let's Encrypt (HTTP-01) через Traefik.

## Файлы

| Файл | Назначение |
|------|------------|
| `stack-infra.dev.yml` | Traefik, Postgres, Redis, RabbitMQ, MinIO, imgproxy, Keto |
| `stack-platform.dev.yml` | BFF + domain services + frontend (**GHCR**) + `plan-config-renew` (hourly) |
| `dev.env.example` | Публичный конфиг → `dev.env` (домены, GHCR, Logto URLs) |
| `dev.secrets.env.example` | Секреты → `dev.secrets.env` (**только на ноутбуке**, gitignore) |
| `secrets-manifest.dev` | Список ключей → Swarm secret `tavrida_dev_*` |
| `sync-secrets-dev.sh` | Push секретов в Swarm через `DOCKER_CONTEXT` |
| `deploy-dev.sh` | `docker stack deploy` (оба stack-файла) |
| `build-images.sh` | Сборка образов `ghcr.io/<owner>/tavrida-*` |
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

На VPS: Swarm init (один раз), checkout в **`TAVRIDA_REPO_ROOT`** (по умолчанию `/opt/tavrida`) для bind-mount `docker/config/*`, **без** `dev.secrets.env`.

## GitHub Actions

| Workflow | Когда |
|----------|--------|
| [Deploy dev](../../.github/workflows/deploy-dev.yml) | push `master` (paths) или manual — build/push GHCR + `stack deploy` |
| [Sync secrets (dev)](../../.github/workflows/sync-secrets-dev.yml) | **только manual** — Secrets → Swarm |
| [Prune GHCR](../../.github/workflows/prune-ghcr-dev.yml) | weekly / manual — удалить старые `:sha`, оставить `:dev` + last N |

Настройка Environment `dev` (vars/secrets): [github-actions.md](../../docs/04-deployment/github-actions.md).

Первый раз: Sync secrets → Deploy. Дальше обычный Deploy не трогает app-секреты.

## Первый деплой (ноутбук)

```bash
cp docker/swarm/dev.env.example docker/swarm/dev.env
cp docker/swarm/dev.secrets.env.example docker/swarm/dev.secrets.env
# dev.env: LOGTO_*, ACME_EMAIL, TAVRIDA_REPO_ROOT=/opt/tavrida
# dev.secrets.env: пароли

docker context create dev-swarm --docker "host=ssh://user@193.142.148.175"

echo "$GITHUB_TOKEN" | docker --context dev-swarm login ghcr.io -u "$GITHUB_USER" --password-stdin

export GHCR_OWNER=andrewb76 GIT_SHA=$(git rev-parse --short HEAD)
./docker/swarm/build-images.sh --push

DOCKER_CONTEXT=dev-swarm ./docker/swarm/sync-secrets-dev.sh
DOCKER_CONTEXT=dev-swarm ./docker/swarm/deploy-dev.sh
```

На VPS: `git clone … /opt/tavrida`, Swarm manager, порты 80/443.

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

## Logto Cloud

В `dev.env` задайте tenant Logto Cloud. Redirect URIs в консоли Logto:

- `https://app.193.142.148.175.nip.io/callback`
- `https://app.193.142.148.175.nip.io`

API resource audience — как в `LOGTO_AUDIENCE`.

## Keto

`docker/config/keto/keto.yml` использует DSN с паролем postgres — для dev в `dev.secrets.env` задайте **`POSTGRES_PASSWORD=postgres`** (тот же, что sync в Swarm). После первого входа:

```bash
pnpm grant:admin <logto_sub>
```

(с машины, где доступен Keto write API, или через Portainer exec.)

## Обновление релиза

```bash
# CI или локально: push новых образов с новым SHA
# dev.env: GIT_SHA=<new-sha>
DOCKER_CONTEXT=dev-swarm ./docker/swarm/deploy-dev.sh
```

## Связанные документы

- [swarm-stacks.md](../../docs/04-deployment/swarm-stacks.md)
- [stage-deployment-todo.md](../../docs/04-deployment/stage-deployment-todo.md)
- [02-infrastructure/README.md](../../docs/02-infrastructure/README.md)
