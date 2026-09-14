# Объединённый сервис «Настройки, Тарифы, Лимиты»

> **Статус:** draft · **Дата:** 2026-09-14  
> **Цель:** Мерж `scalar-config` + `plan-config` в единый сервис с поддержкой `limited-user-var`, `user-var`

---

## 1. Анализ текущего состояния vs желаемое

### Что есть сейчас

| Сервис | Schema | Значений на ключ | Назначение |
|--------|--------|------------------|------------|
| `scalar-config` (3008) | `scalar_config` | 1 (global) | Глобальные настройки сервисов |
| `plan-config` (3002) | `plan_config` | N per plan (Free/Basic/Pro) | Лимиты, фичи, цены по тарифам |

**Текущие проблемы:**
- Два отдельных сервиса с разными API, разными BFF-контроллерами, разными UI-страницами
- `plan-config` считает лимиты через `caller-supplied currentUsage` — нет централизованных счётчиков
- Нет concept «периодных лимитов» (час/сутки/неделя/месяц)
- Нет cron-восстановления лимитов
- Нет логирования использований
- Нет персональных настроек пользователя

### Что нужно — 4 категории параметров

| Категория | Значений | Кто пишет | Пример |
|-----------|----------|-----------|--------|
| `system-var` | 1 на сервис (+ override per user) | Admin | `forum.edit.windowMinutes = 10` |
| `tarif-var` | 1 на пересечение (param × plan) | Admin | `forum.author.post.dailyMax: free=10, pro=∞` |
| `limited-user-var` | 1 на пересечение (param × plan × user × period) | Сервис + cron | `forum.author.post.dailyMax: user X, суточный лимит=3, остаток=1` |
| `user-var` | 1 на (param × user) | Пользователь | `chat.notify.messagePush = true` |

### Ключевые отличия от текущей реализации

| Аспект | Сейчас | Нужно |
|--------|--------|-------|
| Категории параметров | `limit`, `feature`, `enum`, `price` | `system-var`, `tarif-var`, `limited-user-var`, `user-var` |
| Хранение лимитов | Caller передаёт `currentUsage` | Централизованные счётчики в БД |
| Периоды | Нет | `hour`, `day`, `week` (7д), `month` |
| Восстановление | Нет | Cron-задача + check при consume |
| Логирование | Нет | Таблица `limit_usage_log` |
| Персональные настройки | Нет | `user-var` + `user_override` для system-var |
| Покупка лимитов | Нет | `limit_purchase` — доп. единицы за деньги |
| Admin UI | 2 отдельные страницы | Единая страница с sidebar по сервисам |

---

## 2. Схема БД (объединённая)

### PostgreSQL schema: `settings`

```
                                    ┌─────────────────┐
                                    │      plan        │
                                    │ id · title · ... │
                                    └────────┬────────┘
                                             │
┌────────────────────┐        ┌──────────────▼──────────────────────────────┐
│                    │        │              parameter                       │
│   system_value     │◄───────│ key · service · category · user_override    │
│                    │        │ name · description · param_type             │
│ param_key (PK)     │        │ default_value (jsonb) · sort_order          │
│ value (jsonb)      │        │ sync_status                                 │
│ updated_by         │        └───┬──────────┬──────────┬──────────┬───────┘
│ updated_at         │            │          │          │          │
└────────────────────┘            │          │          │          │
                                  ▼          ▼          ▼          ▼
┌───────────────────┐  ┌──────────────┐  ┌───────────┐  ┌─────────────────┐
│   user_value      │  │  plan_value  │  │ user_limit│  │ limit_purchase  │
│                   │  │              │  │           │  │                 │
│ user_id (PK)      │  │ plan_id (PK) │  │ PK:       │  │ PK: id (uuid)   │
│ param_key (PK)    │  │ param_key(PK)│  │  param_key│  │ param_key       │
│ value (jsonb)     │  │ value (jsonb)│  │  plan_id  │  │ user_id         │
│ updated_at        │  │ updated_at   │  │  user_id  │  │ period          │
│                   │  │              │  │  period   │  │ purchased units │
│ (для user-var +   │  │              │  │ max_value │  │ used            │
│  user overrides)  │  │              │  │ remaining │  │ expires_at      │
│                   │  │              │  │ cycle_s/e │  │ created_at      │
└───────────────────┘  └──────────────┘  └─────┬─────┘  └─────────────────┘
                                                │
                                     ┌──────────▼──────────┐
                                     │  limit_usage_log    │
                                     │                     │
                                     │ id (PK, uuid)       │
                                     │ param_key · plan_id │
                                     │ user_id · period    │
                                     │ delta · remaining   │
                                     │ created_at · meta   │
                                     └─────────────────────┘
```

