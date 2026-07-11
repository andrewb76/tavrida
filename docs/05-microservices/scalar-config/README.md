# ⚙️ Сервис: scalar-config

> **Статус:** scaffold v0.1 · **Версия:** 0.4 · **Schema:** `scalar_config`  
> **Legacy name:** settings · **Код:** `services/scalar-config` :3008 · [ADR-017](../../03-architecture/adr/017-plan-config-scalar-config-rename.md)

## 🎯 Назначение

Единый реестр **скалярных настроек** платформы (одно значение на ключ).

- Хранит JSON-значения: формулы rating, TTL, списки forum, defaults auction
- Redis cache (`scalar_config:{domain}:latest`, TTL из `scalar_config.cache.ttlSeconds`)
- Регистрация ключей domain-сервисами при деплое (**sync-манифест**)
- Изменение значений — **admin only**
- Stale ключи — видимы в admin, удаление **только вручную**

> vs plan-config (матрица Планы×Plan variables): [ADR-003](../../03-architecture/adr/003-settings-vs-financial-policy.md) · [registry-keys.md](../../13-maintenance/registry-keys.md)

## 📖 Термины

| Термин | Описание |
|--------|----------|
| **key** | `{domain}.{group}.{name}` — min 2 сегмента |
| **setting_key** | Метаданные ключа (тип, default, владелец, `syncStatus`) |
| **setting** | Текущее JSON-значение (линейный список, не матрица) |
| **syncStatus** | `active` / `stale` — ключ в / вне последнего sync (legacy: `registrationStatus: orphaned`) |
| **scope** | `global` или `user:{userId}` (редко) |
| **domain** | Префикс до первой точки (`rating`, `forum`) |

## 🗄️ Сущности

### `SettingKey` (`scalar_config.setting_key`)

| Поле | Тип | Описание |
|------|-----|----------|
| `key` | varchar PK | `rating.authorityExponent` |
| `type` | varchar | `number`, `boolean`, `string[]`, … |
| `defaultValue` | jsonb | Дефолт при первой регистрации |
| `service` | varchar | Владелец (кто вызывает sync) |
| `description` | text | Admin UI |
| `syncStatus` | varchar | `active` \| `stale` |

### `Setting` (`scalar_config.setting`)

| Поле | Тип | Описание |
|------|-----|----------|
| `key` | varchar PK | FK на `setting_key` |
| `value` | jsonb | Текущее значение |
| `scope` | varchar | `global` default |
| `userId` | UUID nullable | Per-user override |
| `updatedBy` | UUID nullable | Admin audit |

## 🔌 API

### Public (BFF)

| Method | Path | Описание |
|--------|------|----------|
| GET | `/settings/public` | Безопасное подмножество для клиента |

### Internal (`/internal/v1/`)

| Method | Path | Caller | Описание |
|--------|------|--------|----------|
| GET | `/settings/{domain}` | domain services | Объект ключей домена |
| POST | `/settings/register` | services @ startup | Batch register (legacy) |
| POST | `/settings/sync` | services @ startup | **Рекомендуется:** полный манифест → stale для отсутствующих |
| GET | `/settings/registry` | BFF admin | Все ключи + syncStatus |
| DELETE | `/settings/keys/:key` | admin via BFF | Удаление stale ключа |
| POST | `/settings/{domain}` | admin via BFF | Patch domain keys |

### `POST /internal/v1/settings/sync`

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

## ⚙️ Meta keys

| Ключ | Default | Описание |
|------|---------|----------|
| `scalar_config.cache.ttlSeconds` | 300 | TTL Redis |

Полный каталог: [PLATFORM-REGISTRY.md](../PLATFORM-REGISTRY.md) (секция Scalar config).

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
| `REDIS_URL` | да | Cache |
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
