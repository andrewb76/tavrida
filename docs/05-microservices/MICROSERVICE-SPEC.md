# 📐 Спецификация микросервиса Tavrida Lot

> **Назначение:** единые требования к **документации** и **реализации** каждого микросервиса.  
> Проект растёт в ширину — новый сервис **обязан** следовать этому документу.

**Перед проектированием сервиса** прочитайте [platform-for-users.md](../01-goal/platform-for-users.md) — как функция выглядит для пользователя.

---

## 🎯 Принципы

1. **Один сервис = один bounded context** — чёткая зона ответственности.
2. **Database schema per service** — одна PostgreSQL, отдельная `schema` на сервис (см. [ADR-001](../03-architecture/adr/001-database-schema-per-service.md)).
3. **Публичный доступ только через BFF** — REST + WSS; сервисы общаются между собой по internal HTTP/RabbitMQ.
4. **Конфигурация в двух реестрах** — см. [PLATFORM-REGISTRY.md](./PLATFORM-REGISTRY.md) и [ADR-003](../03-architecture/adr/003-settings-vs-financial-policy.md).
5. **События через RabbitMQ** — имена и payload из [event-catalog](../03-architecture/event-catalog.md).

---

## 📁 Структура каталога сервиса

```
services/{service-name}/
├── package.json
├── ormconfig.ts              # schema: {service_name}
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── config/
│   ├── common/               # guards, filters, interceptors
│   ├── entities/
│   └── modules/
│       ├── health/
│       └── {domain}/
├── test/
└── README.md                 # краткий: как запустить локально
```

**Именование каталога:** kebab-case (`deal-feedback`, не `deal_feedback`).

---

## 📄 Обязательные разделы документации

Каждый сервис описывается в `docs/05-microservices/{service-name}/README.md` по шаблону:

| # | Раздел | Emoji | Обязательность |
|---|--------|-------|----------------|
| 1 | Заголовок + статус + версия | — | ✅ |
| 2 | Назначение | 🎯 | ✅ |
| 3 | Термины | 📖 | ✅ |
| 4 | Сущности (TypeORM) | 🗄️ | ✅ если есть БД |
| 5 | API (HTTP) | 🔌 | ✅ |
| 6 | WebSocket (если есть) | 📡 | ⚪ |
| 7 | **Переменные scalar-config** | ⚙️ | ✅ регистрация в scalar-config |
| 8 | **Переменные plan-config** | 💳 | ✅ если влияет на тариф/лимит |
| 9 | События (produce/consume) | 📨 | ✅ если есть RabbitMQ |
| 10 | Взаимодействие | 🔗 | ✅ |
| 11 | Безопасность | 🔒 | ✅ |
| 12 | Окружение | 🌍 | ✅ |
| 13 | Связанные разделы | 📎 | ✅ |

Дополнительные документы — в `requirements/` (анализ, лимиты по планам).

---

## 🌍 Раздел «Окружение»

В README сервиса — **только переменные этого сервиса** (краткая таблица).

**Полный реестр** для Bitwarden и деплоя: [PLATFORM-SECRETS.md](../02-infrastructure/PLATFORM-SECRETS.md) + [`.env.example`](../../.env.example).

При добавлении env:
1. Строка в PLATFORM-SECRETS (секция сервиса или платформа)
2. Строка в `.env.example` (с комментарием)
3. Краткая таблица в README сервиса

---

## ⚙️ Раздел «Переменные scalar-config»

**scalar-config** хранит **одно значение** на ключ (глобально или per-user).

### Формат в README сервиса

```markdown
## ⚙️ Переменные scalar-config

| Ключ | Тип | Default | Scope | Описание |
|------|-----|---------|-------|----------|
| `rating.authorityExponent` | number | 0.2 | global | Степень авторитета голосующего |
| `forum.bannedWordsList` | string[] | [] | global | Список запрещённых слов |
```

### Правила

- Ключ: `{service}.{parameterName}` в camelCase.
- **Полный реестр:** [PLATFORM-REGISTRY.md](./PLATFORM-REGISTRY.md) — добавляйте каждую новую переменную туда.
- При старте сервис **регистрирует** ключи через
  `POST /internal/v1/scalar-variables/sync` (рекомендуется) или `register`.
- Зависшие ключи: см. [ADR-016](../../03-architecture/adr/016-financial-policy-parameter-registration.md).
- Чтение: `GET /internal/v1/scalar-variables/{domain}`.
- Изменение: только admin через BFF → scalar-config.

---

## 💳 Раздел «Переменные plan-config»

**Plan-config** хранит **пакет значений по тарифам** (Free/Basic/Pro) для переменных, влияющих на **стоимость, лимиты или доступность фич**.

### Формат в README сервиса

```markdown
## 💳 Переменные plan-config

| Ключ | Тип | Free | Basic | Pro | Описание |
|------|-----|------|-------|-----|----------|
| `auction.activeAuctions` | limit | 5 | 20 | ∞ | Bidder: торгов со ставками |
| `auction.sellerActiveLots` | limit | 2 | 5 | ∞ | Seller: своих лотов ACTIVE |
| `auction.promotionEnabled` | feature | false | false | true | Доступ к продвижению |
```

