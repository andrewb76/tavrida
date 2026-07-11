# ADR-017: Переименование plan-config / scalar-config и формат plan variables

> **Статус:** accepted · **Дата:** 2026-07-11  
> **Supersedes (частично):** терминология [ADR-003](./003-settings-vs-financial-policy.md), [ADR-016](./016-financial-policy-parameter-registration.md)

## 🎯 Контекст

Имена `settings` и `financial-policy`, термин «parameter», двухсегментные ключи (`auction.activeAuctions`) и отдельная сущность `charge_target` создавали путаницу:

- «Settings» звучит как UI-настройки, а не реестр scalar config.
- «Financial-policy» смешивает планы, лимиты и разовые цены.
- Ключи без facet (`seller` / `bidder`) не отражали роль в auction.
- `registrationStatus: orphaned` — неочевидное имя для «ключ устарел после sync».
- `charge_target` дублировала plan matrix для разовых цен.

## ✅ Решение

### Переименование сервисов и schema

| Было | Стало | PG schema |
|------|-------|-----------|
| `settings` | **`scalar-config`** | `scalar_config` |
| `financial-policy` | **`plan-config`** | `plan_config` |

Env vars (BFF и callers):

| Было | Стало |
|------|-------|
| `SETTINGS_URL` | `SCALAR_CONFIG_URL` |
| `FINANCIAL_POLICY_URL` | `PLAN_CONFIG_URL` |
| `SETTINGS_PORT` | `SCALAR_CONFIG_PORT` |
| `FINANCIAL_POLICY_PORT` | `PLAN_CONFIG_PORT` |

Каталоги `services/scalar-config` и `services/plan-config` — **canonical с 2026-07-11** (бывш. `settings`, `financial-policy`).

### Терминология

| Было | Стало |
|------|-------|
| parameter | **plan variable** |
| `registrationStatus: orphaned` | **`syncStatus: stale`** |
| `registrationStatus: active` | **`syncStatus: active`** |
| charge_target + plan_charge_price | plan variable с **`valueType: price`** |

### Формат ключей plan variables

- **Минимум 3 сегмента:** `{domain}.{facet}.{group}.{leafName}`
- Facet: `seller`, `bidder`, `author`, `member`, … — когда роль имеет значение
- Групповой сегмент — **семантический** (`lot`, `search`); порядок в admin — поле `sortOrder` при register/sync
- Полные правила: [registry-keys.md](../../13-maintenance/registry-keys.md)

Пример: `auction.seller.lot.activeMax` (было `auction.sellerActiveLots`).

### Разовые платежи

Таблицы `charge_target` и `plan_charge_price` **сливаются** в plan variable:

- `valueType: price`
- значение per plan в `PlanParameter.priceAmount`
- resolve: `GET /internal/v1/charges/resolve?key=auction.seller.promotion.unitPrice`

### API routes (целевые)

| Было | Стало |
|------|-------|
| `/internal/v1/parameters/register` | `/internal/v1/plan-variables/register` |
| `/internal/v1/parameters/sync` | `/internal/v1/plan-variables/sync` |

Alias старых paths допустим на период миграции кода.

## 🔄 Альтернативы

| Вариант | Почему не выбран |
|---------|------------------|
| Оставить settings / financial-policy | Путаница с UI settings и «policy» |
| Один config-сервис | См. ADR-003 — разные bounded contexts |
| 2-segment plan keys | Нет facet и ordering для admin |

## 📌 Последствия

- ✅ [registry-keys.md](../../13-maintenance/registry-keys.md) — единый справочник имён
- ✅ [PLATFORM-REGISTRY.md](../../05-microservices/PLATFORM-REGISTRY.md) — auction keys в новом формате
- ✅ Docs paths: `plan-config/`, `scalar-config/`
- ✅ Rename `services/financial-policy` → `services/plan-config`, `services/settings` → `services/scalar-config`
- ⏳ DB migration: `financial_policy` → `plan_config`, drop `charge_target`
- ⏳ BFF env и clients (legacy aliases `SETTINGS_URL`, `FINANCIAL_POLICY_URL` — удалить после миграции)

## 🔗 Связанные документы

- [ADR-003](./003-settings-vs-financial-policy.md)
- [ADR-016](./016-financial-policy-parameter-registration.md)
- [registry-keys.md](../../13-maintenance/registry-keys.md)
