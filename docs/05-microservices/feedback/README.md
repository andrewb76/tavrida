# 💬 Сервис: feedback

> **Статус:** draft · **Версия:** 0.1

## 🎯 Назначение

Сервис сбора и управления **отзывами о завершённых сделках** (аукцион и marketplace).

- Хранит `DealFeedback` — отзывы сторон сделки
- Управляет `PendingFeedback` — отслеживание неоценённых сделок
- Применяет бонусы за быстрые и качественные отзывы
- Инициирует уведомления и штрафы через `rating`

## 📖 Термины

| Термин | Описание |
|--------|----------|
| `DealFeedback` | Финальный отзыв с оценками и комментариями |
| `PendingFeedback` | Трекер: отправили ли уведомление, сколько раз напомнили |
| `FeedbackBonus` | История начисленных бонусов (чтобы не дать дважды) |
| `dealType` | `auction` \| `marketplace` — тип завершённой сделки |

## 🗄️ Сущности (TypeORM)

### `DealFeedback`

```ts
@Entity()
export class DealFeedback {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('enum', { enum: ['auction', 'marketplace'] })
  dealType: 'auction' | 'marketplace'

  @Column('uuid', { nullable: true })
  auctionId?: string

  @Column('uuid', { nullable: true })
  orderId?: string

  @Column('uuid')
  sellerId: string // auction: seller; marketplace: provider

  @Column('uuid')
  buyerId: string // auction: buyer; marketplace: customer

  @Column('boolean', { nullable: true })
  sellerGoodsReceived?: boolean

  @Column('boolean', { nullable: true })
  buyerPaymentReceived?: boolean

  @Column('decimal', { nullable: true })
  sellerRating?: number

  @Column('decimal', { nullable: true })
  buyerRating?: number

  @Column('text', { nullable: true })
  sellerComment?: string

  @Column('text', { nullable: true })
  buyerComment?: string

  @Column('datetime', { nullable: true })
  submittedBySellerAt?: Date

  @Column('datetime', { nullable: true })
  submittedByBuyerAt?: Date

  @Column('datetime', { nullable: true })
  finalisedAt?: Date
}
```

### `PendingFeedback`

```ts
@Entity()
export class PendingFeedback {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('enum', { enum: ['auction', 'marketplace'] })
  dealType: 'auction' | 'marketplace'

  @Column('uuid', { nullable: true })
  auctionId?: string

  @Column('uuid', { nullable: true })
  orderId?: string

  @Column('uuid')
  userId: string

  @Column('datetime')
  notificationSentAt: Date

  @Column('int', { default: 0 })
  remindersCount: number

  @Column('datetime', { nullable: true })
  lastReminderAt?: Date
}
```

### `FeedbackBonus`

```ts
@Entity()
export class FeedbackBonus {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('uuid')
  userId: string

  @Column('enum', { enum: ['EARLY', 'PHOTO', 'BOTH'] })
  type: 'EARLY' | 'PHOTO' | 'BOTH'

  @Column('decimal')
  amount: number

  @Column('datetime')
  appliedAt: Date
}
```

## 🔌 API

### `POST /api/v1/feedback/submit`

```http
POST /api/v1/feedback/submit
Authorization: Bearer {token}
```

**Payload (auction):**

```json
{
  "dealType": "auction",
  "auctionId": "auction-uuid",
  "userId": "user-uuid",
  "sellerGoodsReceived": true,
  "buyerPaymentReceived": true,
  "sellerRating": 5,
  "buyerRating": 4,
  "sellerComment": "Отличный товар, быстро доставили",
  "buyerComment": "Честный продавец"
}
```

**Payload (marketplace):**

```json
{
  "dealType": "marketplace",
  "orderId": "order-uuid",
  "userId": "user-uuid",
  "providerServiceDelivered": true,
  "customerPaymentReceived": true,
  "providerRating": 5,
  "customerRating": 4,
  "providerComment": "Заказ выполнен в срок",
  "customerComment": "Качественная реставрация"
}
```

**Ответ:** `200 OK` + начисление бонусов (если применимо)

### `GET /api/v1/feedback/status?dealType=auction&auctionId=xxx`

### `GET /api/v1/feedback/status?dealType=marketplace&orderId=xxx`

```json
{
  "auctionId": "xxx",
  "sellerFeedback": { "submitted": true, "rating": 5 },
  "buyerFeedback": { "submitted": false },
  "isPending": true,
  "pendingSince": "2026-07-05T10:00:00Z"
}
```

## 🎁 Бонусы и штрафы

- **Бонусы**: `EARLY` (24ч), `PHOTO`, `BOTH` (для продавца и покупателя)
- **Штрафы**: `rating *= 0.9` при 3+ pending, бан при 10+

## 🔗 Взаимодействие

| Сервис | Взаимодействие | Протокол |
|--------|----------------|----------|
| `auction` | `auction.completed` → создаёт `PendingFeedback` | RabbitMQ |
| `marketplace` | `marketplace.order_completed` → создаёт `PendingFeedback` | RabbitMQ |
| `rating` | `POST /rating/bonuses/apply` | HTTP |
| `notifications` | `email`/`push` при `remindersCount += 1` | HTTP |

## 📨 События (consume)

| Event | Действие |
|-------|----------|
| `auction.completed` | PendingFeedback для seller + buyer |
| `marketplace.order_completed` | PendingFeedback для provider + customer |

## 📨 События (produce)

| Event | Когда |
|-------|-------|
| `feedback.submitted` | Обе стороны оценили или истёк срок |
| `feedback.reminder_due` | CRON — напоминание об отзыве |

---

**Автор:** команда разработки · **Версия:** 0.1-draft