### Правила

- Ключ: `{service}.{parameterName}` — тот же namespace, что в scalar-config, но **разные реестры**.
- **Каталог проектирования:** [PLATFORM-REGISTRY.md](./PLATFORM-REGISTRY.md) — документирует все ключи; runtime появляется после register.
- **Регистрация:** domain-сервис при старте → `POST /internal/v1/plan-variables/sync` (полный манифест).
- **Зависшие ключи:** отсутствуют в sync → `syncStatus: stale`; **без автоудаления**; admin удаляет вручную.
- **Seed дефолтов:** `services/{service}/src/config/plan-variable-manifest.ts` (целевая модель), не в plan-config.
- **Проверка лимита:** domain считает `currentUsage` → `POST /internal/v1/limits/check` (`variableKey`).
- **Проверка фичи:** `POST /internal/v1/features/can-use`.
- **Цена (price):** `GET /internal/v1/plan-variables/resolve-price?key=` → `billing.charge`.
- **Admin:** меняет значения в матрице (BFF `/admin/plan-config`), не создаёт новые ключи.
- Сервис **не хранит** тарифные значения локально — только запрашивает plan-config.

### Разделение settings vs plan-config

| Критерий | scalar-config | plan-config |
|----------|----------|------------------|
| Значений на ключ | 1 (или per-user admin override) | N (по числу тарифов) |
| Влияет на цену/лимит | ❌ | ✅ |
| Примеры | формулы, списки слов, TTL | postsPerDay, promotionEnabled |
| Кто меняет | admin | admin |

> **Post-MVP:** третий реестр **user-prefs** (персональные опции member под plan-gate) — [ADR-020](../../03-architecture/adr/020-three-config-registries.md). До реализации: помечать кандидатов в README; временные domain-таблицы допустимы. Секция 👤 в шаблоне — после появления сервиса.

---

## 🔌 Требования к API

См. [06-api/README.md](../06-api/README.md). Кратко:

- Префикс: `/api/v1/`
- Ошибки: RFC 7807 Problem Details
- Internal endpoints: `/internal/v1/`; обязательный production Bearer
  `INTERNAL_SERVICE_TOKEN` применяется глобально по path prefix
- Health: `GET /health`, Ready: `GET /health/ready`
- Correlation ID: заголовок `X-Request-Id`

---

## 📨 Требования к событиям

- Именование: `{domain}.{action}` в past tense — `auction.completed`, `billing.deposit_completed`.
- Exchange: `tavrida-lot.events` (topic).
- Routing key = имя события.
- Payload: JSON Schema в [event-catalog](../03-architecture/event-catalog.md).
- Consumer: идемпотентность по `eventId` + `idempotencyKey`.

---

## 🗄️ Требования к данным

- Schema PostgreSQL = имя сервиса (`billing`, `plan_config` — snake_case).
- Миграции: TypeORM migrations в каталоге сервиса.
- **Запрещено:** JOIN между schema других сервисов.
- **Разрешено:** denormalized cache с явным источником истины (см. user-profile ← rating).

---

## 🔒 Безопасность

- JWT от Logto — валидация на BFF; internal calls — shared service token
  (production fail-closed, constant-time comparison), mTLS/service JWT — future hardening.
- Ory Keto — проверка admin-операций.
- Секреты — Bitwarden Secrets Manager, не в git.

---

## ✅ Чеклист нового сервиса

### Документация

- [ ] `docs/05-microservices/{name}/README.md` по шаблону выше
- [ ] Строка в [docs/README.md](../README.md) и [05-microservices/README.md](./README.md)
- [ ] Переменные scalar-config и/или plan-config зарегистрированы в [PLATFORM-REGISTRY.md](./PLATFORM-REGISTRY.md)
- [ ] Runtime env зарегистрированы в [PLATFORM-SECRETS.md](../02-infrastructure/PLATFORM-SECRETS.md) и [`.env.example`](../../.env.example)
- [ ] События добавлены в [event-catalog](../03-architecture/event-catalog.md)
- [ ] Data ownership в [10-data/README.md](../10-data/README.md)

### Код

- [ ] Каталог в `services/{name}/` по структуре выше
- [ ] `schema` в ormconfig
- [ ] Health module
- [ ] OpenTelemetry + structured logging
- [ ] Unit-тесты критичной логики
- [ ] Dockerfile + Swarm labels (когда будет deployment doc)

---

## 🔗 Связанные документы

- [docs-guidelines](../13-maintenance/docs-guidelines.md)
- [Architecture](../03-architecture/README.md)
- [API conventions](../06-api/README.md)
- [Data ownership](../10-data/README.md)
- [ADR index](../03-architecture/adr/README.md)

---

**Автор:** команда разработки · **Версия:** 0.2-draft
