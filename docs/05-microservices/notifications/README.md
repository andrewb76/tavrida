# 📬 Сервис: notifications

> **Статус:** implementing · **Версия:** 0.3 · **Schema:** `notifications` · **Port:** 3010  
> **Платформа:** Novu Cloud Free · [ADR-004](../../03-architecture/adr/004-notifications-adapter.md)  
> **Код:** `services/notifications` (`@tavrida/notifications`)

## 🎯 Назначение

**Adapter уведомлений** — Novu workflows, subscribers, audit.  
HTTP trigger уже используется BFF fan-out (`tag.content_tagged` → workflow `tag-content`).

- Trigger по HTTP (internal); RabbitMQ consumers — next
- `subscriberId` = platform `userId`
- Без `NOVU_API_KEY` — **mock mode** (пишет `notification_log`, `transactionId: mock-…`)

## ✅ Реализовано

| Слой | Статус |
|------|--------|
| Nest scaffold + schema ensure | ✅ |
| Entity `subscriber`, `notification_log` | ✅ |
| `POST /internal/v1/notifications/trigger` | ✅ |
| `POST /internal/v1/notifications/subscribers/upsert` | ✅ |
| Novu HTTP trigger / mock fallback | ✅ |
| Swarm image + stack service + `NOTIFICATIONS_URL` on BFF | ✅ |
| Novu webhook → log status | ⏳ |
| Redis → BFF WS in-app | ⏳ |
| RMQ consumers | ⏳ |

## 📖 Термины

| Термин | Описание |
|--------|----------|
| **Workflow** | Сценарий в Novu Dashboard (`tag-content`, `forum-reply`, …) |
| **Subscriber** | Пользователь Novu (`subscriberId` = `userId`) |
| **Trigger** | Вызов workflow + payload |
| **NotificationLog** | Локальный audit |

## 🗄️ Сущности

### `Subscriber` (`notifications.subscriber`)

| Поле | Тип | Описание |
|------|-----|----------|
| `userId` | varchar PK | = novuSubscriberId |
| `email`, `fcmToken` | varchar nullable | Channels |
| `updatedAt` | timestamptz | — |

### `NotificationLog` (`notifications.notification_log`)

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID PK | — |
| `userId` | varchar | — |
| `workflowId` | varchar | Novu workflow |
| `transactionId` | varchar | Novu / mock id |
| `channel` | varchar | email \| push \| in_app \| unknown |
| `status` | varchar | pending \| sent \| failed \| delivered |
| `payload` | jsonb nullable | — |
| `createdAt` | timestamptz | — |

## 🔌 API (internal only)

| Method | Path | Описание |
|--------|------|----------|
| POST | `/internal/v1/notifications/trigger` | Trigger workflow |
| POST | `/internal/v1/notifications/subscribers/upsert` | Login/register sync |
| GET | `/health`, `/health/ready` | — |

### `POST /internal/v1/notifications/trigger`

```json
{
  "userId": "uuid",
  "workflowId": "tag-content",
  "payload": {
    "topicId": "uuid",
    "tagIds": ["uuid"]
  }
}
```

→ `{ "transactionId": "…", "mode": "mock"|"novu", "status": "sent"|"pending" }`

## ⚙️ Переменные scalar-config

| Ключ | Default | Описание |
|------|---------|----------|
| `notifications.feedbackReminderDays` | [1, 3, 7] | Интервалы feedback CRON *(next register)* |
| `notifications.digestHourUtc` | 9 | Час digest (UTC) |

## 📨 События

| Direction | Event | Workflow |
|-----------|-------|----------|
| HTTP | BFF fan-out `tag.content_tagged` | `tag-content` |
| consume | `auction.completed` … | next (RMQ) |
| produce | `notification.sent` / `failed` | Metrics later |

> Workflows: [notifications-analysis](../../03-architecture/notifications-analysis.md)

## 🔗 Взаимодействие

| Компонент | Протокол |
|-----------|----------|
| Novu Cloud | HTTPS `/v1/events/trigger` (or mock) |
| BFF | HTTP trigger; Redis WS later |
| subscriptions | match → BFF → this service |

## 🔒 Безопасность

- `NOVU_API_KEY` — Bitwarden / Swarm secret later
- Internal API — private network, no public BFF route for trigger
- Webhook HMAC — next

## ⚙️ Окружение

| Переменная | Обяз. | Описание |
|------------|-------|----------|
| `NOVU_API_KEY` | нет* | Без ключа — mock |
| `NOVU_API_URL` | нет | default `https://api.novu.co` |
| `DATABASE_URL` / `DB_*` | да | schema `notifications` |
| `NOTIFICATIONS_PORT` / `PORT` | нет | default `3010` |

> [PLATFORM-SECRETS.md](../../02-infrastructure/PLATFORM-SECRETS.md)

## 🖥️ Frontend

- In-app: `@novu/js` + `NOVU_APPLICATION_IDENTIFIER` — later
- Realtime bids/balance — BFF WS

## 📋 TODO

- [x] Scaffold + trigger + NotificationLog + mock
- [ ] Novu Cloud account + workflow `tag-content` in Dashboard
- [ ] Webhook HMAC → update log status
- [ ] Redis relay → BFF `notification.new`
- [ ] Vue Inbox component

## 📎 Связанные разделы

- [notifications-analysis](../../03-architecture/notifications-analysis.md)
- [ADR-004](../../03-architecture/adr/004-notifications-adapter.md)
- [forum/tags.md](../forum/tags.md)
- [subscriptions](../subscriptions/README.md)
- [Event catalog](../../03-architecture/event-catalog.md)

---

**Автор:** команда разработки · **Версия:** 0.3
