# ADR-020: Три реестра конфигурации (scalar · plan · user-prefs)

> **Статус:** accepted (решение) · **Реализация:** deferred post-MVP · **Дата:** 2026-07-22  
> **Связано:** [ADR-003](./003-settings-vs-financial-policy.md) · [registry-keys.md](../../13-maintenance/registry-keys.md) · [PLATFORM-REGISTRY.md](../../05-microservices/PLATFORM-REGISTRY.md)

## 🎯 Контекст

Сейчас платформа документирует **два** реестра ([ADR-003](./003-settings-vs-financial-policy.md)):

| Реестр | Кто меняет | Семантика |
|--------|------------|-----------|
| **scalar-config** | admin | Одно значение на ключ — поведение клуба / дефолты / формулы |
| **plan-config** | admin (матрица тарифов) | Лимиты, feature gates, цены per plan |

На практике уже появляются **персональные** опции пользователя (например `subscriptions.delivery_preference`, planned scalar `scope=user` для webhooks). Это **не** лимит тарифа и **не** глобальный scalar: тариф **разрешает** фичу, пользователь **выбирает**, пользоваться ли ей.

Нужна явная третья ось для всех доменов (forum, chat, subscriptions, notifications, webhooks, …), а не ad-hoc таблицы в каждом сервисе.

## ✅ Решение

### Целевая модель — три реестра

```text
scalar-config     →  «как устроена платформа»     (admin)
plan-config       →  «что тариф разрешает»        (admin)
user-prefs        →  «как я хочу пользоваться»    (member)
```

| Реестр | Значений на ключ | Кто пишет | Примеры |
|--------|------------------|-----------|---------|
| **scalar-config** | 1 (global; admin overrides ≠ prefs) | admin | `chat.spawn.copyHistoryMax`, `forum.edit.windowMinutes` |
| **plan-config** | N per plan | admin | `chat.member.dm.enabled`, `forum.author.13topic.chatEnabled` |
| **user-prefs** *(новый)* | 1 per `(userId, key)` | **сам пользователь** | `chat.notify.messagePush`, delivery channel on/off |

**Правило раскладки:**

1. Одинаково для всех / админ крутит клуб → **scalar**
2. Зависит от тарифа (можно / сколько / цена) → **plan**
3. Пользователь выбирает сам, **если план разрешил** → **user-prefs**

**Effective value** для gated prefs:

```text
effective = planAllows(gateKey) && userPref(key)
```

Если plan = false → UI prefs скрыт/disabled; PATCH prefs не включает недоступную фичу.

Ключ **не** живёт одновременно в двух реестрах. Prefs-ключ может ссылаться на plan feature через метаданные `planGateKey` (имя поля TBD при реализации).

### Scope решения

- Решение **глобальное** для платформы, не только для будущего `chat`.
- При проектировании новых ключей уже сейчас классифицировать: scalar | plan | **future prefs**.
- До реализации `user-prefs` допустимы **временные** domain-таблицы (как `DeliveryPreference`), с контрактом миграции в единый реестр.

### Что явно не делаем в MVP

- Новый микросервис / schema `user_prefs`
- Миграция существующих delivery/webhook prefs
- Расширение MICROSERVICE-SPEC обязательной секцией 👤 (только заготовка в backlog)
- Путать **scalar per-user override** (admin/ops исключение из global) с **user-prefs** (member UX)

## 🔄 Альтернативы

| Вариант | Почему не выбран как цель |
|---------|---------------------------|
| Всё в scalar `scope=user` | Смешивает admin overrides и member UX; нет явного plan-gate |
| Только domain-таблицы навсегда | Нет единого каталога, дубли UI/API, сложнее audit |
| Prefs только внутри notifications | Узко; chat/forum/webhooks всё равно разъедутся |
| Реализовать сервис в MVP | Несущественно для MVP; отложено сознательно |

## 📌 Последствия

### Сейчас (зафиксировано)

- ADR принят; реализация **post-MVP**.
- Backlog: рефакторинг всех реестров + audit ключей PLATFORM-REGISTRY в свете трёх осей.
- При дизайне доменов (в т.ч. chat) помечать кандидатов в user-prefs, не класть их в scalar/plan.

### После MVP (рефакторинг)

1. Спека / сервис **`user-prefs`** (или согласованное имя): register/sync ключей, `GET/PATCH` от имени user, Redis cache.
2. Правила ключей в [registry-keys.md](../../13-maintenance/registry-keys.md) + секция в [PLATFORM-REGISTRY.md](../../05-microservices/PLATFORM-REGISTRY.md).
3. Секция в [MICROSERVICE-SPEC.md](../../05-microservices/MICROSERVICE-SPEC.md) (👤 user-prefs).
4. Миграция: `subscriptions.delivery_preference`, webhook user defaults, будущие chat notify prefs → единый реестр.
5. Уточнить ADR-003: «два реестра» → «три»; scalar per-user — только admin overrides, не member prefs.
6. Admin UI: каталог prefs (read-only / support), member UI: Settings.

### Имя сервиса (TBD при реализации)

Рабочее имя в этом ADR: **`user-prefs`**. Альтернативы при реализации: `member-prefs`, `preferences`. Domain в ключах остаётся `{domain}.*` (`chat.*`, `subscriptions.*`).

## 🔗 Связанные документы

- [ADR-003](./003-settings-vs-financial-policy.md) — два реестра (дополняется этим ADR)
- [ADR-016](./016-financial-policy-parameter-registration.md) — register plan variables
- [ADR-017](./017-plan-config-scalar-config-rename.md) — имена scalar/plan
- [subscriptions README](../../05-microservices/subscriptions/README.md) — текущий DeliveryPreference (кандидат миграции)
