# 🔨 Сервис: auction

> **Статус:** in progress · **Версия:** 0.1

## 🎯 Назначение

Управление аукционами Tavrida Lot: создание лотов, ставки, завершение сделок.

- Поддержка типов аукционов (английский, голландский и др.)
- Проверка лимитов через `financial-policy`
- Публикация события `auction.completed` в RabbitMQ

## 📖 Термины

| Термин | Описание |
|--------|----------|
| **Лот (Auction)** | Аукцион с начальной ценой, длительностью и типом |
| **Ставка (Bid)** | Предложение цены от участника |
| **Резервная цена** | Минимальная цена продажи (Pro / платная фича) |
| **ExpertAppraisal** | Экспертная оценка лота (роль Expert, назначает admin) |

## 📄 Дополнительные документы

| Документ | Описание |
|----------|----------|
| [financial-features.md](./requirements/financial-features.md) | Лимиты и платные фичи по планам |

## 🔗 Взаимодействие

| Сервис | Взаимодействие | Протокол |
|--------|----------------|----------|
| financial-policy | `POST /limits/check`, `POST /features/can-use` | HTTP |
| billing | `POST /wallets/charge` (promotion, reserve) | HTTP |
| feedback | `auction.completed` | RabbitMQ |
| rating | `POST /rating/check-ban` | HTTP |
| marketplace | expert appraisals — см. ниже (роль Expert) | — |

---

## 👨‍🔬 Экспертные оценки

Эксперт с ролью **Expert** ([roles.md](../../01-goal/roles.md)) может добавить к лоту **экспертную оценку**. На одном лоте — несколько оценок от разных экспертов.

### `ExpertAppraisal` (schema: `auction`)

```ts
@Entity({ schema: 'auction', name: 'expert_appraisal' })
export class ExpertAppraisal {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('uuid')
  auctionId: string

  @Column('uuid')
  expertId: string

  @Column('text')
  summary: string

  @Column('decimal', { nullable: true })
  estimatedValueMin?: number

  @Column('decimal', { nullable: true })
  estimatedValueMax?: number

  @Column('varchar', { default: 'RUB' })
  currency: string

  @Column('jsonb', { default: [] })
  attachments: string[]

  @CreateDateColumn()
  createdAt: Date
}
```

### API

```http
POST /api/v1/auctions/{auctionId}/expert-appraisals
Authorization: Bearer {expert-token}
```

**Payload:**

```json
{
  "summary": "Монета XVIII века, сохранность VF",
  "estimatedValueMin": 5000,
  "estimatedValueMax": 8000,
  "currency": "RUB",
  "attachments": ["https://..."]
}
```

```http
GET /api/v1/auctions/{auctionId}/expert-appraisals
```

- Публичный просмотр — все пользователи
- Создание — Keto `platform:tavrida-lot#expert@user:{id}`; рекомендуется запрет owner лота
- Значимость лота: `auction.expertAppraisalBoost` ([PLATFORM-REGISTRY](../PLATFORM-REGISTRY.md))

### События

| Event | Когда |
|-------|-------|
| `auction.expert_appraisal_added` | POST успешен |

---

## 📋 TODO

- [ ] Сущности TypeORM (`Auction`, `Bid`, `ExpertAppraisal`)
- [ ] API-эндпоинты (CRUD, ставки)
- [ ] Логика типов аукционов
- [ ] WebSocket / SSE для live-ставок

## 🔗 Связанные разделы

- [financial-features](./requirements/financial-features.md)
- [financial-policy](../financial-policy/README.md)
- [feedback](../feedback/README.md)
- [marketplace](../marketplace/README.md) — expert appraisals на лотах

---

**Автор:** команда разработки · **Версия:** 0.1-draft
