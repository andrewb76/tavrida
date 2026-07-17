# ADR-001: PostgreSQL — schema per service

> **Статус:** accepted · **Дата:** 2026-07-06

## 🎯 Контекст

Нужна стратегия хранения данных для ~12 микросервисов. Варианты:

- отдельная БД на сервис (полная изоляция);
- одна БД, schema на сервис (компромисс для MVP);
- одна shared БД (просто, но coupling).

В ранних черновиках billing и plan-config указывали один `DATABASE_URL` → `tavrida_lot` без разделения.

## ✅ Решение

**Одна PostgreSQL-инстанция, отдельная `schema` на каждый микросервис.**

| Сервис | Schema |
|--------|--------|
| billing | `billing` |
| plan-config | `plan_config` |
| auction | `auction` |
| subscriptions | `subscriptions` |
| deal-feedback | `deal_feedback` |
| user-profile | `user_profile` |
| scalar-config | `scalar_config` |
| forum | `forum` |
| marketplace | `marketplace` |
| notifications | `notifications` |
| periods | `periods` |
| BFF (media intents) | `bff` |
| **Ory Keto** (infra) | `keto` |

- Connection string общий: `postgres://...@host:5432/tavrida_lot`
- TypeORM: `schema: '{name}'` в entity / ormconfig
- Миграции — в каталоге владельца schema; production startup выполняет pending
  migrations до открытия HTTP-порта ([migrations.md](../../04-deployment/migrations.md))
- Cross-schema JOIN **запрещены**
- **Инфраструктура:** schema `keto` в той же БД для Ory Keto (relation tuples); владелец — Keto (`keto migrate`), не NestJS. Доступ микросервисов — только Keto HTTP API. При росте нагрузки — отдельная БД.

## 🔄 Альтернативы

| Вариант | Плюсы | Минусы |
|---------|-------|--------|
| DB per service | Полная изоляция, независимый scale | Много инстансов, сложнее ops на MVP |
| Shared tables | Быстрый старт | Coupling, нарушение bounded context |
| **Schema per service** | Изоляция логическая, один инстанс | Общий failure domain БД |

## 📌 Последствия

- ✅ Обновить `DATABASE_URL` во всех README: одна БД, разные schema
- ✅ Документ [10-data/README.md](../../10-data/README.md) — матрица владения
- ✅ При росте нагрузки — миграция schema → отдельная БД без смены кода (смена DSN)
- ⚠️ Backup/restore — на уровне инстанса; PITR покрывает все schema

## 🔗 Связанные документы

- [MICROSERVICE-SPEC](../../05-microservices/MICROSERVICE-SPEC.md)
- [10-data](../../10-data/README.md)