### Таблица `plan`

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | varchar(32) PK | `free`, `basic`, `pro` |
| `title` | text | Отображаемое имя |
| `description` | text | |
| `monthly_price` | decimal(12,2) | Цена/мес (₽) |
| `yearly_price` | decimal(12,2) | Цена/год (₽) |
| `is_active` | boolean | Видимость тарифа |
| `sort_order` | int | Порядок сортировки |

### Таблица `parameter`

| Колонка | Тип | Описание |
|---------|-----|----------|
| `key` | varchar(128) PK | `forum.author.post.dailyMax` |
| `service` | varchar(64) | `forum`, `chat`, `auction` |
| `category` | varchar(16) | `system-var`, `tarif-var`, `limited-user-var`, `user-var` |
| `name` | text | Человекочитаемое имя |
| `description` | text | Описание назначения |
| `param_type` | varchar(16) | `boolean`, `int`, `string`, `enum` |
| `default_value` | jsonb | Дефолт (system/tarif) или period configs (limited) |
| `user_override` | boolean | Разрешён ли override на уровне пользователя (только для `system-var`) |
| `sort_order` | int | Порядок в admin UI |
| `sync_status` | varchar(16) | `active` / `stale` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**`default_value` для `limited-user-var`:**
```json
{
  "periods": [
    { "period": "hour", "max_value": 3 },
    { "period": "day", "max_value": 10 },
    { "period": "week", "max_value": 30 },
    { "period": "month", "max_value": 50 }
  ],
  "unit_price": 50
}
```

### Таблица `system_value`

| Колонка | Тип | Описание |
|---------|-----|----------|
| `param_key` | varchar(128) PK, FK | → parameter.key |
| `value` | jsonb | Текущее глобальное значение |
| `updated_by` | varchar(128) | Кто изменил |
| `updated_at` | timestamptz | |

### Таблица `user_value` (НОВАЯ)

Хранит:
- Значения для `user-var` (персональные настройки пользователя)
- Override для `system-var` (когда `parameter.user_override = true`)

| Колонка | Тип | Описание |
|---------|-----|----------|
| `user_id` | varchar(128) PK | Logto user ID |
| `param_key` | varchar(128) PK, FK | → parameter.key |
| `value` | jsonb | Значение пользователя |
| `updated_at` | timestamptz | |

### Таблица `plan_value`

| Колонка | Тип | Описание |
|---------|-----|----------|
| `plan_id` | varchar(32) PK, FK | → plan.id |
| `param_key` | varchar(128) PK, FK | → parameter.key |
| `value` | jsonb | Значение для плана |
| `updated_at` | timestamptz | |

**`value` для `tarif-var`:**
- `int`: `{ "limit_value": 10 }` (−1 = unlimited, null = deny)
- `boolean`: `{ "enabled": true }`
- `enum`: `{ "values": ["ENGLISH", "DUTCH"] }`
- `price`: `{ "price_amount": 200 }`

### Таблица `user_limit`

| Колонка | Тип | Описание |
|---------|-----|----------|
| `param_key` | varchar(128) PK, FK | → parameter.key |
| `plan_id` | varchar(32) PK, FK | → plan.id |
| `user_id` | varchar(128) PK | Logto user ID |
| `period` | varchar(8) PK | `hour`, `day`, `week`, `month` |
| `max_value` | int | Лимит из тарифа (приоритет над default) |
| `remaining` | int | Текущий остаток (базовый лимит) |
| `cycle_start` | timestamptz | Начало текущего цикла |
| `cycle_end` | timestamptz | Конец текущего цикла (= cycle_start + period) |
| `updated_at` | timestamptz | |

**`week` = ровно 7 дней от `cycle_start`**, не календарная неделя.

### Таблица `limit_purchase` (НОВАЯ)

