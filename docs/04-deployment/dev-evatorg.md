# 🌐 Dev Swarm — `tavridalot.ru`

> **Статус:** in progress · **VPS:** тот же, что nip.io (`193.142.148.175`)  
> **Операционка:** [docker/swarm/README.dev.md](../../docker/swarm/README.dev.md) · [github-actions.md](./github-actions.md)

## Принятые решения

| # | Тема | Решение |
|---|------|---------|
| 1 | Сервер | Тот же VPS (не новый) |
| 2 | CD | Только ветка **`dev`** (не `master`) |
| 3 | Apex | `https://tavridalot.ru` → `https://app.tavridalot.ru` (Traefik redirect) |
| 4 | Logto | **OSS в Swarm** (`auth.` + `logto.`), не Cloud |

## Домены

| Host | Сервис |
|------|--------|
| `tavridalot.ru` / `www.tavridalot.ru` | 301 → `app.tavridalot.ru` |
| `app.tavridalot.ru` | Vue frontend |
| `api.tavridalot.ru` | BFF `/api/v1` |
| `auth.tavridalot.ru` | Logto OSS (OIDC / experience) |
| `logto.tavridalot.ru` | Logto Admin Console |
| `s3.tavridalot.ru` | MinIO S3 API |
| `minio.tavridalot.ru` | MinIO Console |
| `img.tavridalot.ru` | imgproxy |
| `rabbitmq.tavridalot.ru` | RabbitMQ Management |
| `traefik.tavridalot.ru` | Traefik dashboard |

`DEV_DOMAIN=tavridalot.ru` · `LOGTO_AUDIENCE=https://api.tavridalot.ru` · `LOGTO_ENDPOINT=https://auth.tavridalot.ru`

## Чеклист внедрения

### DNS (вы)

- [ ] A: `@` / `tavridalot.ru` → `193.142.148.175`
- [ ] A: `www`, `app`, `api`, `auth`, `logto`, `s3`, `minio`, `img`, `rabbitmq`, `traefik` → тот же IP
- [ ] Если раньше `auth.` был CNAME на Logto Cloud — **смените на A → VPS**
- [ ] `dig +short auth.tavridalot.ru` → IP VPS

### Logto OSS (после первого Deploy)

1. Открыть `https://logto.tavridalot.ru` — создать admin (первый запуск).
2. **SPA (Vue):**
   - Redirect: `https://app.tavridalot.ru/callback`
   - Sign-out: `https://app.tavridalot.ru/`
   - CORS: `https://app.tavridalot.ru`
   - Unknown session: `https://app.tavridalot.ru/auth/unknown-session`
3. **API Resource:** indicator `https://api.tavridalot.ru` → назначить SPA.
4. **M2M app** + роль Management API (`all`). Resource indicator OSS: `https://default.logto.app/api`.
5. GitHub Environment `dev`:
   - `LOGTO_ENDPOINT=https://auth.tavridalot.ru`
   - `LOGTO_JWKS_URL=https://auth.tavridalot.ru/oidc/jwks`
   - `LOGTO_AUDIENCE=https://api.tavridalot.ru`
   - `LOGTO_M2M_RESOURCE=https://default.logto.app/api`
   - `VITE_LOGTO_ENDPOINT=https://auth.tavridalot.ru`
   - `VITE_LOGTO_APP_ID=<SPA id>`
   - `VITE_LOGTO_API_RESOURCE=https://api.tavridalot.ru`
   - Secret `LOGTO_M2M_APP_SECRET`
6. **Deploy** с rebuild frontend (`skip_build=false`), чтобы вшить новый `VITE_LOGTO_*`.
7. Branding: **`pnpm setup:logto-branding`** (M2M в `dev.secrets.env`) — sign-in + Account Center; проверка: `VERIFY=1 pnpm setup:logto-branding`. См. [logto-setup.md](../14-frontend/logto-setup.md#branding-sign-in-experience).
8. Avatar + media MinIO buckets: **`minio-buckets-init`** + **`logto-storage-init`** (пароль MinIO из Swarm secret → `systems.storageProvider`). После ротации пароля: `docker service update --force tavrida-dev_logto-storage-init` и logto. Account center: Avatar **Edit**.

Подробнее: [logto-setup.md](../14-frontend/logto-setup.md) · [README.dev.md](../../docker/swarm/README.dev.md).

### GitHub Environment `dev` (вы)

> Не путать с `.env.local`: Environment `dev` только для CI → Swarm.

- [ ] Variables: `DEV_DOMAIN=tavridalot.ru`, `FRONTEND_ORIGIN=https://app.tavridalot.ru`, SSH, `ACME_EMAIL`, Logto OSS URLs + `VITE_LOGTO_*`
- [ ] Secrets: `DEV_SWARM_SSH_KEY`, Postgres/RMQ/MinIO, `LOGTO_M2M_APP_SECRET`, `INTERNAL_SERVICE_TOKEN`
- [ ] Actions → **Sync secrets (dev)** · [github-actions.md](./github-actions.md)

### VPS (вы / один раз)

- [ ] `/opt/tavrida` на ветке `dev`, `git pull` перед деплоем конфигов
- [ ] Swarm уже init; GHCR login на manager
- [ ] Порты 80/443

### Репо (агент — частично сделано)

- [x] `deploy-dev.yml` → trigger `dev`
- [x] Apex redirect labels в `stack-infra.dev.yml`
- [x] Logto OSS в `stack-infra.dev.yml` (`auth.` / `logto.`)
- [x] Docs + `dev.env.example` + frontend Logto build-args
- [ ] Первый **Deploy** после Logto в infra + console bootstrap
- [ ] Приёмка: TLS, login, API audience

### После стабилизации

- [ ] nip.io перестать рекламировать / оставить как IP-fallback
- [ ] Защита ветки `dev` (только PR merge)
- [ ] При необходимости закрыть `traefik.` / `rabbitmq.` / `logto.` (auth)
