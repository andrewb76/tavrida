# План мержа и рефакторинга: scalar-config + plan-config → settings

> **Статус:** draft · **Дата:** 2026-09-14  
> **Цель:** Объединить два сервиса в один `settings` с поддержкой `limited-user-var`, `user-var`, `user_override` (system-var), `limit_purchase`

---

## Архитектурное решение

**Один сервис `settings`** (port 3002, schema `settings`) заменяет `scalar-config` (3008) + `plan-config` (3002).

| Было | Стало |
|------|-------|
| `scalar_config.scalar_variable` + `scalar_config.scalar_value` | `settings.parameter` + `settings.system_value` |
| `plan_config.plan` + `plan_variable` + `plan_variable_tier` + `user_subscription` | `settings.plan` + `settings.parameter` + `settings.plan_value` + `settings.user_subscription` |
| Два сервиса, два API, два BFF-контролера | Один сервис, одно API, один BFF-контролер |
| Нет централизованных счётчиков | `settings.user_limit` + `settings.limit_usage_log` |
| Caller-supplied usage | Централизованный `limits/consume` |
| Нет персональных настроек | `settings.user_value` (user-var + overrides) |
| Нет покупки лимитов | `settings.limit_purchase` |

---

## Фазы реализации

### Фаза 1: Новый сервис `settings` (без миграции)

**Создать параллельно существующим сервисам.**

#### 1.1 Сервис `services/settings/`

```
services/settings/
├── src/
│   ├── settings.module.ts
│   ├── main.ts
│   ├── config/
│   │   └── env.ts
│   ├── database/
│   │   ├── migrations/
│   │   │   └── 001_create_tables.sql
│   │   └── seed/
│   │       └── default-seed.ts
│   ├── parameters/
│   │   ├── parameter.entity.ts
│   │   ├── parameter.module.ts
│   │   ├── parameter.controller.ts
│   │   ├── parameter.service.ts
│   │   ├── dto/
│   │   │   ├── register-parameter.dto.ts
│   │   │   └── sync-parameters.dto.ts
│   │   └── interfaces.ts
│   ├── system-values/
│   │   ├── system-value.entity.ts
│   │   ├── system-value.module.ts
│   │   ├── system-value.controller.ts
│   │   ├── system-value.service.ts
│   │   └── dto/
│   ├── user-values/                   # НОВЫЙ модуль
│   │   ├── user-value.entity.ts
│   │   ├── user-value.module.ts
│   │   ├── user-value.controller.ts
│   │   ├── user-value.service.ts
│   │   └── dto/
│   ├── plan-values/
│   │   ├── plan-value.entity.ts
│   │   ├── plan.module.ts
│   │   ├── plan.controller.ts
│   │   ├── plan.service.ts
│   │   └── dto/
│   ├── limits/
│   │   ├── user-limit.entity.ts
│   │   ├── limit-usage-log.entity.ts
│   │   ├── limit-purchase.entity.ts   # НОВАЯ entity
│   │   ├── limits.module.ts
│   │   ├── limits.controller.ts
│   │   ├── limits.service.ts
│   │   ├── limits-restore.service.ts  # Cron
│   │   └── dto/
│   ├── subscriptions/
│   │   ├── user-subscription.entity.ts
│   │   ├── subscription.module.ts
│   │   ├── subscription.controller.ts
│   │   ├── subscription.service.ts
│   │   ├── subscription-renew.service.ts
│   │   └── dto/
│   ├── billing/
│   │   └── billing-client.module.ts
│   └── health/
│       └── health.module.ts
├── package.json
├── tsconfig.json
└── nest-cli.json
```

**Entities (9 таблиц):**

