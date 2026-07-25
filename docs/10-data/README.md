# 🗄️ Данные и владение

> **Статус:** draft v0.2 · **Стратегия:** [ADR-001 schema per service](../03-architecture/adr/001-database-schema-per-service.md)

## 🎯 Принципы

1. **Одна schema = один владелец** — микросервис или инфра-компонент (см. `keto`).
2. **Нет cross-schema JOIN** — данные других сервисов через HTTP или events.
3. **Denormalized cache** — только с документированным источником истины и sync-механизмом.
4. **Миграции** — только владелец schema; backward-compatible expand → contract.

## 🏗️ PostgreSQL


| Параметр      | Значение                                     |
| ------------- | -------------------------------------------- |
| Database      | `tavrida_lot`                                |
| Instance      | один на env (local/dev/prod)                 |
| Schema naming | snake_case имени сервиса                     |
| Connection    | `postgres://user:pass@host:5432/tavrida_lot` |




## 📊 Матрица владения данными


| Schema                  | Сервис                | Основные таблицы                                              | Source of truth    |
| ----------------------- | --------------------- | ------------------------------------------------------------- | ------------------ |
| `billing`               | billing               | `user_wallet`, `transaction`                                  | Баланс, транзакции |
| `plan_config`           | plan-config           | `plan`, `plan_variable`, `plan_variable_tier`, `user_subscription` | Тарифы, plan variables, подписки |
| `scalar_config`         | scalar-config         | `scalar_variable`, `scalar_value`                                      | Скалярные конфиги  |
| `auction`               | auction               | `auction`, `bid`, `expert_appraisal`, `outbox_message`, `expert_appraisal`, `outbox_message`                                              | Лоты, ставки       |
| `subscriptions`         | subscriptions         | `subscription`, `delivery_preference`                         | Event-подписки     |
| `rating`                | rating                | `user_rating`, `vote_log`                                     | Рейтинг, карма     |
| `deal_feedback`         | deal-feedback         | `deal_feedback`, `pending_deal_feedback`, `processed_event`         | Отзывы             |
| `user_profile`          | user-profile          | `user_profile`, `profile_note`, `user_rating`, `reputation_change_log`, `outbox_message`, `outbox_message` | Bio, avatar, notes; temporary rating SoT until `rating` svc |
| `forum`                 | forum                 | `category`, `topic`, `comment`, `reaction`, `comment_closure`, `tag`, `content_tag`, `outbox_message`, `outbox_message` | Контент форума     |
| `marketplace`           | marketplace           | `service_listing`, `portfolio_item`, `service_order`, `outbox_message`, `outbox_message`          | Маркет услуг       |
| `notifications`         | notifications         | `notification_log`, `subscriber`                              | Audit уведомлений  |
| `periods`               | periods               | categories / periods                                          | Исторические периоды |
| `chat`                  | chat                  | `chat`, `chat_member`, `message`, `message_attachment`, `outbox_message` | Приватные чаты |
| `keto`                  | **Ory Keto** (infra)  | relation tuples (RBAC/ReBAC)                                  | Права доступа      |

> **Retired schemas:** `financial_policy` → `plan_config`, `settings` → `scalar_config`. Canonical schemas перечислены выше.


> **Инфраструктура:** `keto` — не NestJS-сервис; таблицы и миграции ведёт `keto migrate up`. Микросервисы обращаются только к Keto HTTP API. При росте нагрузки — отдельная БД (смена DSN).




## 🔄 Denormalized cache


| Cache field                   | Хранится в   | Source of truth | Sync                                            |
| ----------------------------- | ------------ | --------------- | ----------------------------------------------- |
| `user_profile.rating`         | user-profile | rating          | event `rating.updated` / synchronous `DEAL_FEEDBACK` adjustment today   |
| `user_profile.verified_sales` | user-profile | rating          | event                                           |
| `user_profile.pending_sales`  | user-profile | rating          | event `auction.completed`; deal-feedback event planned |




## 💾 Redis


| Key pattern                | Owner    | TTL  | Назначение       |
| -------------------------- | -------- | ---- | ---------------- |
| `auction:{id}:bids`        | auction  | —    | Live bids cache  |
| `ws:channel:{name}`        | BFF      | —    | Pub/sub relay    |
| `idempotency:{key}`        | billing  | 24h  | Idempotency keys |




## 📦 MinIO


| Bucket              | Owner        | Назначение               |
| ------------------- | ------------ | ------------------------ |
| `avatars`           | user-profile | Аватары пользователей    |
| `forum-attachments` | forum        | Вложения к topic/comment |
| `auction-images`    | auction      | Фото лотов               |
| `marketplace-portfolio` | marketplace | Фото портфолио услуг |
| `feedback-media`    | feedback     | Фото к отзывам           |




## 🔧 TypeORM

```ts
// ormconfig.ts — пример
export default {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  schema: 'billing',
  entities: ['dist/entities/**/*.js'],
  migrations: ['dist/migrations/**/*.js'],
  migrationsTableName: 'billing_migrations',
}
```

Entity:

```ts
@Entity({ schema: 'billing', name: 'user_wallet' })
export class UserWallet { }
```



## 📋 Миграции

- Именование: `{timestamp}-{description}.ts`
- Production: pending migrations выполняются сервисом до открытия HTTP-порта
- **Запрещено:** ручной DDL в prod без migration file
- Rollback migration не автоматизируется; порядок и baseline guard описаны в
  [migrations.md](../04-deployment/migrations.md)



## 💾 Backup


| Компонент  | Стратегия                | RPO | RTO |
| ---------- | ------------------------ | --- | --- |
| PostgreSQL | Daily full + WAL         | 1h  | 4h  |
| Redis      | RDB snapshot             | 24h | 1h  |
| MinIO      | Replication / versioning | 24h | 4h  |


> TODO: детали в deployment runbook



## 🔗 Связанные разделы

- [Architecture](../03-architecture/README.md)
- [MICROSERVICE-SPEC](../05-microservices/MICROSERVICE-SPEC.md)
- [Event catalog](../03-architecture/event-catalog.md)

---

**Автор:** команда разработки · **Версия:** 0.2-draft