Пользователь может покупать дополнительные единицы лимита за деньги.

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | uuid PK | |
| `param_key` | varchar(128) | |
| `user_id` | varchar(128) | |
| `period` | varchar(8) | |
| `purchased` | int | Куплено единиц |
| `used` | int | Использовано из купленных |
| `expires_at` | timestamptz | Срок действия (end of period cycle) |
| `created_at` | timestamptz | |
| `meta` | jsonb | `{ "billing_charge_id": "...", "unit_price": 50 }` |

**Вычисляемый остаток:** `purchased - used`

### Таблица `limit_usage_log`

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | uuid PK | |
| `param_key` | varchar(128) | |
| `plan_id` | varchar(32) | |
| `user_id` | varchar(128) | |
| `period` | varchar(8) | |
| `delta` | int | −1 при расходе, +N при начислении |
| `remaining_after` | int | Остаток после операции (базовый) |
| `source` | varchar(16) | `base` / `purchased` / `grant` / `cycle_restore` |
| `created_at` | timestamptz | |
| `meta` | jsonb | Произвольный контекст (actor, reason) |

---

## 3. Порядок разрешения значений (resolve)

### system-var

```
1. Есть user_value для (userId, key)?  → вернуть user_value.value
2. Иначе → system_value.value
```

### tarif-var

```
1. Есть plan_value для (planId, key)?  → вернуть plan_value.value
2. Иначе → parameter.default_value
```

### limited-user-var

```
1. Resolve userId → planId (из user_subscription)
2. Найти user_limit(key, planId, userId, period)
3. Если cycle_end <= now() → восстановить (remaining = max_value, новый cycle)
4. Проверить remaining > 0
5. Если remaining == 0 → проверить limit_purchase (purchased - used > 0?)
6. Если purchased остаток == 0 → DENY
7. Все периоды должны пройти check → ALLOW
```

---

## 4. API Endpoints (объединённый)

### Internal (service-to-service)

| Method | Path | Описание |
|--------|------|----------|
| POST | `/internal/v1/parameters/register` | Регистрация параметра |
| POST | `/internal/v1/parameters/sync` | Sync-манифест от сервиса |
| GET | `/internal/v1/parameters?service=forum&category=tarif-var` | Список параметров |
| DELETE | `/internal/v1/parameters/:key` | Удаление параметра |

| Method | Path | Описание |
|--------|------|----------|
| GET | `/internal/v1/system-values/:domain` | Значения для домена |
| POST | `/internal/v1/system-values/:domain` | Batch-patch значений |
| GET | `/internal/v1/system-values/public` | Публичные значения (без auth) |

| Method | Path | Описание |
|--------|------|----------|
| GET | `/internal/v1/user-values/:userId` | Все user-values для пользователя |
| GET | `/internal/v1/user-values/:userId/:key` | Значение пользователя |
| PATCH | `/internal/v1/user-values/:userId/:key` | Обновление (user-var или override) |

| Method | Path | Описание |
|--------|------|----------|
| GET | `/internal/v1/plan-values?plan=free&service=forum` | Матрица значений |
| PATCH | `/internal/v1/plan-values/:planId/:key` | Обновление значения per plan |
| GET | `/internal/v1/plan-values/resolve?userId=X&key=Y` | Значение для пользователя (с учётом override) |
| GET | `/internal/v1/plan-values/resolve-price?userId=X&key=Y` | Цена для пользователя |

| Method | Path | Описание |
|--------|------|----------|
| POST | `/internal/v1/limits/check` | Проверка лимита (read-only) |
| POST | `/internal/v1/limits/consume` | Расход лимита (атомарный, с проверкой purchased) |
| POST | `/internal/v1/limits/grant` | Ручное начисление лимита |
| GET | `/internal/v1/limits/state?userId=X&key=Y` | Состояние лимита |
| POST | `/internal/v1/limits/purchase` | Запись покупки единиц |

| Method | Path | Описание |
|--------|------|----------|
| GET | `/internal/v1/plans` | Список планов |
| GET | `/internal/v1/plans/all` | Все планы (включая inactive) |
| PATCH | `/internal/v1/plans/:id` | Обновление плана |
| GET | `/internal/v1/plans/resolve?userId=X` | Текущий план пользователя |

| Method | Path | Описание |
|--------|------|----------|
| POST | `/internal/v1/subscriptions/activate` | Активация подписки |
| POST | `/internal/v1/subscriptions/cancel-auto-renew` | Отмена автопродления |
| POST | `/internal/v1/subscriptions/renew/run` | Cron: обновление подписок |
| POST | `/internal/v1/limits/restore/run` | Cron: восстановление лимитов |