| Entity | Таблица | PK |
|--------|---------|-----|
| `Parameter` | `settings.parameter` | `key` |
| `Plan` | `settings.plan` | `id` |
| `SystemValue` | `settings.system_value` | `param_key` |
| `UserValue` | `settings.user_value` | `(user_id, param_key)` |
| `PlanValue` | `settings.plan_value` | `(plan_id, param_key)` |
| `UserLimit` | `settings.user_limit` | `(param_key, plan_id, user_id, period)` |
| `LimitUsageLog` | `settings.limit_usage_log` | `id` (uuid) |
| `LimitPurchase` | `settings.limit_purchase` | `id` (uuid) |
| `UserSubscription` | `settings.user_subscription` | `user_id` |

**Internal API:**

| Модуль | Endpoints |
|--------|-----------|
| Parameters | `POST /register`, `POST /sync`, `GET /`, `DELETE /:key` |
| SystemValues | `GET /:domain`, `POST /:domain`, `GET /public` |
| UserValues | `GET /:userId`, `GET /:userId/:key`, `PATCH /:userId/:key` |
| Plans | `GET /`, `GET /all`, `POST /`, `PATCH /:id`, `DELETE /:id`, `GET /resolve` |
| PlanValues | `GET /`, `PATCH /:planId/:key`, `GET /resolve`, `GET /resolve-price` |
| Limits | `POST /check`, `POST /consume`, `POST /grant`, `GET /state`, `POST /purchase` |
| Subscriptions | `POST /activate`, `POST /cancel-auto-renew`, `POST /renew/run` |
| Health | `GET /health`, `GET /health/ready` |

**Env vars:**

```env
SETTINGS_PORT=3020
SETTINGS_DB_HOST=localhost
SETTINGS_DB_PORT=5432
SETTINGS_DB_NAME=settings
SETTINGS_DB_USER=postgres
SETTINGS_DB_PASSWORD=...
BILLING_URL=http://billing:3001
INTERNAL_AUTH_SECRET=...
```

#### 1.2 Database migration

