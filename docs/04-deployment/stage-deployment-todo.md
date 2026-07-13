# 📋 Stage / CD — решения и backlog

> **Статус:** decisions locked · **Реализация:** отложена (TODO)  
> **Связано:** [README](./README.md) · [github-actions](./github-actions.md) · [swarm-stacks](./swarm-stacks.md)

Зафиксированные решения для первого удалённого стенда (ветка `stage` → Docker Swarm на VPS с выделенным IP). **Код и workflows пока не трогаем** — только план.

---

## ✅ Принятые решения

| # | Тема | Решение |
|---|------|---------|
| 1 | **Registry** | [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry) (`ghcr.io`) — образы с тегом `:git-sha` |
| 2 | **OIDC / auth** | **Logto Cloud** на stage (не self-hosted Logto в Swarm) |
| 3 | **БД** | **Schema per service** — один PostgreSQL, отдельная schema на сервис ([ADR-001](../03-architecture/adr/001-database-schema-per-service.md)) |
| 4 | **Ветки** | Ветка **`stage`** — **защищённая**; попадание только через **merge PR** (не прямой push) |
| 5 | **Секреты и конфиг** | **Нет** `.env.stage` в git. Runtime: **Docker Swarm secrets** + начальный **seed scalar-config** при первом деплое |

### Окружение `stage` (именование)

| | |
|---|---|
| Триггер CD | push / merge в `stage` |
| Роль | интеграционный стенд (в обзоре [README](./README.md) аналог строки `dev`) |
| Edge | Traefik на том же Swarm-узле |

---

## 📝 TODO (реализация — потом)

### Инфраструктура на сервере

- [ ] Инициализация Docker Swarm (single manager node достаточно для stage)
- [ ] DNS: `app.stage.*`, `api.stage.*` (и при необходимости `*.tools.stage.*`)
- [ ] `docker/swarm/stack-infra.yml` — Traefik, Postgres, Redis, RabbitMQ, MinIO, Keto
- [ ] `docker/swarm/stack-platform.yml` — BFF + реализованные сервисы (нарастить поэтапно)
- [ ] `docker/swarm/stack-tools.yml` — Portainer, Dozzle и т.п. ([dev-tools](../02-infrastructure/dev-tools.md))
- [ ] Swarm secrets из [PLATFORM-SECRETS](../02-infrastructure/PLATFORM-SECRETS.md) (не env-файлы в репо)

### Образы и registry (GHCR)

- [ ] `docker/images/Dockerfile.service` (общий паттерн для NestJS)
- [ ] Публикация в `ghcr.io/<org>/tavrida/<service>:<git-sha>`
- [ ] GitHub Actions: `permissions: packages: write` + `GITHUB_TOKEN` / PAT при необходимости

### CI/CD

- [ ] Защита ветки `stage` в GitHub (required PR, без bypass для обычных разработчиков)
- [ ] Workflow: PR → lint + test + turbo build (как сейчас на `master`)
- [ ] Workflow: merge в `stage` → docker build matrix (affected) → push GHCR → migration job → `docker stack deploy`
- [ ] Smoke после деплоя: `GET /health/ready` на BFF
- [ ] Rollback: redeploy предыдущего `:sha` — [runbook-rollback](./runbook-rollback.md)

### Auth (Logto Cloud)

- [ ] Tenant / application для stage (redirect URIs на `app.stage.*`, `api.stage.*`)
- [ ] Секреты Logto в Swarm (не в git); BFF env из secrets

### Конфиг (scalar-config seed)

- [ ] Первый деплой: сервисы регистрируют ключи через `POST /internal/v1/scalar-variables/sync`
- [ ] Значения `club.*`, `forum.*` и др. — правка через admin UI / internal API, не через файл в репозитории

### Документация (когда начнём реализацию)

- [ ] Обновить таблицу env в [README](./README.md): явная строка `stage`
- [ ] Дополнить [github-actions.md](./github-actions.md) секретами `REGISTRY_*` / deploy job
- [ ] Runbook «первый деплой stage»

---

## 🔗 Целевой поток (напоминание)

```mermaid
flowchart LR
    PR[PR → stage] --> CI[lint + test + build]
    CI --> Merge[merge stage]
    Merge --> Build[docker build → GHCR :sha]
    Build --> Mig[migration job]
    Mig --> Deploy[stack deploy Swarm]
    Deploy --> Smoke[health/ready]
```

---

**Автор:** команда разработки · **Версия:** 0.1-backlog
