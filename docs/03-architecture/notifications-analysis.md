# 📬 Notifications — Novu self-host

> **Статус:** accepted · **Решение:** [ADR-019](./adr/019-novu-self-host.md) (adapter: [ADR-004](./adr/004-notifications-adapter.md))  
> **Почему не Cloud:** Novu Cloud недоступен в Крыму.

## 🎯 Назначение

Стратегия уведомлений Tavrida Lot на базе **Novu Community Edition (self-host)**.

## ✅ Принятое решение

| Параметр | Значение |
|----------|----------|
| Платформа | Novu CE self-host (`docker/compose/novu.local.yml`) |
| Local | `pnpm novu:up` — Dashboard `:4000`, API `:3020` |
| Интеграция | `services/notifications/` — HTTP trigger / mock |
| Workflows | Self-host Dashboard |
| Cloud | Не используем (geo) |

## 📋 Сценарии → Novu Workflows

| Workflow ID | Сценарий | Каналы | Trigger |
|-------------|----------|--------|---------|
| `feedback-request` | Завершение аукциона → оценить | email, push, in-app | `auction.completed` |
| `feedback-reminder` | Напоминание об отзыве | email, push | CRON → `deal_feedback.reminder_due` |
| `auction-bid` | Новая ставка (подписан) | push, in-app, WS | `auction.bid_placed` |
| `auction-subscription-digest` | Новые лоты в категории | email digest, push | scheduled |
| `forum-reply` | Ответ в теме | email, push | HTTP trigger |
| `tag-content` | Новый контент с тегом (подписка TAG) | email, push, in-app | BFF fan-out `tag.content_tagged` |
| `forum-digest` | Email digest по теме (Pro) | email | scheduled |
| `balance-charged` | Списание с кошелька | in-app | `billing.charge_completed` |
| `subscription-activated` | Активация подписки | email, in-app | `subscription.activated` |
| `subscription-expired` | Истечение подписки | email | `subscription.expired` |
| `rating-penalty` | Штраф рейтинга | in-app, email | `rating.penalty_applied` |
| `forum-content-reported` | Жалоба на контент (admin) | email | `forum.content_reported` |

## 🏗️ Архитектура

```mermaid
sequenceDiagram
    participant S as upstream service
    participant A as notifications-adapter
    participant Novu as Novu CE
    participant BFF as BFF
    participant U as User

    S->>A: POST /internal/v1/notifications/trigger
    A->>A: ensure Subscriber (userId)
    A->>Novu: novu.trigger(workflowId, subscriberId, payload)
    Novu->>U: email / push / in-app
    Novu->>A: POST webhook (delivery status)
    A->>A: NotificationLog
    A->>BFF: Redis pub/sub notification.new
    BFF->>U: WS user:{id}
```

## ⚙️ Self-host — настройка (local)

### 1. Compose

```bash
pnpm novu:up
# http://localhost:4000 — Dashboard
# http://localhost:3020 — API
```

1. Создать org / admin в Dashboard
2. API Keys → `.env.local` как `NOVU_API_KEY` (или bootstrap `NOVU_SECRET_KEY` из `docker/compose/novu.local.env`)
3. `NOVU_API_URL=http://localhost:3020`
4. Создать workflow `tag-content`

### 2. Integration providers (в Novu Dashboard)

| Канал | Provider (рекомендация) |
|-------|-------------------------|
| Email | SMTP (local Mailhog / prod mail) |
| Push | Firebase FCM |
| In-app | Novu Inbox (built-in) |

### 3. Subscribers

- `subscriberId` = `userId` (UUID платформы)
- Email/phone/device tokens — синхронизация при регистрации/логине через adapter
- `POST /internal/v1/notifications/subscribers/upsert`

## 🔄 Путь дальше

1. Проверить local CE → опционально merge в `infra.local.yml`
2. Swarm stack Novu (dev/prod) + SMTP/FCM
3. Adapter API **не меняется** — только `NOVU_API_URL` + key

## 🔗 Связанные документы

- [ADR-004](./adr/004-notifications-adapter.md)
- [notifications service](../05-microservices/notifications/README.md)
- [Event catalog](./event-catalog.md)

---

**Автор:** команда разработки · **Версия:** 0.2-draft
