# 🧭 PROJECT-CONTEXT — bootstrap для сессии

> **Обновлять** при принятии ADR, смене фазы, новых ключевых docs.  
> **Не дублировать** specs — только указатели и решения.

## Проект

| | |
|---|---|
| **Имя** | Tavrida Lot |
| **Repo** | `max-alice` |
| **Суть** | Аукционы + форум + маркет услуг (Крым), рейтинг/отзывы, Free/Basic/Pro |
| **Фаза** | Docs v0.2 ✅ · Core + Domain specs ✅ · код — каркас |
| **Доки** | [docs/README.md](../README.md) |

## Стек

NestJS · Vue · PostgreSQL (schema per service) · Redis · RabbitMQ · MinIO · Docker Swarm · Traefik · Logto · **Ory Keto** · Novu Cloud Free · Grafana · Sentry · pnpm/turbo monorepo

## Принятые ADR

| # | Решение |
|---|---------|
| 001 | PostgreSQL **schema per service**, одна БД `tavrida_lot` |
| 002 | **BFF**: REST `/api/v1` + WebSocket `/ws/v1` |
| 003 | **settings** (скаляр) + **financial-policy** (лимиты per tariff) — [PLATFORM-REGISTRY](../05-microservices/PLATFORM-REGISTRY.md) |
| 004 | **Novu Cloud Free** + `notifications` adapter |
| 005 | **Forum entities:** `topic` + `comment`; `post` deprecated — [ADR-005](../03-architecture/adr/005-forum-terminology.md) |

## Ключевые docs (читать первым)

| Задача | Файл |
|--------|------|
| Продукт для людей | [platform-for-users.md](../01-goal/platform-for-users.md) |
| Роли | [roles.md](../01-goal/roles.md) |
| Marketplace | [marketplace/README.md](../05-microservices/marketplace/README.md) |
| Все переменные (бизнес) | [PLATFORM-REGISTRY.md](../05-microservices/PLATFORM-REGISTRY.md) |
| Все env / секреты | [PLATFORM-SECRETS.md](../02-infrastructure/PLATFORM-SECRETS.md) |
| Новый сервис | [MICROSERVICE-SPEC.md](../05-microservices/MICROSERVICE-SPEC.md) |
| События | [event-catalog.md](../03-architecture/event-catalog.md) |
| Keto | [keto-schema.md](../09-security/keto-schema.md) |
| Модераторы (mapping) | [moderator-mapping.md](../09-security/moderator-mapping.md) |
| Именование | [naming.md](../13-maintenance/naming.md) |
| API conventions | [06-api/README.md](../06-api/README.md) |

## Сервисы

**Код (каркас):** `billing`, `financial-policy`, `auction`, `auction-subscriptions`  
**Только docs:** `bff`, `rating`, `feedback`, `forum`, `user-profile`, `settings`, `notifications`, `marketplace`  
**Порты (draft):** billing 3001, financial-policy 3002, notifications 3010, bff 3000

## Роли (кратко)

Guest → User (member) · Moderator (+ forum **и auction** mod, уточняется) · **Expert** (экспертиза лотов, admin) · Admin  
Тариф ≠ роль: Free/Basic/Pro → financial-policy  
Контекст: seller/buyer/bidder per auction; provider/customer per marketplace order

## Открыто / не фиксировать

- Цены подписок Basic/Pro — **TBD** (обсуждались 99/399 ₽)
- admin-ui — не описан
- marketplace **комиссия / юридика** — TBD (отдельный doc)
- Moderator auction powers — draft в keto-schema
- ~~Moderator forum model~~ → [moderator-mapping.md](../09-security/moderator-mapping.md) ✅

## Правила docs

- Русский, emoji в заголовках, имя **Tavrida Lot**
- Новая переменная → PLATFORM-REGISTRY + README сервиса
- UX/права → platform-for-users + roles

## Roadmap docs

1. ✅ Фундамент 2. ✅ Core specs 3. ✅ Domain specs 4. ⏳ Ops 5. UX 6. Frontend

---

**v0.1** · последнее обновление: 2026-07-07
