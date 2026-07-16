# ADR-019: Novu self-host (local → Swarm) вместо Novu Cloud

> **Статус:** accepted · **Дата:** 2026-07-16  
> **Supersedes (deployment target):** [ADR-004](./004-notifications-adapter.md) — Cloud Free как единственный runtime  
> **Сохраняет:** thin adapter `services/notifications/` из ADR-004

## 🎯 Контекст

Нотификации идут через adapter → Novu workflows (`tag-content`, …). **Novu Cloud недоступен в Крыму** (geo / блокировки), поэтому Cloud Free не подходит как основной канал доставки для команды и части пользователей-админов.

Нужен способ:

1. разрабатывать и тестировать delivery локально без Cloud;
2. в prod держать Novu на своей infra (Swarm), без зависимости от SaaS-доступности.

## ✅ Решение

**Self-hosted Novu Community Edition** + существующий adapter.

| Слой | Решение |
|------|---------|
| Local | `docker/compose/novu.local.yml` (+ `novu.local.env`) — отдельный compose, как Logto; позже можно влить в `infra.local.yml` |
| Adapter | без смены API: `NOVU_API_URL` + `NOVU_API_KEY` |
| Local ports | API `:3020`, WS `:3022`, Dashboard `:4000` (не конфликтуют с BFF `:3000` / plan-config `:3002`) |
| Без ключа | по-прежнему **mock** в `services/notifications` |
| Prod/dev Swarm | отдельный stack / сервисы Novu (Mongo + Redis + api/worker/ws/dashboard) — follow-up |

```
upstream / BFF
      │  POST /internal/v1/notifications/trigger
      ▼
notifications-adapter
      │  NOVU_API_URL (self-host)
      ▼
Novu CE (Docker)
      ├── Dashboard workflows
      ├── Email / push providers (SMTP, FCM, …)
      └── In-app Inbox
```

### Локальный bootstrap

```bash
pnpm novu:up
# Dashboard → http://localhost:4000
# .env.local:
#   NOVU_API_URL=http://localhost:3020
#   NOVU_API_KEY=<Settings → API Keys в Dashboard>
#   (не путать с NOVU_SECRET_KEY в novu.local.env)
```

Чеклист: [novu-local.md](../../04-deployment/novu-local.md). Workflow `tag-content` — до реального fan-out.

## 🔄 Альтернативы

| Вариант | Почему не сейчас |
|---------|------------------|
| Остаться на Cloud | Недоступен из Крыма |
| DIY SMTP + FCM + Redis WS | Нет workflows/digest/inbox; долго |
| Другой SaaS (Knock, …) | Тот же geo-риск + смена API |
| Отказаться от Novu, только mock + email | Теряем orchestration; возможно fallback позже |

## 📌 Последствия

- ✅ Local compose **отдельно** от `infra.local.yml` (легче RAM cold-start)
- ✅ Свои Mongo/Redis у Novu (не шарать platform Redis)
- ✅ Adapter / allowlist workflows не меняются
- ⏳ Swarm: stack Novu + secrets; SMTP/FCM в Dashboard
- ⏳ После проверки local — опционально merge в `infra.local.yml` (как Keto)
- ⚠ `novu.local.env` — **только local** секреты; prod — Bitwarden / Swarm secrets

## 🔗 Связанные документы

- [ADR-004](./004-notifications-adapter.md) (adapter)
- [notifications-analysis.md](../notifications-analysis.md)
- [notifications README](../../05-microservices/notifications/README.md)
- [local-dev.md](../../04-deployment/local-dev.md)
- [PLATFORM-SECRETS.md](../../02-infrastructure/PLATFORM-SECRETS.md)
