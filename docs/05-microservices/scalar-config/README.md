# ⚙️ Сервис: scalar-config

> **Статус:** DB-backed registry/admin v1 · **Версия:** 0.5 · **Schema:** `scalar_config`
> **Legacy name:** settings · **Код:** `services/scalar-config` :3008 · [ADR-017](../../03-architecture/adr/017-plan-config-scalar-config-rename.md)

## 🎯 Назначение

Единый реестр **скалярных настроек** платформы (одно значение на ключ).

- Хранит JSON-значения: формулы rating, TTL, списки forum, defaults auction
- Регистрация ключей domain-сервисами при деплое (**sync-манифест**)
- Изменение значений — **admin only**
- Stale ключи — видимы в admin, удаление **только вручную**

> vs plan-config (матрица Планы×Plan variables): [ADR-003](../../03-architecture/adr/003-settings-vs-financial-policy.md) · [registry-keys.md](../../13-maintenance/registry-keys.md)

## 📖 Термины

| Термин | Описание |
|--------|----------|
| **key** | `{domain}.{group}.{name}` — min 2 сегмента |
| **scalar_variable** | Метаданные ключа (тип, default, владелец, `syncStatus`) |
| **scalar_value** | Текущее глобальное JSON-значение |
| **syncStatus** | `active` / `stale` — ключ в / вне последнего sync (legacy: `registrationStatus: orphaned`) |
| **domain** | Префикс до первой точки (`rating`, `forum`) |

## 🗄️ Сущности

### `ScalarVariable` / `ScalarValue`

Runtime-таблицы: `scalar_config.scalar_variable` (metadata, default,
`syncStatus`) и `scalar_config.scalar_value` (текущее глобальное JSON-значение).
Per-user overrides и Redis cache пока не реализованы.

## 🔌 API

### Public (BFF)

| Method | Path | Описание |
|--------|------|----------|
| GET | `/settings/public` | Безопасное подмножество для клиента |

### Internal (`/internal/v1/scalar-variables`)

| Method | Path | Описание |
|--------|------|----------|
| GET | `/scalar-variables/{domain}` | Значения домена |
| POST | `/scalar-variables/register` | Регистрация одного/набора ключей |
| POST | `/scalar-variables/sync` | Полный манифест → stale |
| GET | `/scalar-variables/registry` | Реестр для admin |
| DELETE | `/scalar-variables/{key}` | Удаление stale ключа |
| POST | `/scalar-variables/{domain}` | Patch значений домена |
| GET | `/scalar-variables/public` | Публичное подмножество |

### `POST /internal/v1/scalar-variables/sync`

```json
{
  "service": "bff",
  "keys": [
    {
      "key": "club.registration.inviteOnly",
      "type": "boolean",
      "default": true,
      "service": "bff",
      "description": "Закрытая регистрация"
    }
  ]
}
```

Ответ: `{ "service": "bff", "synced": 4, "stale": ["club.oldKey"] }`.

### Stale keys

Если сервис убрал ключ из манифеста — **автоудаления нет**. Ключ помечается `syncStatus: stale`. Admin удаляет вручную.

## 🚧 Planned

- Redis cache и TTL policy.
- Per-user overrides.
- Sync-манифесты остальных domain-сервисов помимо живых owners.

## 💳 Plan config

Не применимо — другой реестр (матрица per plan).

## 🔗 Взаимодействие

| Consumer | Домены |
|----------|--------|
| **bff** | `club.*` — sync при старте, admin UI |
| rating | `rating.*` |
| auction | `auction.*` scalar keys |
| billing | `billing.*` |
| forum | `forum.*` scalar keys |

## ⚙️ Окружение

| Переменная | Обяз. | Описание |
|------------|-------|----------|
| `DATABASE_URL` | да | schema `scalar_config` |
| `SCALAR_CONFIG_PORT` / `PORT` | нет | HTTP (`3008`) |

> BFF: `SCALAR_CONFIG_URL=http://localhost:3008` · [PLATFORM-SECRETS.md](../../02-infrastructure/PLATFORM-SECRETS.md)

## 📎 Связанные разделы

- [plan-config](../plan-config/README.md)
- [PLATFORM-REGISTRY](../PLATFORM-REGISTRY.md)
- [registry-keys.md](../../13-maintenance/registry-keys.md)
- [ADR-003](../../03-architecture/adr/003-settings-vs-financial-policy.md)
- [ADR-017](../../03-architecture/adr/017-plan-config-scalar-config-rename.md)

---

**Автор:** команда разработки · **Версия:** 0.4-spec