### Admin (через BFF)

| Method | Path | Описание |
|--------|------|----------|
| GET | `/api/v1/admin/settings/services` | Список сервисов |
| GET | `/api/v1/admin/settings/parameters?service=X` | Параметры сервиса |
| GET | `/api/v1/admin/settings/parameters/:key` | Детали параметра |
| POST | `/api/v1/admin/settings/parameters` | Создание параметра |
| PATCH | `/api/v1/admin/settings/parameters/:key` | Обновление метаданных (+ user_override) |
| DELETE | `/api/v1/admin/settings/parameters/:key` | Удаление |

| Method | Path | Описание |
|--------|------|----------|
| GET | `/api/v1/admin/settings/system-values?service=X` | Системные значения |
| PATCH | `/api/v1/admin/settings/system-values/:key` | Обновление системного значения |

| Method | Path | Описание |
|--------|------|----------|
| GET | `/api/v1/admin/settings/plans` | Список планов |
| POST | `/api/v1/admin/settings/plans` | Создание плана |
| PATCH | `/api/v1/admin/settings/plans/:id` | Обновление плана |
| DELETE | `/api/v1/admin/settings/plans/:id` | Удаление плана |

| Method | Path | Описание |
|--------|------|----------|
| GET | `/api/v1/admin/settings/plan-values` | Матрица (параметры × планы) |
| PATCH | `/api/v1/admin/settings/plan-values/:planId/:key` | Значение per plan |

| Method | Path | Описание |
|--------|------|----------|
| GET | `/api/v1/admin/settings/user-limits?plan=X` | Лимиты пользователей |
| GET | `/api/v1/admin/settings/user-limits/:userId` | Лимиты конкретного пользователя |
| POST | `/api/v1/admin/settings/user-limits/grant` | Ручное начисление |
| GET | `/api/v1/admin/settings/usage-log?userId=X` | Лог использований |

---

## 5. Cron-задачи

### 5.1 Восстановление лимитов (`restore-limits`)

**Частота:** каждую минуту  
**Логика:**

```sql
-- Найти все user_limit где cycle_end <= now()
SELECT * FROM settings.user_limit WHERE cycle_end <= now();

-- Для каждой записи:
-- period  | Длительность цикла
-- --------|-------------------
-- hour    | cycle_start + 1 hour
-- day     | cycle_start + 1 day
-- week    | cycle_start + 7 days (ровно 7 дней, не календарная неделя!)
-- month   | cycle_start + 1 month (календарный месяц)

-- UPDATE remaining = max_value, cycle_start = now(), cycle_end = now() + period
-- INSERT INTO limit_usage_log (delta = +max_value, source = 'cycle_restore')
```

### 5.2 Продление подписок (`renew-subscriptions`)

**Частота:** ежечасно  
**Логика:** идентична текущей в plan-config

---

## 6. Логика consume с учётом purchased

```
POST /internal/v1/limits/consume
{
  "userId": "x",
  "key": "forum.author.post.dailyMax",
  "periods": ["hour", "day", "month"]
}
```

**Для каждого периода:**

```
1. Resolve userId → planId
2. Найти/создать user_limit(key, planId, userId, period)
3. Если cycle_end <= now() → restore (remaining = max_value, новый цикл)
4. Если remaining > 0:
   → remaining--, записать log (source='base')
   → OK
5. Если remaining == 0:
   → Найти limit_purchase WHERE param_key=key AND user_id=userId
     AND period=period AND expires_at > now()
     AND (purchased - used) > 0
   → Если есть purchased остаток:
     → used++, записать log (source='purchased')
     → OK
   → Если нет:
     → DENY, вернуть { allowed: false, period, remaining: 0, purchasedRemaining: 0 }
```

**Ответ при успехе:**
```json
{
  "consumed": true,
  "limits": [
    { "period": "hour", "max": 1, "remaining": 0, "purchasedRemaining": 3, "cycleEnd": "..." },
    { "period": "day", "max": 3, "remaining": 2, "purchasedRemaining": 0, "cycleEnd": "..." },
    { "period": "month", "max": 10, "remaining": 9, "purchasedRemaining": 0, "cycleEnd": "..." }
  ]
}
```

---