```sql
CREATE SCHEMA IF NOT EXISTS settings;

-- plan
CREATE TABLE settings.plan (
  id varchar(32) PRIMARY KEY,
  title text NOT NULL,
  description text DEFAULT '',
  monthly_price decimal(12,2) NOT NULL DEFAULT 0,
  yearly_price decimal(12,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- parameter
CREATE TABLE settings.parameter (
  key varchar(128) PRIMARY KEY,
  service varchar(64) NOT NULL,
  category varchar(16) NOT NULL CHECK (category IN (
    'system-var', 'tarif-var', 'limited-user-var', 'user-var'
  )),
  name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  param_type varchar(16) NOT NULL DEFAULT 'int',
  default_value jsonb,
  user_override boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  sync_status varchar(16) NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_parameter_service ON settings.parameter(service);
CREATE INDEX idx_parameter_category ON settings.parameter(category);

-- system_value
CREATE TABLE settings.system_value (
  param_key varchar(128) PRIMARY KEY REFERENCES settings.parameter(key) ON DELETE CASCADE,
  value jsonb NOT NULL DEFAULT 'null',
  updated_by varchar(128),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- user_value (user-var + overrides для system-var)
CREATE TABLE settings.user_value (
  user_id varchar(128) NOT NULL,
  param_key varchar(128) NOT NULL REFERENCES settings.parameter(key) ON DELETE CASCADE,
  value jsonb NOT NULL DEFAULT 'null',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, param_key)
);

CREATE INDEX idx_user_value_user ON settings.user_value(user_id);

-- plan_value
CREATE TABLE settings.plan_value (
  plan_id varchar(32) NOT NULL REFERENCES settings.plan(id) ON DELETE CASCADE,
  param_key varchar(128) NOT NULL REFERENCES settings.parameter(key) ON DELETE CASCADE,
  value jsonb NOT NULL DEFAULT 'null',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (plan_id, param_key)
);

-- user_limit
CREATE TABLE settings.user_limit (
  param_key varchar(128) NOT NULL REFERENCES settings.parameter(key) ON DELETE CASCADE,
  plan_id varchar(32) NOT NULL REFERENCES settings.plan(id) ON DELETE CASCADE,
  user_id varchar(128) NOT NULL,
  period varchar(8) NOT NULL CHECK (period IN ('hour', 'day', 'week', 'month')),
  max_value int NOT NULL,
  remaining int NOT NULL,
  cycle_start timestamptz NOT NULL DEFAULT now(),
  cycle_end timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (param_key, plan_id, user_id, period)
);

CREATE INDEX idx_user_limit_user ON settings.user_limit(user_id);
CREATE INDEX idx_user_limit_cycle_end ON settings.user_limit(cycle_end);

-- limit_usage_log
CREATE TABLE settings.limit_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  param_key varchar(128) NOT NULL,
  plan_id varchar(32) NOT NULL,
  user_id varchar(128) NOT NULL,
  period varchar(8) NOT NULL,
  delta int NOT NULL,
  remaining_after int NOT NULL,
  source varchar(16) NOT NULL DEFAULT 'base',
  created_at timestamptz NOT NULL DEFAULT now(),
  meta jsonb
);

CREATE INDEX idx_limit_usage_log_user ON settings.limit_usage_log(user_id);
CREATE INDEX idx_limit_usage_log_param ON settings.limit_usage_log(param_key);
CREATE INDEX idx_limit_usage_log_created ON settings.limit_usage_log(created_at);

-- limit_purchase
CREATE TABLE settings.limit_purchase (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  param_key varchar(128) NOT NULL REFERENCES settings.parameter(key) ON DELETE CASCADE,
  user_id varchar(128) NOT NULL,
  period varchar(8) NOT NULL CHECK (period IN ('hour', 'day', 'week', 'month')),
  purchased int NOT NULL DEFAULT 0,
  used int NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  meta jsonb
);

CREATE INDEX idx_limit_purchase_user ON settings.limit_purchase(user_id);
CREATE INDEX idx_limit_purchase_active ON settings.limit_purchase(param_key, user_id, period, expires_at);

-- user_subscription
CREATE TABLE settings.user_subscription (
  user_id varchar(128) PRIMARY KEY,
  plan_id varchar(32) NOT NULL REFERENCES settings.plan(id),
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  auto_renew boolean NOT NULL DEFAULT false,
  billing_period varchar(16) CHECK (billing_period IN ('monthly', 'yearly')),
  status varchar(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'CANCELLED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_subscription_plan ON settings.user_subscription(plan_id);
CREATE INDEX idx_user_subscription_status ON settings.user_subscription(status);
```

#### 1.3 Тестирование

- Unit-тесты для `limits.service.ts` (restore, consume с purchase, check)
- Unit-тесты для `user-value.service.ts` (resolve с override)
- Integration-тесты для всех endpoints
- Seed: миграция из scalar-config + plan-config

---

### Фаза 2: BFF + Admin UI

#### 2.1 BFF модуль `settings-admin`

```
services/bff/src/modules/settings-admin/
├── settings-admin.module.ts
├── settings-admin.controller.ts        # /admin/settings/*
├── settings-client.module.ts
├── settings-client.service.ts
└── dto/
```

**BFF Endpoints:**

