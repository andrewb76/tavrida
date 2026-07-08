# 🗄️ Миграции при деплое

> **Статус:** spec ready · **Версия:** 0.2

## 🎯 Принципы

- **Один сервис = один набор migrations** в `services/{name}/src/migrations/`
- **Expand → deploy → contract** — без breaking DDL в одном релизе с кодом, который от них зависит
- Миграции **не** в общем каталоге; schema = имя сервиса ([ADR-001](../03-architecture/adr/001-database-schema-per-service.md))

## 🔄 Job перед rolling update

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

Команды (package.json сервиса):

```bash
pnpm migration:generate -- -n AddIdempotencyKey
pnpm migration:run
pnpm migration:revert  # только dev / emergency
```

## ✅ Checklist релиза с БД

1. Migration **backward-compatible** (новые nullable columns, no rename in-place)
2. Job `migration:run` — success на dev
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