## 7. Регистрация параметров — примеры

### Forum (onModuleInit)

```typescript
await settingsClient.sync({
  service: 'forum',
  parameters: [
    // system-var: глобальные настройки (с user_override)
    {
      key: 'forum.edit.windowMinutes',
      category: 'system-var',
      name: 'Окно редактирования поста',
      description: 'Минуты после публикации. 0 — запрещено, -1 — без ограничения.',
      paramType: 'int',
      defaultValue: 10,
      userOverride: true,  // ← пользователь может переопределить
    },
    {
      key: 'forum.vote.changeWindowMinutes',
      category: 'system-var',
      name: 'Окно смены голоса',
      paramType: 'int',
      defaultValue: 3,
      userOverride: false,
    },
    // tarif-var: значения per plan
    {
      key: 'forum.author.post.dailyMax',
      category: 'tarif-var',
      name: 'Лимит постов в сутки',
      description: 'Макс. количество постов пользователя в сутки.',
      paramType: 'int',
      defaultValue: { limit_value: 10 },
      planValues: {
        free: { limit_value: 10 },
        basic: { limit_value: 50 },
        pro: { limit_value: -1 },
      },
    },
    // limited-user-var: периодные лимиты
    {
      key: 'forum.author.post.createRate',
      category: 'limited-user-var',
      name: 'Лимит создания постов (периодный)',
      description: 'Все периоды должны дать положительный остаток.',
      paramType: 'int',
      defaultValue: {
        periods: [
          { period: 'hour', max_value: 1 },
          { period: 'day', max_value: 3 },
          { period: 'week', max_value: 15 },
          { period: 'month', max_value: 40 },
        ],
        unit_price: 50,
      },
      planValues: {
        free: {
          periods: [
            { period: 'hour', max_value: 1 },
            { period: 'day', max_value: 3 },
            { period: 'week', max_value: 15 },
            { period: 'month', max_value: 40 },
          ],
          unit_price: 50,
        },
        pro: {
          periods: [
            { period: 'day', max_value: 100 },
            { period: 'month', max_value: -1 },
          ],
          unit_price: 0,
        },
      },
    },
  ],
});
```

### Chat (onModuleInit)

```typescript
await settingsClient.sync({
  service: 'chat',
  parameters: [
    {
      key: 'chat.spawn.copyHistoryMax',
      category: 'system-var',
      name: 'Max копируемой истории при spawn',
      paramType: 'int',
      defaultValue: 100,
      userOverride: false,
    },
    {
      key: 'chat.message.editWindowMinutes',
      category: 'system-var',
      name: 'Окно правки сообщения',
      paramType: 'int',
      defaultValue: 15,
      userOverride: true,  // ← пользователь может为自己 выбрать окно
    },
    {
      key: 'chat.member.dm.enabled',
      category: 'tarif-var',
      name: 'DIRECT сообщения',
      paramType: 'boolean',
      defaultValue: { enabled: false },
      planValues: {
        free: { enabled: false },
        basic: { enabled: true },
        pro: { enabled: true },
      },
    },
    // user-var: персональные настройки
    {
      key: 'chat.notify.messagePush',
      category: 'user-var',
      name: 'Push-уведомления о сообщениях',
      paramType: 'boolean',
      defaultValue: { enabled: true },
    },
    {
      key: 'chat.notify.mentionPush',
      category: 'user-var',
      name: 'Push при упоминании',
      paramType: 'boolean',
      defaultValue: { enabled: true },
    },
  ],
});
```

---

## 8. Пример flow: создание поста в форуме

```
1. Forum сервис → POST /internal/v1/limits/consume
   {
     "userId": "u1",
     "key": "forum.author.post.createRate",
     "periods": ["hour", "day", "week", "month"]
   }

2. Settings сервис:
   a. resolve u1 → planId = "basic"
   b. Для каждого периода (hour, day, week, month):
      - Найти/создать user_limit(u1, createRate, "basic", period)
      - Если cycle_end <= now() → restore
      - Если remaining > 0 → remaining--, log (source='base'), continue
      - Если remaining == 0:
        → Проверить limit_purchase (purchased - used > 0?)
        → Если да → used++, log (source='purchased'), continue
        → Если нет → вернуть { allowed: false, period, ... }
   c. Все периоды ok → вернуть { consumed: true, limits: [...] }

3. Forum сервис получает ok → создаёт пост
```

