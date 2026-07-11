# 📬 Сервис: notifications

> **Статус:** spec ready · **Версия:** 0.2 · **Schema:** `notifications`  
> **Платформа:** Novu Cloud Free · [ADR-004](../../03-architecture/adr/004-notifications-adapter.md)

## 🎯 Назначение

**Adapter уведомлений** — Novu workflows, subscribers, audit, relay in-app → BFF WebSocket.

- Trigger по HTTP (internal) и RabbitMQ consumers
- `subscriberId` = platform `userId`
- Webhook от Novu → `NotificationLog`
- Критичный realtime (ставки, balance) — дублируется BFF WS

## 📖 Термины

| Термин | Описание |
|--------|----------|
| **Workflow** | Сценарий в Novu Dashboard |
| **Subscriber** | Пользователь Novu |
| **Trigger** | Вызов workflow + payload |
| **NotificationLog** | Локальный audit |

## 🗄️ Сущности

### `Subscriber` (`notifications.subscriber`)

| Поле | Тип | Описание |
|------|-----|----------|
| `userId` | UUID PK | = novuSubscriberId |
| `email`, `fcmToken` | varchar nullable | Channels |
| `updatedAt` | timestamptz | — |

### `NotificationLog` (`notifications.notification_log`)

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID PK | — |
| `userId` | UUID | — |
| `workflowId` | varchar | Novu workflow |
| `transactionId` | varchar | Novu transaction |
| `channel` | enum | email \| push \| in_app |
| `status` | enum | sent \| failed \| pending \| delivered |
| `payload` | jsonb nullable | — |
| `createdAt` | timestamptz | — |

## 🔌 API (internal only)

| Method | Path | Описание |
|--------|------|----------|
| POST | `/internal/v1/notifications/trigger` | Trigger workflow |
| POST | `/internal/v1/notifications/subscribers/upsert` | Login/register sync |
| POST | `/internal/v1/notifications/webhooks/novu` | Novu delivery webhook |
| GET | `/health`, `/health/ready` | — |

### `POST /internal/v1/notifications/trigger`

```json
{
  "userId": "uuid",
  "workflowId": "feedback-reminder",
  "payload": {
    "auctionId": "uuid",
    "auctionTitle": "Редкая монета"
  }
}
```

→ `{ "transactionId": "novu-tx-id" }`

**Flow:** ensureSubscriber → `novu.trigger` → log pending → webhook updates status → in_app → Redis → BFF `notification.new`

## ⚙️ Переменные scalar-config

| Ключ | Default | Описание |
|------|---------|----------|
| `notifications.feedbackReminderDays` | [1, 3, 7] | Интервалы feedback CRON |
| `notifications.digestHourUtc` | 9 | Час digest (UTC) |

## 💳 Переменные plan-config

Не применимо.

## 📨 События

| Direction | Event | Workflow |
|-----------|-------|----------|
| consume | `auction.completed` | `feedback-request` |
| consume | `auction.bid_placed` | `auction-bid` (if subscribed) |
| consume | `feedback.reminder_due` | `feedback-reminder` |
| consume | `billing.charge_completed` | `balance-charged` |
| consume | `subscription.activated` | `subscription-activated` |
| consume | `subscription.expired` | `subscription-expired` |
| consume | `rating.penalty_applied` | `rating-penalty` |
| consume | `forum.content_reported` | `forum-content-reported` |
| produce | `notification.sent` | Metrics |
| produce | `notification.failed` | Alert |

> Workflows: [notifications-analysis](../../03-architecture/notifications-analysis.md)

## 🔗 Взаимодействие

| Компонент | Протокол |
|-----------|----------|
| Novu Cloud | `@novu/node` HTTPS |
| BFF | Redis → WS `user:{id}` |
| feedback, forum, … | RMQ or HTTP trigger |
| user-profile / Logto | email on upsert |

## 🔒 Безопасность

- `NOVU_API_KEY` — Bitwarden only
- Webhook — HMAC signature verify
- Internal API — private network, no BFF public route

## ⚙️ Окружение

| Переменная | Обяз. | Описание |
|------------|-------|----------|
| `NOVU_API_KEY` | да | Secret |
| `NOVU_APPLICATION_IDENTIFIER` | да | Public app id (frontend Inbox) |
| `NOVU_WEBHOOK_SECRET` | да | HMAC |
| `DATABASE_URL` | да | schema `notifications` |
| `REDIS_URL` | да | Relay in-app |
| `RABBITMQ_URL` | да | Consumers |
| `PORT` | нет | default `3010` |

> [PLATFORM-SECRETS.md](../../02-infrastructure/PLATFORM-SECRETS.md)

## 🖥️ Frontend

- In-app: `@novu/js` + `NOVU_APPLICATION_IDENTIFIER`
- Realtime bids/balance — BFF WS, не Novu

## 📋 TODO (implementation)

- [ ] Novu Cloud account + workflows in Dashboard
- [ ] PoC trigger + webhook + NotificationLog
- [ ] FCM in Novu
- [ ] Vue Inbox component

## 📎 Связанные разделы

- [notifications-analysis](../../03-architecture/notifications-analysis.md)
- [ADR-004](../../03-architecture/adr/004-notifications-adapter.md)
- [BFF](../bff/README.md)
- [Event catalog](../../03-architecture/event-catalog.md)

---

**Автор:** команда разработки · **Версия:** 0.2-spec
