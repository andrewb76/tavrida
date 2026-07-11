# ADR-004: Notifications — Novu Cloud (Free plan) + adapter

> **Статус:** accepted · **Дата:** 2026-07-06

## 🎯 Контекст

`feedback`, `auction-subscriptions`, `forum`, `billing`, `plan-config` требуют email, push, in-app и digest-уведомления. Писать notification engine с нуля — дорого. Рассматривались Novu (cloud/self-host), Knock, Resend+FCM.

## ✅ Решение

**Novu Cloud (Free plan)** + тонкий **notifications-adapter** (`services/notifications/`).

```
feedback / auction / forum / billing
        │  HTTP POST /internal/v1/notifications/trigger
        ▼
notifications-adapter (NestJS)
        │  @novu/node SDK
        ▼
Novu Cloud (Free plan)
        ├── Workflows (dashboard)
        ├── Email (Novu integrated providers)
        ├── Push (FCM / APNs via Novu)
        └── In-app (Novu Inbox component → Vue)
        │
        ▼ webhook
notifications-adapter → NotificationLog + Redis → BFF WS
```

### Почему Novu Cloud Free

- **Без infra:** не нужны Docker/MongoDB/Redis для Novu в Swarm
- Workflow engine из коробки: delay, digest, reminders, conditions
- Единый API для email + push + in-app
- Free plan достаточен для MVP и раннего prod
- Adapter (~200 LOC) изолирует Novu — upstream не зависит от провайдера

### Free plan — ограничения и митигация

| Лимит (Free) | Митигация |
|--------------|-----------|
| Events/month (ограничен) | Приоритизация transactional; digest реже |
| Workflows count | Объединять похожие шаблоны |
| Subscribers | Достаточно для MVP |
| Branding Novu | Приемлемо на MVP; paid — white-label |

> Актуальные лимиты: [novu.co/pricing](https://novu.co/pricing). При превышении — paid plan или миграция на self-hosted (Novu MIT).

### Что храним у себя

| Где | Что |
|-----|-----|
| PostgreSQL `notifications` schema | `notification_log`, `subscriber` (userId → novuSubscriberId) |
| Novu Cloud | Workflows, templates, delivery |
| Bitwarden | `NOVU_API_KEY`, `NOVU_APPLICATION_IDENTIFIER` |

## 🔄 Альтернативы

| Вариант | Почему не выбран |
|---------|------------------|
| Novu self-host | Лишняя infra (MongoDB, Redis) на MVP |
| Resend + FCM | Нет workflows/digest/in-app inbox |
| Knock SaaS | Vendor lock-in, платно с меньшим free tier |

## 📌 Последствия

- ✅ Нет Novu в Docker Swarm — только SaaS + API key
- ✅ Workflows создаются в Novu Dashboard (dev/prod environments)
- ✅ `NOVU_API_KEY` в Bitwarden; не в git
- ✅ Webhook от Novu → adapter для audit (`NotificationLog`)
- ✅ In-app: `@novu/react` / headless в Vue + relay критичных events через BFF WS
- ⏳ Мониторинг usage Novu dashboard (events/month)
- ⏳ ADR-005 при миграции на self-host или paid — если упремся в лимиты

## 🔗 Связанные документы

- [notifications-analysis.md](../notifications-analysis.md)
- [notifications README](../../05-microservices/notifications/README.md)
- [event-catalog.md](../event-catalog.md)