| Method | Path | Proxy to |
|--------|------|----------|
| GET | `/admin/settings/services` | `GET /internal/v1/parameters/services` |
| GET | `/admin/settings/parameters` | `GET /internal/v1/parameters?service=X&category=Y` |
| POST | `/admin/settings/parameters` | `POST /internal/v1/parameters/register` |
| PATCH | `/admin/settings/parameters/:key` | `PATCH /internal/v1/parameters/:key` |
| DELETE | `/admin/settings/parameters/:key` | `DELETE /internal/v1/parameters/:key` |
| GET | `/admin/settings/system-values` | `GET /internal/v1/system-values?service=X` |
| PATCH | `/admin/settings/system-values/:key` | `POST /internal/v1/system-values/:domain` |
| GET | `/admin/settings/user-values` | `GET /internal/v1/user-values` |
| GET | `/admin/settings/user-limits` | `GET /internal/v1/limits/state?plan=X` |
| GET | `/admin/settings/user-limits/:userId` | `GET /internal/v1/limits/state?userId=X` |
| POST | `/admin/settings/user-limits/grant` | `POST /internal/v1/limits/grant` |
| GET | `/admin/settings/usage-log` | `GET /internal/v1/limits/usage-log` |
| GET | `/admin/settings/plans` | `GET /internal/v1/plans/all` |
| POST | `/admin/settings/plans` | `POST /internal/v1/plans` |
| PATCH | `/admin/settings/plans/:id` | `PATCH /internal/v1/plans/:id` |
| DELETE | `/admin/settings/plans/:id` | `DELETE /internal/v1/plans/:id` |
| GET | `/admin/settings/plan-values` | `GET /internal/v1/plan-values` |
| PATCH | `/admin/settings/plan-values/:planId/:key` | `PATCH /internal/v1/plan-values/:planId/:key` |

#### 2.2 Frontend: Admin Settings View

```
apps/frontend/src/views/admin/AdminSettingsView.vue
apps/frontend/src/components/admin/settings/
├── ServiceSidebar.vue
├── ParametersList.vue
├── ParameterDetailModal.vue
├── SystemValueEditor.vue
├── PlanValueEditor.vue
├── LimitedValueEditor.vue
├── UserValueEditor.vue            # НОВЫЙ: для user-var
├── PlansManager.vue
├── PlanDetail.vue
├── UserLimitViewer.vue
├── UsageLogViewer.vue
├── GrantLimitModal.vue
└── PurchaseViewer.vue             # НОВЫЙ: просмотр покупок
```

**API клиент:**

```typescript
// apps/frontend/src/services/settingsAdmin.ts
export const settingsAdmin = {
  // Параметры
  getServices: () => fetch('/api/v1/admin/settings/services'),
  getParameters: (service: string) => fetch(`/api/v1/admin/settings/parameters?service=${service}`),
  createParameter: (data: CreateParameterDto) => post('/api/v1/admin/settings/parameters', data),
  updateParameter: (key: string, data: UpdateParameterDto) => patch(`/api/v1/admin/settings/parameters/${key}`, data),
  deleteParameter: (key: string) => del(`/api/v1/admin/settings/parameters/${key}`),

  // Системные значения
  getSystemValues: (service: string) => fetch(`/api/v1/admin/settings/system-values?service=${service}`),
  updateSystemValue: (key: string, value: any) => patch(`/api/v1/admin/settings/system-values/${key}`, { value }),

  // User-values (overrides)
  getUserValues: (userId: string) => fetch(`/api/v1/admin/settings/user-values/${userId}`),
  updateUserValue: (userId: string, key: string, value: any) =>
    patch(`/api/v1/admin/settings/user-values/${userId}/${key}`, { value }),

  // Планы
  getPlans: () => fetch('/api/v1/admin/settings/plans'),
  createPlan: (data: CreatePlanDto) => post('/api/v1/admin/settings/plans', data),
  updatePlan: (id: string, data: UpdatePlanDto) => patch(`/api/v1/admin/settings/plans/${id}`, data),
  deletePlan: (id: string) => del(`/api/v1/admin/settings/plans/${id}`),

  // Значения по планам
  getPlanValues: (planId?: string, service?: string) => fetch(buildUrl('/api/v1/admin/settings/plan-values', { planId, service })),
  updatePlanValue: (planId: string, key: string, value: any) => patch(`/api/v1/admin/settings/plan-values/${planId}/${key}`, { value }),

  // Лимиты
  getUserLimits: (userId: string) => fetch(`/api/v1/admin/settings/user-limits/${userId}`),
  getLimitsByPlan: (planId: string) => fetch(`/api/v1/admin/settings/user-limits?plan=${planId}`),
  grantLimit: (data: GrantLimitDto) => post('/api/v1/admin/settings/user-limits/grant', data),
  getUsageLog: (params: UsageLogParams) => fetch(buildUrl('/api/v1/admin/settings/usage-log', params)),
};
```

