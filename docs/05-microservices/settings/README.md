# ⚙️ Сервис: settings

> **Статус:** spec ready · **Версия:** 0.2 · **Schema:** `settings`

## 🎯 Назначение

Единый реестр **скалярных настроек** платформы (одно значение на ключ).

- Хранит JSON-значения: формулы rating, TTL, списки слов forum, defaults auction
- Redis cache (`settings:{domain}:latest`, TTL из `settings.cacheTtlSeconds`)
- Регистрация ключей domain-сервисами при деплое
- Изменение — **admin only**

> vs financial-policy: [ADR-003](../../03-architecture/adr/003-settings-vs-financial-policy.md)

## 📖 Термины

| Термин | Описание |
|--------|----------|
| **key** | `{service}.{parameterName}` camelCase |
| **scope** | `global` или `user:{userId}` (редко) |
| **domain** | Префикс до первой точки (`rating`, `forum`) |

## 🗄️ Сущности

### `Setting` (`settings.setting`)

| Поле | Тип | Описание |
|------|-----|----------|
| `key` | varchar PK | `rating.authorityExponent` |
| `value` | jsonb | Любой JSON |
| `scope` | varchar | `global` default |
| `userId` | UUID nullable | Per-user override |
| `updatedBy` | UUID nullable | Admin audit |
| `createdAt`, `updatedAt` | timestamptz | — |

## 🔌 API

### Public (BFF)

| Method | Path | Описание |
|--------|------|----------|
| GET | `/settings/public` | Безопасное подмножество для клиента (TBD list) |

### Internal (`/internal/v1/`)

| Method | Path | Caller | Описание |
|--------|------|--------|----------|
| GET | `/settings/{domain}` | все domain services | Объект всех ключей домена |
| GET | `/settings/key/{key}` | — | Одно значение |
| POST | `/settings/register` | services @ startup | Batch register defaults |
| POST | `/settings/{domain}` | admin via BFF | Patch domain keys |
| GET | `/health`, `/health/ready` | orchestrator | — |

### `POST /internal/v1/settings/register`

```json
{
  "keys": [
    {
      "key": "rating.authorityExponent",
      "type": "number",
      "default": 0.2,
      "service": "rating",
      "description": "Степень авторитета голосующего"
    }
  ]
}
```

### `GET /internal/v1/settings/rating`

```json
{
  "baseValue": 1,
  "authorityExponent": 0.2,
  "contextWeights": { "auction": 1.0, "forum": 1.2, "marketplace": 0.9 },
  "bonuses": { "earlyHours": 24, "earlyBonus": 0.5 }
}
```

Admin patch merges partial object; invalidates Redis cache.

## ⚙️ Переменные settings (meta)

| Ключ | Default | Описание |
|------|---------|----------|
| `settings.cacheTtlSeconds` | 300 | TTL Redis |

Полный реестр всех доменов: [PLATFORM-REGISTRY.md](../PLATFORM-REGISTRY.md) (секция Settings).

## 💳 Переменные financial-policy

Не применимо.

## 📨 События

Не produce/consume RabbitMQ. Cache invalidation — local + Redis pub/sub optional.

## 🔗 Взаимодействие

| Consumer | Домены |
|----------|--------|
| rating | `rating.*` |
| auction | `auction.*` |
| billing | `billing.*` |
| forum | `forum.*` |
| notifications | `notifications.*` |
| marketplace | `marketplace.*` |

## 🔒 Безопасность

- GET internal — service network
- POST mutate — Keto admin only via BFF
- Public subset — no secrets, no banned words list raw export (forum uses server-side filter)

## ⚙️ Окружение

| Переменная | Обяз. | Описание |
|------------|-------|----------|
| `DATABASE_URL` | да | schema `settings` |
| `REDIS_URL` | да | Cache |
| `PORT` | нет | HTTP |

> [PLATFORM-SECRETS.md](../../02-infrastructure/PLATFORM-SECRETS.md)

## 📎 Связанные разделы

- [PLATFORM-REGISTRY](../PLATFORM-REGISTRY.md)
- [ADR-003](../../03-architecture/adr/003-settings-vs-financial-policy.md)
- [MICROSERVICE-SPEC](../MICROSERVICE-SPEC.md)

---

**Автор:** команда разработки · **Версия:** 0.2-spec