---

## 9. Admin UI — Макеты страниц

### 9.1 Навигация

```
┌──────────────────────────────────────────────────────────────────────┐
│  Пользователи │ Группы доступа │ ⚙ Настройки │ Ванга │ Периоды │ ... │
└──────────────────────────────────────────────────────────────────────┘
```

> «Настройки» заменяет текущие «Конфиг» (scalar) и «Тарифы» (plan).

### 9.2 Страница «Настройки» — Список сервисов

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  ┌──────────┐  ┌──────────────────────────────────────────────────┐  │
│  │          │  │                                                  │  │
│  │ Сервисы  │  │  forum — Параметры                               │  │
│  │          │  │                                                  │  │
│  │ ● auction│  │  ┌────────────────────────────────────────────┐  │  │
│  │   chat   │  │  │ Параметр               │ Тип   │ Категория│  │  │
│  │ ● forum  │  │  ├────────────────────────┼───────┼──────────┤  │  │
│  │   club   │  │  │ forum.edit.windowMins  │ int   │ ⚙ system │  │  │
│  │   billing│  │  │   ↳ user_override: ✓   │       │ (override)│  │  │
│  │   rating │  │  │ forum.vote.changeWin.. │ int   │ ⚙ system │  │  │
│  │   ...    │  │  │ forum.author.post.d..  │ int   │ 💳 tarif  │  │  │
│  │          │  │  │ forum.author.post.cr.. │ int   │ 🔄 limited│  │  │
│  │          │  │  │ chat.notify.messageP.. │ bool  │ 👤 user   │  │  │
│  │          │  │  │ chat.notify.mentionP.. │ bool  │ 👤 user   │  │  │
│  │          │  │  └────────────────────────────────────────────┘  │  │
│  │          │  │                                                  │  │
│  └──────────┘  └──────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 9.3 Модалки параметров

#### system-var (с user_override)

```
┌──────────────────────────────────────────────────────┐
│  forum.edit.windowMinutes                       [×]  │
│  ─────────────────────────────────────────────────── │
│  Категория: ⚙ system-var                            │
│  Сервис: forum                                       │
│  Тип: int                                            │
│  ☑ Разрешить override на уровне пользователя         │
│                                                      │
│  Описание:                                           │
│  Минуты после публикации. 0 — запрещено,             │
│  -1 — без ограничения.                               │
│                                                      │
│  ─── Глобальное значение ────────────────────────    │
│                                                      │
│  Значение:  [ 10 ]                                  │
│                                                      │
│  Изменено: admin@tavrida · 2026-09-10 14:30         │
│                                                      │
│                              [ Удалить ] [ Сохранить ]│
└──────────────────────────────────────────────────────┘
```

#### user-var

```
┌──────────────────────────────────────────────────────┐
│  chat.notify.messagePush                        [×]  │
│  ─────────────────────────────────────────────────── │
│  Категория: 👤 user-var                              │
│  Сервис: chat                                        │
│  Тип: boolean                                        │
│                                                      │
│  Описание:                                           │
│  Push-уведомления о новых сообщениях.               │
│                                                      │
│  ─── Значение по умолчанию ──────────────────────    │
│                                                      │
│  [✓] Включено                                        │
│                                                      │
│  Пользователи с кастомным значением: 342             │
│                                                      │
│                              [ Удалить ] [ Сохранить ]│
└──────────────────────────────────────────────────────┘
```

#### limited-user-var

