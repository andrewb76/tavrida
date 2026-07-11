# ADR-016: Plan-config — планы, матрица и регистрация plan variables

> **Статус:** accepted · **Дата:** 2026-07-11 · **Обновлено:** 2026-07-11  
> **Сервис (canonical):** `plan-config` · **Legacy:** `financial-policy` ([ADR-017](./017-plan-config-scalar-config-rename.md))

## 🎯 Контекст

В ранней реализации `financial-policy` (каталог `services/financial-policy`, ныне `plan-config`) plan variables (`auction.*`, `club.*`) попадали в БД через **центральный seed** (`default-seed.ts`). Это создавало ложное впечатление, что сервис «знает» доменные ключи и владеет их семантикой.

Нужна чёткая граница:

- что plan-config хранит и отдаёт;
- откуда появляются строки в матрице **Планы × Plan variables**;
- где живут счётчики использования лимитов (открытый вопрос).

См. также [ADR-003](./003-settings-vs-financial-policy.md) — scalar-config vs plan-config.

## ✅ Решение

### Что plan-config знает и владеет

| Область | Описание |
|---------|----------|
| **Планы** | `Plan` — id, цены, title, `isActive` |
| **Подписки** | `UserSubscription` — план пользователя, срок, автопродление |
| **Кэш плана** | Resolve `userId → planId` для internal callers (in-memory / Redis — детали реализации) |
| **Матрица** | `PlanVariable` + `PlanParameter` — зарегистрированные ключи и значения per plan |
| **Проверки** | `limits/check`, `features/can-use` — сравнение **переданного** usage с лимитом из матрицы |
| **Цены** | plan variables `valueType: price` — resolve для billing (было `charge_target`) |
| **Админка** | BFF → list/patch матрицы; CRUD планов |

Plan-config **не содержит в коде** перечень доменных ключей (`auction.seller.lot.activeMax`, …).  
Пустая матрица до первой регистрации — нормальное состояние.

### Что plan-config не знает

- Семантику plan variable (что считать «активным лотом», «ставкой», «постом»).
- Текущее использование лимита (**счётчики**) — см. раздел «Открытый вопрос» ниже.
- Бизнес-правила домена beyond сравнения числа с потолком.

### Откуда появляются plan variables

**Только через регистрацию заинтересованного сервиса** при старте (или миграции):

```http
POST /internal/v1/plan-variables/register
```

(legacy alias: `/parameters/register`)

```json
{
  "key": "auction.seller.lot.activeMax",
  "service": "auction",
  "name": "Своих лотов на торгах (seller)",
  "description": "Макс. собственных лотов ACTIVE. −1 = без лимита.",
  "valueType": "limit",
  "planValues": {
    "free": { "limitValue": 2 },
    "basic": { "limitValue": 5 },
    "pro": { "limitValue": -1 }
  }
}
```

Пример `valueType: price`:

```json
{
  "key": "auction.seller.promotion.unitPrice",
  "service": "auction",
  "name": "Продвижение лота",
  "valueType": "price",
  "planValues": {
    "free": { "priceAmount": 200 },
    "basic": { "priceAmount": 200 },
    "pro": { "priceAmount": 150 }
  }
}
```

Правила:

1. **Владелец ключа** — domain-сервис из поля `service` (префикс `{service}.` в ключе).
2. **Формат ключа** — ≥3 сегмента, facet, numeric prefix — [registry-keys.md](../../13-maintenance/registry-keys.md).
3. **Дефолты по планам** (`planValues`) задаёт владелец при регистрации — не plan-config.
4. **Документация** — строка в [PLATFORM-REGISTRY.md](../../05-microservices/PLATFORM-REGISTRY.md) + секция 💳 в README сервиса.
5. **Повторный register** — upsert метаданных; значения матрицы не перезаписывать без явной политики (чтобы admin-правки не затирались при рестарте).
6. **Admin** меняет уже зарегистрированные значения через BFF (`PATCH` матрицы), не создаёт новые ключи вручную.

### PLATFORM-REGISTRY vs runtime

| Слой | Назначение |
|------|------------|
| [PLATFORM-REGISTRY.md](../../05-microservices/PLATFORM-REGISTRY.md) | **Каталог проектирования** — все запланированные ключи и дефолты для PM/docs |
| `plan_config.plan_variable` | **Runtime-реестр** — только то, что зарегистрировали живые сервисы |

Строка в PLATFORM-REGISTRY **не означает**, что ключ уже есть в БД plan-config.

### Seed в domain-сервисах (целевая модель)

Дефолты per plan хранятся **рядом с владельцем**:

```
services/auction/src/config/plan-variables.ts   # declare + planValues
services/user-profile/src/config/plan-variables.ts
```

При `onModuleInit` сервис вызывает **`POST /plan-variables/sync`** с полным манифестом своих ключей (рекомендуется) или по одному `register`.

