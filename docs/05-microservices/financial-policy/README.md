# 📋 Сервис: financial-policy

> **Статус:** in progress · **Версия:** 0.1

## 🎯 Назначение

Единый сервис управления **тарифными планами**, **лимитами** и **функциями** для всей платформы **Tavrida Lot**.

- Хранит список планов (Free/Basic/Pro...)
- Хранит **реестр регулируемых параметров** от всех микросервисов
- Позволяет админу настраивать лимиты и включать/выключать фичи
- Предоставляет API для проверки лимитов ( `/limits/check` )
- Управляет **подписками** и **автопродлением**

## 📖 Термины

| Термин | Описание |
|--------|----------|
| **План (Plan)** | Тарифная группа (`Free`, `Basic`, `Pro`) |
| **Подписка (Subscription)** | Действующий план с датами (`startsAt`, `expiresAt`) |
| **Параметр (Parameter)** | Регулируемая метрика от сервиса (`auction.activeAuctions`) |
| **Лимит (Limit)** | Числовое значение для конкретного плана (`5` для Free) |
| **Фича (Feature)** | Флаг активности (`true`/`false`) |

## 🗄️ Сущности (TypeORM)

### `Plan`

```ts
@Entity()
export class Plan {
  @PrimaryColumn('uuid')
  id: string // 'free', 'basic', 'pro'

  @Column('varchar')
  title: string // 'Бесплатно', 'Базовый', 'Pro'

  @Column('text', { nullable: true })
  description?: string

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  monthlyPrice: number

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  yearlyPrice: number

  @Column('boolean', { default: true })
  isActive: boolean

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
```

### `Parameter`

```ts
@Entity()
export class Parameter {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('varchar')
  key: string // 'auction.activeAuctions'

  @Column('varchar')
  service: string // 'auction'

  @Column('varchar')
  name: string // 'Макс. активных аукционов'

  @Column('text', { nullable: true })
  description?: string

  @Column('int')
  minValue: number

  @Column('int', { default: 5 })
  defaultValue: number

  @Column('int', { nullable: true })
  maxValue?: number

  @Column('boolean', { default: true })
  isFeatureEnabled: boolean

  @CreateDateColumn()
  createdAt: Date
}
```

### `UserSubscription`

```ts
@Entity()
export class UserSubscription {
  @PrimaryColumn('uuid')
  userId: string

  @Column('varchar')
  planId: string // 'pro'

  @Column('datetime')
  startsAt: Date

  @Column('datetime')
  expiresAt: Date

  @Column('boolean', { default: true })
  autoRenew: boolean

  @Column('enum', { enum: ['ACTIVE', 'EXPIRED', 'CANCELLED'] })
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED'

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
```

### `PlanParameter`

```ts
@Entity()
export class PlanParameter {
  @PrimaryColumn('varchar')
  planId: string

  @PrimaryColumn('varchar')
  parameterKey: string

  @Column('int')
  limitValue: number

  @Column('boolean', { default: true })
  isFeatureEnabled: boolean

  @CreateDateColumn()
  createdAt: Date
}
```

## 🔌 API

### Регистрация параметров

```http
POST /api/v1/parameters/register
Authorization: Bearer {admin-token}
```

### Payload:
```json
{
  "key": "auction.activeAuctions",
  "service": "auction",
  "name": "Макс. активных аукционов",
  "description": "Количество активных аукционов, в которых может участвовать пользователь",
  "minValue": 0,
  "defaultValue": 5,
  "maxValue": 999999
}
```

### Настройка лимитов
```http
POST /api/v1/features/set-limit
Authorization: Bearer {admin-token}
```

### Payload:
```json
{
  "planId": "basic",
  "parameterKey": "auction.activeAuctions",
  "limitValue": 20,
  "isFeatureEnabled": true
}
```

### Проверка лимита (основной эндпоинт)
```http
POST /api/v1/limits/check
Authorization: Bearer {token}
```
### Payload:
```json
{
  "userId": "user-uuid-123",
  "parameterKey": "auction.activeAuctions",
  "requestedValue": 1,
  "currentUsage": 4
}
```

### Проверка фичи

```http
POST /api/v1/features/can-use
Authorization: Bearer {token}
```

Payload:

```json
{
  "userId": "user-uuid-123",
  "featureKey": "auction.promotionEnabled"
}
```

Ответ:

```json
{ "allowed": true, "planId": "pro" }
```

### Активация подписки
```http
POST /api/v1/plans/activate
Authorization: Bearer {token}
```

### Payload:
```json
{
  "userId": "user-uuid",
  "planId": "pro",
  "autoRenew": true
}
```

### Логика:
- Проверка баланса через billing
- Если balance >= monthlyPrice → списание
- Создание UserSubscription с status=ACTIVE, expiresAt=now() + 1 month

### Автопродление
- По CRON (например, every 1 hour) проверяет expiresAt <= now()
- Если autoRenew=true и status=ACTIVE → проверяет баланс
- Если баланса достаточно → списывает monthlyPrice, продлевает на 1 месяц

## 🔗 Взаимодействие

| Сервис | Взаимодействие | Протокол | Пример |
|--------|---------------|----------|--------|
| billing | GET /wallets/balance, POST /wallets/charge | HTTP | Активация подписки |
| auction, marketplace, auction_subscriptions | POST /limits/check | HTTP | Проверка лимитов |
| admin-ui | POST /features/set-limit, GET /plans | HTTP | Админка |

## 🔒 Безопасность
- POST /limits/check — только для пользователя (с токеном)
- POST /features/set-limit — только админ (через admin роль в Ory Keto)
- Все запросы проходят через BFF (нельзя прямой доступ к financial-policy)

## ⚙️ Окружение

| Переменная | Описание | Пример |
|------------|----------|--------|
| DATABASE_URL | PostgreSQL (`schema: financial_policy`) | postgres://user:pass@localhost:5432/tavrida_lot |
| BILLING_URL | URL billing | http://localhost:3001 |
| PORT | HTTP-порт | 3002 |

---

**Автор:** команда разработки · **Версия:** 0.1-draft

## 💳 Переменные financial-policy (реестр)

Сервис **владеет** тарифными значениями. Параметры **регистрируются** доменными сервисами — см. их README (секция 💳).

Примеры: `auction.activeAuctions`, `forum.postsPerDay` — значения per plan в `plan_parameter`.

> 💡 Полный реестр: [PLATFORM-REGISTRY.md](../PLATFORM-REGISTRY.md).

## 📎 Связанные разделы

- [billing](../billing/README.md)
- [ADR-003](../../03-architecture/adr/003-settings-vs-financial-policy.md)
- [MICROSERVICE-SPEC](../MICROSERVICE-SPEC.md)
