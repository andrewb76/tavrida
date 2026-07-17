# 🗄️ Миграции при деплое

> **Статус:** implemented · **Версия:** 0.3

## 🎯 Принципы

- **Один сервис = один набор migrations** в `services/{name}/src/migrations/`
- **Expand → deploy → contract** — без breaking DDL в одном релизе с кодом, который от них зависит
- Миграции **не** в общем каталоге; schema = имя сервиса ([ADR-001](../03-architecture/adr/001-database-schema-per-service.md))

## 🔄 Текущий запуск

Все PostgreSQL-сервисы содержат versioned baseline в
`services/{name}/src/migrations/` и при `NODE_ENV=production` выполняют pending
migrations через TypeORM **до** того, как Nest начинает принимать HTTP-трафик.
Таблица истории отдельна для каждой schema (`{schema}_migrations`).

Baseline поддерживает два безопасных сценария:

- пустая schema — создаётся из закреплённого SQL;
- уже существующая schema от раннего `synchronize` — migration только отмечается
  выполненной, но лишь если в ней присутствуют все таблицы baseline. Проверка
  намеренно не сравнивает schema с текущей entity metadata: иначе добавленная
  forward migration делала бы baseline невыполнимым. При отсутствии baseline
  tables запуск останавливается, данные автоматически не переписываются.

В текущем Swarm у каждого domain-service одна replica и `start-first`, поэтому
старая replica остаётся доступной, пока новая выполняет migration. До увеличения
числа replicas запуск следует вынести в dedicated one-shot job.

## 🔄 Целевой one-shot job

```bash
# CI step (пример)
docker run --rm \
  --network tavrida_net \
  -e DATABASE_URL=... \
  registry/tavrida/billing:${GIT_SHA} \
  node dist/scripts/migrate.js
```

Или dedicated one-shot Swarm service `billing-migrate` с `restart_policy: none`.

## 📋 TypeORM

```ts
// services/billing/ormconfig.ts
migrations: ['dist/migrations/*.js'],
migrationsTableName: 'billing_migrations',
schema: 'billing',
```

Новые изменения schema оформляются отдельной migration после baseline; `synchronize`
не является механизмом production deploy.

Forward migration `AddOutbox` добавляет `outbox_message` только producer-сервисам:
`auction`, `marketplace`, `user-profile`, `forum`.

## ✅ Checklist релиза с БД

1. Migration **backward-compatible** (новые nullable columns, no rename in-place)
2. Migration на чистой и существующей dev schema — success
3. Deploy новой версии сервиса
4. Следующий релиз — contract (drop column, NOT NULL) если нужно

## ⚠️ Rollback

- **Код откатили** — миграции **не откатываем автоматически** в prod
- Revert migration только если новая колонка не использовалась
- Подробнее: [runbook-rollback.md](./runbook-rollback.md)

## 🔗 Связанные разделы

- [10-data](../10-data/README.md)
- [MICROSERVICE-SPEC](../05-microservices/MICROSERVICE-SPEC.md)

---

**Автор:** команда разработки · **Версия:** 0.2-spec