```
┌──────────────────────────────────────────────────────────────┐
│  forum.author.post.createRate                           [×]  │
│  ─────────────────────────────────────────────────────────── │
│  Категория: 🔄 limited-user-var                             │
│  Сервис: forum                                               │
│  Тип: int                                                    │
│                                                              │
│  Описание:                                                   │
│  Периодный лимит постов. Все периоды должны дать             │
│  положительный остаток для разрешения операции.              │
│  Покупка доп. единиц: 50 ₽/шт.                             │
│                                                              │
│  ─── Периоды по умолчанию ──────────────────────────────     │
│                                                              │
│  │ Период  │ Макс │ Цена ед. │                              │
│  ├─────────┼──────┼──────────┤                              │
│  │ Час     │   1  │   50 ₽   │                              │
│  │ Сутки   │   3  │   50 ₽   │                              │
│  │ Неделя  │  15  │   50 ₽   │  (7 дней)                   │
│  │ Месяц   │  40  │   50 ₽   │                              │
│  │ [+]     │      │          │                              │
│                                                              │
│  ─── Значения по планам ─────────────────────────────────    │
│                                                              │
│  ▼ Free                                                      │
│  │ Период  │ Макс │ Цена ед. │                              │
│  ├─────────┼──────┼──────────┤                              │
│  │ Час     │   1  │   50 ₽   │                              │
│  │ Сутки   │   3  │   50 ₽   │                              │
│  │ Неделя  │  15  │   50 ₽   │                              │
│  │ Месяц   │  40  │   50 ₽   │                              │
│                                                              │
│  ▶ Basic  (унаследовано от default)                          │
│  ▶ Pro                                                      │
│  │ Период  │ Макс │ Цена ед. │                              │
│  ├─────────┼──────┼──────────┤                              │
│  │ Сутки   │ 100  │    0 ₽   │                              │
│  │ Месяц   │  -1  │    0 ₽   │  (∞ unlimited)              │
│                                                              │
│                                  [ Удалить ] [ Сохранить ]   │
└──────────────────────────────────────────────────────────────┘
```

### 9.4 Страница «Тарифы»

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  Тарифы                                                              │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ Название     │ Описание      │ Мес.  │ Год.   │ Статус │ Actions│
│  ├──────────────┼───────────────┼───────┼────────┼────────┼────────┤
│  │ Free         │ Бесплатный    │ 0 ₽   │ 0 ₽    │ ● Акт. │ [⚙] [🗑]│
│  │ Basic        │ Базовый       │ 99 ₽  │ 990 ₽  │ ● Акт. │ [⚙] [🗑]│
│  │ Pro          │ Профессионал. │ 399 ₽ │ 3990 ₽│ ● Акт. │ [⚙] [🗑]│
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  [ + Создать тариф ]                                                 │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**При клике «⚙» →展开:**

```
┌──────────────────────────────────────────────────────────────────────┐
│  ▼ Free — Бесплатный                                                │
│    Мес: 0 ₽ · Год: 0 ₽ · Активен                                   │
│                                                                      │
│    ─── Подписчики (1 204) ──────────────────────────────────────    │
│                                                                      │
│    │ Пользователь    │ Активировано  │ Статус  │ Автопродление │     │
│    ├─────────────────┼───────────────┼─────────┼───────────────┤     │
│    │ user_abc123     │ 2026-08-01    │ ACTIVE  │ ✓             │     │
│    │ user_def456     │ 2026-09-10    │ ACTIVE  │ ✗             │     │
│    │ ...             │               │         │               │     │
│                                                                      │
│    ─── Лимиты (выберите пользователя) ──────────────────────────    │
│                                                                      │
│    [ Выберите пользователя... ▾ ]                                    │
│                                                                      │
│    ┌─ user_abc123: ────────────────────────────────────────────┐    │
│    │                                                           │    │
│    │  forum.author.post.createRate                             │    │
│    │  ├ Час:    0/1  (ended 15:00)    purchased: 3  [ + ]     │    │
│    │  ├ Сутки:  2/3  (ends завтра)    purchased: 0   [ + ]     │    │
│    │  ├ Неделя: 12/15 (ends 21.09)    purchased: 0   [ + ]     │    │
│    │  └ Месяц:  8/40  (ends 01.10)    purchased: 5   [ + ]     │    │
│    │                                                           │    │
│    │  forum.author.attachment.countMax                         │    │
│    │  └ Сутки: 5/5  (ends завтра)      purchased: 0   [ + ]    │    │
│    │                                                           │    │
│    └───────────────────────────────────────────────────────────┘    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Модалка «+ Начислить лимит»:**

```
┌──────────────────────────────────────────────┐
│  Начисление лимита                       [×]  │
│  ─────────────────────────────────────────── │
│  Параметр: forum.author.post.createRate      │
│  Пользователь: user_abc123                   │
│  Период: Сутки                               │
│  Текущий остаток (базовый): 2                │
│  Куплено: 0                                  │
│                                              │
│  Тип начисления:                             │
│  ● Базовый лимит (max_value)                 │
│  ○ Покупка (purchased)                       │
│                                              │
│  Добавить единиц:  [ 1 ]                    │
│  Причина: [ Ручное начисление модером ]      │
│                                              │
│              [ Отмена ] [ Начислить ]         │
└──────────────────────────────────────────────┘
```

### 9.5 Страница «Лог использований»

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  Лог использований лимитов                                           │
│                                                                      │
│  Фильтры:                                                           │
│  [ Пользователь: ________ ] [ Параметр: ____________ ]              │
│  [ Период: Все ▾ ] [ Источник: Все ▾ ] [ Дата от: __ ] [ до: __ ]  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ Время            │ Пользователь │ Параметр         │ Δ │ Src  │  │
│  ├──────────────────┼──────────────┼──────────────────┼───┼──────┤  │
│  │ 14:32 14.09.2026 │ user_abc123  │ forum.author.... │-1 │ base │  │
│  │ 14:30 14.09.2026 │ user_abc123  │ forum.author.... │-1 │ purch│  │
│  │ 14:28 14.09.2026 │ user_def456  │ chat.member.dm.. │-1 │ base │  │
│  │ 14:00 14.09.2026 │ *cron*       │ forum.author.... │+3 │ rest.│  │
│  │ 13:45 14.09.2026 │ admin        │ forum.author.... │+2 │ grant│  │
│  │ 00:00 14.09.2026 │ *cron*       │ forum.author.... │+40│ rest.│  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ← 1 2 3 ... 42 →                                                   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 10. Миграция данных

### Из scalar-config

```sql
-- scalar_variable → parameter (category = 'system-var', user_override = false)
INSERT INTO settings.parameter (key, service, category, name, description, param_type, default_value, user_override, sync_status)
SELECT key, service, 'system-var', key, description, type, default_value, false, sync_status
FROM scalar_config.scalar_variable;

