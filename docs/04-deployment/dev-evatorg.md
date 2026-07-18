# 🌐 Dev Swarm — `evatorg.su`

> **Статус:** in progress · **VPS:** тот же, что nip.io (`193.142.148.175`)  
> **Операционка:** [docker/swarm/README.dev.md](../../docker/swarm/README.dev.md) · [github-actions.md](./github-actions.md)

## Принятые решения

| # | Тема | Решение |
|---|------|---------|
| 1 | Сервер | Тот же VPS (не новый) |
| 2 | CD | Только ветка **`dev`** (не `master`) |
| 3 | Apex | `https://evatorg.su` → `https://app.evatorg.su` (Traefik redirect) |
| 4 | Logto | Отдельный Cloud tenant «dev/server» (не local `kkzcxf`) |

## Домены

| Host | Сервис |
|------|--------|
| `evatorg.su` / `www.evatorg.su` | 301 → `app.evatorg.su` |
| `app.evatorg.su` | Vue frontend |
| `api.evatorg.su` | BFF `/api/v1` |
| `s3.evatorg.su` | MinIO S3 API |
| `minio.evatorg.su` | MinIO Console |
| `img.evatorg.su` | imgproxy |
| `rabbitmq.evatorg.su` | RabbitMQ Management |
| `traefik.evatorg.su` | Traefik dashboard |

`DEV_DOMAIN=evatorg.su` · `LOGTO_AUDIENCE=https://api.evatorg.su`

## Чеклист внедрения

### DNS (вы)

- [ ] A: `@` / `evatorg.su` → `193.142.148.175`
- [ ] A: `www`, `app`, `api`, `s3`, `minio`, `img`, `rabbitmq`, `traefik` → тот же IP
- [ ] `dig +short app.evatorg.su` → IP VPS

### Logto Cloud — tenant «dev/server» (вы)

- [ ] SPA (Vue): redirect `https://app.evatorg.su/callback`, sign-out `https://app.evatorg.su/`, CORS `https://app.evatorg.su`
- [ ] API Resource indicator: `https://api.evatorg.su`
- [ ] M2M app + Management API role (`all`)
- [ ] Значения в GitHub Environment `dev`: `LOGTO_*`, `VITE_LOGTO_ENDPOINT`, `VITE_LOGTO_APP_ID`, `VITE_LOGTO_API_RESOURCE=https://api.evatorg.su`

### GitHub Environment `dev` (вы)

> Не путать с `.env.local`: Environment `dev` только для CI → Swarm. Local Logto / localhost не меняйте.

- [ ] Variables: `DEV_DOMAIN=evatorg.su`, `FRONTEND_ORIGIN=https://app.evatorg.su`, SSH, `ACME_EMAIL`, Logto server + `VITE_LOGTO_*`
- [ ] Secrets: `DEV_SWARM_SSH_KEY`, Postgres/RMQ/MinIO, `LOGTO_M2M_APP_SECRET`, `INTERNAL_SERVICE_TOKEN`
- [ ] Actions → **Sync secrets (dev)** (первый раз) · подробности: [github-actions.md](./github-actions.md)

### VPS (вы / один раз)

- [ ] `/opt/tavrida` на ветке `dev`, `git pull` перед деплоем конфигов
- [ ] Swarm уже init; GHCR login на manager
- [ ] Порты 80/443

### Репо (агент — частично сделано)

- [x] `deploy-dev.yml` → trigger `dev`
- [x] Apex redirect labels в `stack-infra.dev.yml`
- [x] Docs + `dev.env.example` + frontend Logto build-args
- [ ] Первый **Deploy dev** (workflow_dispatch или push в `dev`)
- [ ] Приёмка: TLS, login, API audience

### После стабилизации

- [ ] nip.io перестать рекламировать / оставить как IP-fallback
- [ ] Защита ветки `dev` (только PR merge)
- [ ] При необходимости закрыть `traefik.` / `rabbitmq.` (auth)