#### 2.3 Роутер

```typescript
// Добавить в router/index.ts
{
  path: '/admin/settings',
  name: 'admin-settings',
  component: () => import('@/views/admin/AdminSettingsView.vue'),
  meta: { requiresAdmin: true },
},
// Убрать: /admin/scalar-config, /admin/plan-config
```

**Навигация в AdminLayout.vue:**

```vue
<!-- Заменить "Конфиг" и "Тарифы" на одну ссылку -->
<RouterLink to="/admin/settings" class="admin-tab">Настройки</RouterLink>
```

#### 2.4 Member Profile UI (персональные настройки)

```
apps/frontend/src/views/member/MemberSettingsView.vue
apps/frontend/src/components/member/settings/
├── UserOverrides.vue              # Override для system-var с user_override=true
└── UserPreferences.vue            # user-var настройки
```

**Member Profile страница:**

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  Мои настройки                                                       │
│                                                                      │
│  ─── Переопределение системных настроек ─────────────────────────    │
│  (параметры с разрешённым user_override)                             │
│                                                                      │
│  forum.edit.windowMinutes                                            │
│  Глобально: 10 мин                                                   │
│  Моя настройка: [ 15 ] мин  [ Сбросить на глобальную ]              │
│                                                                      │
│  chat.message.editWindowMinutes                                      │
│  Глобально: 15 мин                                                   │
│  Моя настройка: [ 30 ] мин  [ Сбросить на глобальную ]              │
│                                                                      │
│  ─── Персональные настройки ───────────────────────────────────────  │
│                                                                      │
│  chat.notify.messagePush      [✓] Push-уведомления о сообщениях     │
│  chat.notify.mentionPush      [✓] Push при упоминании               │
│  chat.list.defaultFilter      [ Все ▾ ]                              │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

### Фаза 3: Миграция данных

#### 3.1 Script миграции

