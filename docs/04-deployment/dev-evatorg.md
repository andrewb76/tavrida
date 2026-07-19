# 🌐 Dev Swarm — `evatorg.su`

> **Статус:** in progress · **VPS:** тот же, что nip.io (`193.142.148.175`)  
> **Операционка:** [docker/swarm/README.dev.md](../../docker/swarm/README.dev.md) · [github-actions.md](./github-actions.md)

## Принятые решения

| # | Тема | Решение |
|---|------|---------|
| 1 | Сервер | Тот же VPS (не новый) |
| 2 | CD | Только ветка **`dev`** (не `master`) |
| 3 | Apex | `https://evatorg.su` → `https://app.evatorg.su` (Traefik redirect) |
| 4 | Logto | **OSS в Swarm** (`auth.` + `logto.`), не Cloud |

## Домены

| Host | Сервис |
|------|--------|
| `evatorg.su` / `www.evatorg.su` | 301 → `app.evatorg.su` |
| `app.evatorg.su` | Vue frontend |
| `api.evatorg.su` | BFF `/api/v1` |
| `auth.evatorg.su` | Logto OSS (OIDC / experience) |
| `logto.evatorg.su` | Logto Admin Console |
| `s3.evatorg.su` | MinIO S3 API |
| `minio.evatorg.su` | MinIO Console |
| `img.evatorg.su` | imgproxy |
| `rabbitmq.evatorg.su` | RabbitMQ Management |
| `traefik.evatorg.su` | Traefik dashboard |

`DEV_DOMAIN=evatorg.su` · `LOGTO_AUDIENCE=https://api.evatorg.su` · `LOGTO_ENDPOINT=https://auth.evatorg.su`

## Чеклист внедрения

### DNS (вы)

- [ ] A: `@` / `evatorg.su` → `193.142.148.175`
- [ ] A: `www`, `app`, `api`, `auth`, `logto`, `s3`, `minio`, `img`, `rabbitmq`, `traefik` → тот же IP
- [ ] Если раньше `auth.` был CNAME на Logto Cloud — **смените на A → VPS**
- [ ] `dig +short auth.evatorg.su` → IP VPS

### Logto OSS (после первого Deploy)

1. Открыть `https://logto.evatorg.su` — создать admin (первый запуск).
2. **SPA (Vue):**
   - Redirect: `https://app.evatorg.su/callback`
   - Sign-out: `https://app.evatorg.su/`
   - CORS: `https://app.evatorg.su`
   - Unknown session: `https://app.evatorg.su/auth/unknown-session`
3. **API Resource:** indicator `https://api.evatorg.su` → назначить SPA.
4. **M2M app** + роль Management API (`all`). Resource indicator OSS: `https://default.logto.app/api`.
5. GitHub Environment `dev`:
   - `LOGTO_ENDPOINT=https://auth.evatorg.su`
   - `LOGTO_JWKS_URL=https://auth.evatorg.su/oidc/jwks`
   - `LOGTO_AUDIENCE=https://api.evatorg.su`
   - `LOGTO_M2M_RESOURCE=https://default.logto.app/api`
   - `VITE_LOGTO_ENDPOINT=https://auth.evatorg.su`
   - `VITE_LOGTO_APP_ID=<SPA id>`
   - `VITE_LOGTO_API_RESOURCE=https://api.evatorg.su`
   - Secret `LOGTO_M2M_APP_SECRET`
6. **Deploy** с rebuild frontend (`skip_build=false`), чтобы вшить новый `VITE_LOGTO_*`.

Подробнее: [logto-setup.md](../14-frontend/logto-setup.md) · [README.dev.md](../../docker/swarm/README.dev.md).

### GitHub Environment `dev` (вы)

> Не путать с `.env.local`: Environment `dev` только для CI → Swarm.

- [ ] Variables: `DEV_DOMAIN=evatorg.su`, `FRONTEND_ORIGIN=https://app.evatorg.su`, SSH, `ACME_EMAIL`, Logto OSS URLs + `VITE_LOGTO_*`
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
