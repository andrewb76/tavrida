# 🗄️ Данные и владение

> **Статус:** draft v0.2 · **Стратегия:** [ADR-001 schema per service](../03-architecture/adr/001-database-schema-per-service.md)

## 🎯 Принципы

1. **Один schema = один микросервис** — владелец всех таблиц в schema.
2. **Нет cross-schema JOIN** — данные других сервисов через HTTP или events.
3. **Denormalized cache** — только с документированным источником истины и sync-механизмом.
4. **Миграции** — только владелец schema; backward-compatible expand → contract.

## 🏗️ PostgreSQL

| Параметр | Значение |
|----------|----------|
| Database | `tavrida_lot` |
| Instance | один на env (local/dev/prod) |
| Schema naming | snake_case имени сервиса |
| Connection | `postgres://user:pass@host:5432/tavrida_lot` |

## 📊 Матрица владения данными

| Schema | Сервис | Основные таблицы | Source of truth |
|--------|--------|------------------|-----------------|
| `billing` | billing | `user_wallet`, `transaction` | Баланс, транзакции |
| `financial_policy` | financial-policy | `plan`, `parameter`, `plan_parameter`, `user_subscription` | Тарифы, лимиты |
| `settings` | settings | `setting` | Скалярные конфиги |
| `auction` | auction | `auction`, `bid` | Лоты, ставки |
| `auction_subscriptions` | auction-subscriptions | `subscription`, `digest_preference` | Подписки |
| `rating` | rating | `user_rating`, `vote_log` | Рейтинг, карма |
| `feedback` | feedback | `deal_feedback`, `pending_feedback`, `feedback_bonus` | Отзывы |
| `user_profile` | user-profile | `user_profile`, `profile_note` | Bio, avatar, notes |
| `forum` | forum | `category`, `topic`, `comment`, `reaction`, `comment_closure` | Контент форума |
| `marketplace` | marketplace | `service_listing`, `portfolio_item`, `service_order` | Маркет услуг |
| `notifications` | notifications-adapter | `notification_log`, `subscriber` | Audit уведомлений |

## 🔄 Denormalized cache

| Cache field | Хранится в | Source of truth | Sync |
|-------------|------------|-----------------|------|
| `user_profile.rating` | user-profile | rating | event `rating.updated` / `feedback.submitted` |
| `user_profile.verified_sales` | user-profile | rating | event |
| `user_profile.pending_sales` | user-profile | rating | event `auction.completed`, `feedback.submitted` |

## 💾 Redis

| Key pattern | Owner | TTL | Назначение |
|-------------|-------|-----|------------|
| `settings:{domain}:latest` | settings | 300s | Кэш конфигов |
| `auction:{id}:bids` | auction | — | Live bids cache |
| `ws:channel:{name}` | BFF | — | Pub/sub relay |
| `idempotency:{key}` | billing | 24h | Idempotency keys |

## 📦 MinIO

| Bucket | Owner | Назначение |
|--------|-------|------------|
| `avatars` | user-profile | Аватары пользователей |
| `forum-attachments` | forum | Вложения к topic/comment |
| `auction-images` | auction | Фото лотов |
| `feedback-media` | feedback | Фото к отзывам |

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
- Запуск: `pnpm --filter billing migration:run`
- **Запрещено:** ручной DDL в prod без migration file
- Rollback: `migration:revert` + runbook в [04-deployment](../04-deployment/README.md)

## 💾 Backup

| Компонент | Стратегия | RPO | RTO |
|-----------|-----------|-----|-----|
| PostgreSQL | Daily full + WAL | 1h | 4h |
| Redis | RDB snapshot | 24h | 1h |
| MinIO | Replication / versioning | 24h | 4h |

> TODO: детали в deployment runbook

## 🔗 Связанные разделы

- [Architecture](../03-architecture/README.md)
- [MICROSERVICE-SPEC](../05-microservices/MICROSERVICE-SPEC.md)
- [Event catalog](../03-architecture/event-catalog.md)

---

**Автор:** команда разработки · **Версия:** 0.2-draft
