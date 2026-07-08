# 📬 Сервис: notifications

> **Статус:** draft · **Версия:** 0.2  
> **Платформа:** Novu Cloud (Free plan) · [ADR-004](../../03-architecture/adr/004-notifications-adapter.md)

## 🎯 Назначение

Adapter-сервис уведомлений Tavrida Lot — единая точка интеграции с **Novu Cloud**.

- Триггер Novu workflows по запросу upstream-сервисов и RabbitMQ events
- Upsert subscribers (синхронизация userId ↔ Novu)
- Audit log доставки (webhook от Novu)
- Relay in-app / critical events → BFF WebSocket

## 📖 Термины

| Термин | Описание |
|--------|----------|
| **Workflow** | Сценарий уведомления в Novu Dashboard |
| **Subscriber** | Пользователь в Novu (`subscriberId` = `userId`) |
| **Trigger** | Вызов workflow с payload |
| **NotificationLog** | Локальный audit доставки |

## 🗄️ Сущности

### `Subscriber`

```ts
@Entity({ schema: 'notifications', name: 'subscriber' })
export class Subscriber {
  @PrimaryColumn('uuid')
  userId: string

  @Column('varchar')
  novuSubscriberId: string // = userId

  @Column('varchar', { nullable: true })
  email?: string

  @Column('varchar', { nullable: true })
  fcmToken?: string

  @UpdateDateColumn()
  updatedAt: Date
}
```

### `NotificationLog`

```ts
@Entity({ schema: 'notifications', name: 'notification_log' })
export class NotificationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('uuid')
  userId: string

  @Column('varchar')
  workflowId: string

  @Column('varchar')
  transactionId: string // Novu transactionId

  @Column('varchar')
  channel: 'email' | 'push' | 'in_app'

  @Column('enum', { enum: ['sent', 'failed', 'pending', 'delivered'] })
  status: string

  @Column('jsonb', { nullable: true })
  payload?: object

  @CreateDateColumn()
  createdAt: Date
}
```

## 🔌 API (internal)

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

**Логика:**

1. `ensureSubscriber(userId)` — upsert в Novu + local cache
2. `novu.trigger(workflowId, { to: subscriberId, payload })`
3. Return `{ transactionId }`

### `POST /internal/v1/notifications/subscribers/upsert`

```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "fcmToken": "optional"
}
```

Вызывается BFF при login/register.

### `POST /internal/v1/notifications/webhooks/novu`

Webhook от Novu Cloud — обновление `NotificationLog`, relay in-app → Redis → BFF WS.

## 📨 События

| Direction | Event | Действие |
|-----------|-------|----------|
| consume | `auction.completed` | trigger `feedback-request` |
| consume | `auction.bid_placed` | trigger `auction-bid` (if subscribed) |
| consume | `feedback.reminder_due` | trigger `feedback-reminder` |
| consume | `billing.charge_completed` | trigger `balance-charged` |
| consume | `subscription.activated` | trigger `subscription-activated` |
| consume | `subscription.expired` | trigger `subscription-expired` |
| consume | `rating.penalty_applied` | trigger `rating-penalty` |
| consume | `forum.content_reported` | trigger `forum-content-reported` |
| produce | `notification.sent` | metrics |
| produce | `notification.failed` | metrics + alert |

> Полный каталог workflows: [notifications-analysis](../../03-architecture/notifications-analysis.md)

## 🔗 Взаимодействие

| Компонент | Протокол |
|-----------|----------|
| Novu Cloud | `@novu/node` SDK, HTTPS |
| BFF | Redis pub/sub → WS `user:{id}` |
| upstream services | HTTP trigger или RabbitMQ consumer |
| Logto / user-profile | email при upsert subscriber |

## 🔒 Безопасность

- `NOVU_API_KEY` — только Bitwarden, per environment
- Webhook endpoint — verify Novu signature (HMAC)
- Internal API — network ACL, не через BFF public

## ⚙️ Окружение

| Переменная | Описание |
|------------|----------|
| `NOVU_API_KEY` | Secret key из Novu Dashboard |
| `NOVU_APPLICATION_IDENTIFIER` | Application ID (для Inbox на фронте) |
| `DATABASE_URL` | PostgreSQL (`schema: notifications`) |
| `REDIS_URL` | Pub/sub → BFF |
| `PORT` | HTTP (default 3010) |

## 🖥️ Frontend (Vue)

- In-app inbox: `@novu/js` или headless API
- `applicationIdentifier` — public, из env фронта
- Критичные realtime — дублировать через BFF WS (ставки, balance)

## 📋 TODO

- [ ] Создать Novu Cloud account + dev environment
- [ ] Реализовать workflows в Dashboard (см. analysis doc)
- [ ] PoC: trigger + webhook + NotificationLog
- [ ] FCM integration в Novu
- [ ] Vue Inbox component

## 📎 Связанные разделы

- [Notifications analysis](../../03-architecture/notifications-analysis.md)
- [ADR-004](../../03-architecture/adr/004-notifications-adapter.md)
- [Event catalog](../../03-architecture/event-catalog.md)
- [BFF](../bff/README.md)

---

**Автор:** команда разработки · **Версия:** 0.2-draft
