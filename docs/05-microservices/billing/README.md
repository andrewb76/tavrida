# 💰 Сервис: billing

> **Статус:** in progress · **Версия:** 0.1

## 🎯 Назначение

Сервис управления **лицевыми счётами пользователей** и **платежами** за услуги платформы.

- Хранит баланс (`userId`, `balance`)
- Обрабатывает пополнения и списания по запросу других сервисов (financial-policy, auction)
- **Не знает** о тарифных планах — только баланс и транзакции

## 📖 Термины

| Термин | Описание |
|--------|----------|
| **Лицевой счёт** | Счёт пользователя (`userId`, `balance`) |
| **Платёж (Transaction)** | Операция (`DEPOSIT`, `CHARGE`, `REFUND`) |
| **Платная фича** | Функция, требующая оплаты (например, `auction.promotion`) |

## 🗄️ Сущности

### `UserWallet`

| Поле | Тип | Описание |
|------|-----|----------|
| `userId` | UUID | ID пользователя |
| `balance` | number | Текущий баланс |
| `currency` | string | Валюта (по умолчанию `RUB`) |
| `createdAt` | datetime | — |

```ts
@Entity()
export class UserWallet {
  @PrimaryColumn('uuid')
  userId: string

  @Column('decimal')
  balance: number

  @Column('varchar', { length: 3, default: 'RUB' })
  currency: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
```

### `Transaction`

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID | ID операции |
| `userId` | UUID | — |
| `type` | `DEPOSIT` \| `CHARGE` \| `REFUND` | Тип |
| `amount` | number | Сумма |
| `description` | string | Описание (например, `'Pro-подписка'`, `'Аукцион #789 продвижение') |
| `status` | `PENDING` \| `COMPLETED` \| `FAILED` | Статус |
| `createdAt` | datetime | — |

> 💡 `description` — человекочитаемая строка. Структурированная связь с `auctionId` не нужна — это задача `auction` сервиса хранить такие данные.

```ts
@Entity()
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('uuid')
  userId: string

  @Column('enum', { enum: ['DEPOSIT', 'CHARGE', 'REFUND'] })
  type: 'DEPOSIT' | 'CHARGE' | 'REFUND'

  @Column('decimal')
  amount: number

  @Column('text')
  description: string // например, 'Pro-подписка (автопродление)', 'Аuction #789 promotion'

  @Column('enum', { enum: ['PENDING', 'COMPLETED', 'FAILED'] })
  status: 'PENDING' | 'COMPLETED' | 'FAILED'

  @CreateDateColumn()
  createdAt: Date
}
```

## 🔌 API

### `GET /api/v1/wallets/balance`

```http
GET /api/v1/wallets/balance?userId=user-uuid
Authorization: Bearer {token}
```

```json
{ "userId": "uuid", "balance": 500, "currency": "RUB" }
```

### Пополнение

```http
POST /api/v1/wallets/deposit
```

Payload:
```json
{
  "userId": "user-uuid",
  "amount": 500,
  "paymentMethod": "card"
}
```

Ответ: `201 Created` + `transactionId`

### Списание

```http
POST /api/v1/wallets/charge
Idempotency-Key: {uuid}
```

Payload:

```json
{
  "userId": "user-uuid",
  "amount": 200,
  "target": "financial-policy.activate-plan:pro",
  "description": "Pro-подписка"
}
```

Ответ: `200 OK` + `transactionId` (или `402` при недостаточном балансе)

## 🔗 Взаимодействие

| Сервис | Взаимодействие | Протокол | Направление |
|--------|---------------|----------|-------------|
| financial-policy | `GET /wallets/balance`, `POST /wallets/charge` | HTTP | FP → billing |
| auction | `POST /wallets/charge` (`target: auction.promotion`) | HTTP | auction → billing |

## 📨 События

| Direction | Event | Описание |
|-----------|-------|----------|
| produce | `billing.deposit_completed` | Пополнение успешно |
| produce | `billing.charge_completed` | Списание успешно |
| produce | `billing.charge_failed` | Недостаточно средств |

> Каталог: [event-catalog](../../03-architecture/event-catalog.md)

## 🔒 Безопасность
- Проверка баланса перед списанием
- Атомарные операции (Redis lock или PostgreSQL SELECT ... FOR UPDATE)
- История всех операций (audit log)

## 📨 Очередь

- События через RabbitMQ (см. [event-catalog](../../03-architecture/event-catalog.md))
- Legacy queue name `billing.events` → **deprecated**, использовать typed events

## 📊 Лимиты и фичи
- Не зависит от тарифов — billing не знает о планах.
- financial-policy управляет логикой активации.

## ⚙️ Окружение

| Переменная | Описание | Пример |
|------------|----------|--------|
| DATABASE_URL | PostgreSQL (`schema: billing`) | postgres://user:pass@localhost:5432/tavrida_lot |
| RABBITMQ_URL | RabbitMQ | amqp://user:pass@localhost:5672 |
| FINANCIAL_POLICY_URL | URL financial-policy | http://localhost:3002 |
| PORT | HTTP-порт | 3001 |

---

**Автор:** команда разработки · **Версия:** 0.1-draft

## 📎 Связанные разделы

- [financial-policy](../financial-policy/README.md)
- [MICROSERVICE-SPEC](../MICROSERVICE-SPEC.md)
- [Event catalog](../../03-architecture/event-catalog.md)