### Stale plan variables (бывш. orphaned)

**Сценарий:** сервис при старте регистрировал `p1…p4`, admin настроил значения. В новой версии сервис передаёт в sync только `p1, p2, p4`. `p3` остаётся в БД plan-config вместе с `PlanParameter`.

**Политика:**

| Действие | Разрешено? |
|----------|------------|
| Автоудаление ключей, отсутствующих в sync | ❌ Небезопасно — можно потерять admin-конфиг и сломать rollback |
| Пометка `syncStatus: stale` | ✅ При `POST /plan-variables/sync` |
| Удаление admin вручную | ✅ `DELETE /internal/v1/plan-variables/:key` (BFF `/admin/financial/plan-variables/:key`) |
| `limits/check` для stale | ✅ Пока ключ не удалён — значения матрицы действуют |

**Рекомендуемый startup:**

```http
POST /internal/v1/plan-variables/sync
```

```json
{
  "service": "auction",
  "planVariables": [
    { "key": "auction.seller.lot.activeMax", "valueType": "limit", "planValues": { … } }
  ]
}
```

Ответ: `{ "synced": 2, "stale": ["auction.seller.lot.durationMaxHours"] }`.

**Тот же принцип для `scalar-config`:** линейный реестр `setting_key` + `setting`; `POST /internal/v1/settings/sync`; `syncStatus: stale` для ключей вне манифеста; admin `/admin/settings/registry` + удаление stale ключей.

### Временный dev-bootstrap (текущее состояние)

`services/plan-config/src/config/default-seed.ts` — **временный** локальный bootstrap для пустой БД и админки до переноса регистрации в `user-profile`, `auction`, …  

**Не является** целевой архитектурой. Удалить после переноса seeds в domain-сервисы.

### Диаграмма

```mermaid
sequenceDiagram
    participant Auction
    participant PC as plan-config
    participant BFF
    participant Admin

    Note over Auction: onModuleInit
    Auction->>PC: POST /plan-variables/sync (full manifest)
    PC->>PC: upsert active; mark missing as stale

    Admin->>BFF: PATCH /admin/financial/plan-variables
    BFF->>PC: patch matrix

    Auction->>Auction: count currentUsage (own DB)
    Auction->>PC: POST /limits/check { currentUsage }
    PC-->>Auction: allowed / limit / remaining
```

## ❓ Открытый вопрос: счётчики использования

`POST /limits/check` сегодня принимает `currentUsage` от caller. Plan-config **не хранит** счётчики.

| Вариант | Суть | Плюсы | Минусы |
|---------|------|-------|--------|
| **A. Caller-supplied** (текущий) | Domain считает usage в своей БД, передаёт в check | Plan-config agnostic; точная доменная семантика | Дублирование паттернов; риск рассинхрона при гонках |
| **B. Plan-config counters** | PC хранит usage per user+key | Один API | PC узнаёт домен; скользящие окна неуниверсальны |
| **C. Domain usage API** | PC запрашивает `GET /internal/usage?key=` у владельца | Единая точка check | Доп. latency; контракт на каждый тип окна |
| **D. Eventual counters** | События → агрегат (Redis/отдельный сервис) | Масштаб | Сложность; eventual consistency |

**Предварительный выбор:** вариант **A** для v1; пересмотреть при появлении sliding-window лимитов и нагрузки.

**Статус:** `proposed` — зафиксировать в отдельном ADR при первой реализации auction/forum limits.

## 🔄 Альтернативы

| Вариант | Почему не выбран |
|---------|------------------|
| Центральный seed в plan-config | Сервис знает все ключи; ломает bounded context |
| Admin создаёт ключи вручную | Нет владельца семантики; drift с кодом |
| Всё в scalar-config | Нет модели per-plan |

## 📌 Последствия

- ✅ Обновить [plan-config README](../../05-microservices/plan-config/README.md) — зона ответственности
- ✅ [MICROSERVICE-SPEC](../../05-microservices/MICROSERVICE-SPEC.md) — register при старте domain-сервиса
- ✅ [PLATFORM-REGISTRY](../../05-microservices/PLATFORM-REGISTRY.md) — каталог ≠ runtime
- ✅ [registry-keys.md](../../13-maintenance/registry-keys.md) — формат ключей
- ⏳ Перенести `default-seed.ts` → `config/plan-variables.ts` в domain-сервисах
- ⏳ Убрать central seed из plan-config после переноса
- ⏳ ADR по счётчикам — когда auction/forum начнут enforce limits

## 🔗 Связанные документы

- [ADR-003](./003-settings-vs-financial-policy.md)
- [ADR-017](./017-plan-config-scalar-config-rename.md)
- [plan-config README](../../05-microservices/plan-config/README.md)
- [registry-keys.md](../../13-maintenance/registry-keys.md)
- [PLATFORM-REGISTRY.md](../../05-microservices/PLATFORM-REGISTRY.md)