```typescript
// tools/migrate-settings.ts
async function migrate() {
  // 1. Планы
  const plans = await planConfigDb.query('SELECT * FROM plan_config.plan');
  for (const plan of plans.rows) {
    await settingsDb.query(
      'INSERT INTO settings.plan (id, title, description, monthly_price, yearly_price, is_active) VALUES ($1,$2,$3,$4,$5,$6)',
      [plan.id, plan.title, plan.description, plan.monthly_price, plan.yearly_price, plan.is_active]
    );
  }

  // 2. scalar-config → parameter (system-var) + system_value
  const scalarVars = await scalarConfigDb.query('SELECT * FROM scalar_config.scalar_variable');
  for (const v of scalarVars.rows) {
    await settingsDb.query(
      `INSERT INTO settings.parameter (key, service, category, name, description, param_type, default_value, user_override, sync_status)
       VALUES ($1, $2, 'system-var', $3, $4, $5, $6, false, $7)`,
      [v.key, v.service, v.key, v.description, v.type, v.default_value, v.sync_status]
    );
    const val = await scalarConfigDb.query('SELECT * FROM scalar_config.scalar_value WHERE key = $1', [v.key]);
    if (val.rows[0]) {
      await settingsDb.query(
        'INSERT INTO settings.system_value (param_key, value, updated_by, updated_at) VALUES ($1,$2,$3,$4)',
        [v.key, val.rows[0].value, val.rows[0].updatedBy, val.rows[0].updatedAt]
      );
    }
  }

  // 3. plan-config → parameter (tarif-var) + plan_value
  const planVars = await planConfigDb.query('SELECT * FROM plan_config.plan_variable');
  for (const pv of planVars.rows) {
    const paramType = mapValueType(pv.value_type);
    const defaultValue = buildDefaultValue(pv);
    await settingsDb.query(
      `INSERT INTO settings.parameter (key, service, category, name, description, param_type, default_value, user_override, sync_status)
       VALUES ($1, $2, 'tarif-var', $3, $4, $5, $6, false, $7)`,
      [pv.key, pv.service, pv.name, pv.description, paramType, defaultValue, pv.sync_status]
    );
    const tiers = await planConfigDb.query(
      'SELECT * FROM plan_config.plan_variable_tier WHERE variable_key = $1', [pv.key]
    );
    for (const tier of tiers.rows) {
      const value = buildTierValue(pv.value_type, tier);
      await settingsDb.query(
        'INSERT INTO settings.plan_value (plan_id, param_key, value) VALUES ($1,$2,$3)',
        [tier.plan_id, pv.key, value]
      );
    }
  }

  // 4. Подписки
  const subs = await planConfigDb.query('SELECT * FROM plan_config.user_subscription');
  for (const sub of subs.rows) {
    await settingsDb.query(
      `INSERT INTO settings.user_subscription (user_id, plan_id, starts_at, expires_at, auto_renew, billing_period, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [sub.user_id, sub.plan_id, sub.starts_at, sub.expires_at, sub.auto_renew, sub.billing_period, sub.status]
    );
  }
}
```

#### 3.2 Миграция domain-сервисов

| Сервис | Было | Стало |
|--------|------|-------|
| auction | `POST scalar-config/.../auction` | `POST settings/internal/v1/system-values/auction` |
| auction | `POST plan-config/limits/check` | `POST settings/internal/v1/limits/consume` |
| forum | `POST scalar-config/.../forum` | `POST settings/internal/v1/system-values/forum` |
| forum | `POST plan-config/limits/check` | `POST settings/internal/v1/limits/consume` |
| chat | `POST scalar-config/.../chat` | `POST settings/internal/v1/system-values/chat` |
| chat | — | `POST settings/internal/v1/user-values/:userId/:key` (чтение user-var) |
| bff | `GET admin/scalar-config/...` | `GET admin/settings/system-values?service=X` |
| bff | `GET admin/plan-config/...` | `GET admin/settings/plan-values` |

---

### Фаза 4: Переключение и удаление

#### 4.1 Parallel run

1. Deploy `settings` (порт 3020)
2. Deploy BFF с `/admin/settings/*`
3. Deploy frontend с новым UI
4. Domain-сервисы: dual-write
5. Cron restore в `settings`

#### 4.2 Полное переключение

1. Domain-сервисы: читают только `settings`
2. BFF: старые контроллеры → deprecated
3. Frontend: redirect старых страниц

#### 4.3 Удаление

1. Удалить `services/scalar-config/`
2. Удалить `services/plan-config/`
3. Удалить schemas `scalar_config`, `plan_config`
4. Удалить env vars: `SCALAR_CONFIG_URL`, `PLAN_CONFIG_URL`
5. Удалить BFF модули: `ScalarConfigModule`, `PlanConfigModule`, `AdminPlanConfigModule`
6. Удалить frontend: `AdminScalarConfigView.vue`, `AdminPlanConfigView.vue`
7. Обновить ADR-003, ADR-016, ADR-017

---

## Временная шкала

| Фаза | Задачи | Срок |
|------|--------|------|
| **1** | Сервис `settings` + entities + API + tests | 7-9 дней |
| **2** | BFF + Admin UI + Member Profile UI | 5-7 дней |
| **3** | Script миграции + dual-write | 2-3 дня |
| **4** | Переключение + удаление | 1-2 дня |
| **Итого** | | **15-21 дней** |

---

## Риски

| Риск | Митигация |
|------|-----------|
| Потеря данных при миграции | Dry-run на staging, checksums, rollback script |
| Простой при переключении | Dual-write, feature flag |
| Несовместимость API | Proxy-слой в BFF, backward-compatible endpoints |
| Cron restore пропускает цикл | `cycle_end` check при каждом `consume` |
| Таблица `limit_usage_log` растёт | Partition by month, retention 90 дней |
| `limit_purchase` накапливается | Cleanup expired при restore cron |