-- scalar_value → system_value
INSERT INTO settings.system_value (param_key, value, updated_by, updated_at)
SELECT key, value, "updatedBy", "updatedAt"
FROM scalar_config.scalar_value;
```

### Из plan-config

```sql
-- plan → plan
INSERT INTO settings.plan (id, title, description, monthly_price, yearly_price, is_active)
SELECT id, title, description, monthly_price, yearly_price, is_active
FROM plan_config.plan;

-- plan_variable → parameter (category = 'tarif-var' для limit/feature/enum, 'system-var' для price)
INSERT INTO settings.parameter (key, service, category, name, description, param_type, default_value, user_override, sync_status)
SELECT
  key, service,
  CASE WHEN value_type = 'price' THEN 'system-var' ELSE 'tarif-var' END,
  name, description,
  CASE value_type
    WHEN 'limit' THEN 'int'
    WHEN 'feature' THEN 'boolean'
    WHEN 'enum' THEN 'enum'
    WHEN 'price' THEN 'int'
  END,
  jsonb_build_object(
    CASE WHEN value_type = 'limit' THEN 'limit_value'
         WHEN value_type = 'feature' THEN 'enabled'
         WHEN value_type = 'price' THEN 'price_amount'
    END,
    default_value
  ),
  false,  -- user_override по умолчанию
  sync_status
FROM plan_config.plan_variable;

-- plan_variable_tier → plan_value
INSERT INTO settings.plan_value (plan_id, param_key, value, updated_at)
SELECT
  plan_id, variable_key,
  jsonb_build_object(
    CASE
      WHEN pv.value_type = 'limit' THEN 'limit_value'
      WHEN pv.value_type = 'feature' THEN 'enabled'
      WHEN pv.value_type = 'enum' THEN 'values'
      WHEN pv.value_type = 'price' THEN 'price_amount'
    END,
    CASE
      WHEN pv.value_type = 'limit' THEN pvt.limit_value::text::jsonb
      WHEN pv.value_type = 'feature' THEN pvt.is_feature_enabled::text::jsonb
      WHEN pv.value_type = 'enum' THEN pvt.enum_values
      WHEN pv.value_type = 'price' THEN pvt.price_amount::text::jsonb
    END
  ),
  now()
FROM plan_config.plan_variable_tier pvt
JOIN plan_config.plan_variable pv ON pv.key = pvt.variable_key;

-- user_subscription
INSERT INTO settings.user_subscription (user_id, plan_id, starts_at, expires_at, auto_renew, billing_period, status)
SELECT user_id, plan_id, starts_at, expires_at, auto_renew, billing_period, status
FROM plan_config.user_subscription;
```
