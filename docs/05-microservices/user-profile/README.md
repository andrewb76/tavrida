# 👤 Сервис: user-profile

> **Статус:** draft · **Версия:** 0.1

## 🎯 Назначение

Сервис управления **профилем пользователя**, **приватными заметками** и **базовой информацией**.

- Кэширует данные рейтинга из `rating` (`rating`, `verifiedSales`, `pendingSales`)
- Позволяет оставлять **приватные заметки** (видны только автору и владельцу профиля)
- Данные используются в `auction`, `forum`, `marketplace` для отображения профиля

## 📖 Термины

| Термин | Описание |
|--------|----------|
| `UserProfile` | Профиль пользователя: `bio`, `avatar`, `rating`, `verifiedSales`, `pendingSales` |
| `ProfileNote` | Приватная заметка от другого пользователя (видна только `authorId` и `ownerId`) |

## 🗄️ Сущности (TypeORM)

### `UserProfile`

```ts
@Entity()
export class UserProfile {
  @PrimaryColumn('uuid')
  userId: string

  @Column('text', { nullable: true })
  bio?: string

  @Column('varchar', { nullable: true })
  avatarUrl?: string

  @Column('decimal')
  rating: number

  @Column('int', { default: 0 })
  verifiedSales: number

  @Column('int', { default: 0 })
  pendingSales: number

  @Column('datetime')
  lastUpdated: Date
}
```

> 💡 Поля `rating`, `verifiedSales`, `pendingSales` — денормализованный кэш из `rating`. Источник истины — сервис `rating`.

### `ProfileNote`

```ts
@Entity()
export class ProfileNote {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('uuid')
  ownerId: string // кому написали

  @Column('uuid')
  authorId: string // кто написал

  @Column('text')
  text: string

  @CreateDateColumn()
  createdAt: Date
}
```

## 🔌 API

### `GET /api/v1/profile?userId=xxx`

```json
{
  "userId": "xxx",
  "bio": "Продаватель редких монет",
  "avatarUrl": "https://...",
  "rating": 4.8,
  "verifiedSales": 20,
  "pendingSales": 1
}
```

### `POST /api/v1/profile/notes`

```http
POST /api/v1/profile/notes
Authorization: Bearer {token}
```

**Payload:**

```json
{
  "ownerId": "user-uuid",
  "text": "Стоит обратить внимание на его комментарии — всегда точные."
}
```

**Ответ:** `201 Created`

## 🔒 Безопасность

- `GET /notes` — только `ownerId` и `authorId` могут видеть свои заметки.
- `POST /notes` — только авторизованные пользователи.
- Заметки **не отображаются** в профиле третьим лицам.

## 🔗 Взаимодействие

| Сервис | Взаимодействие |
|--------|----------------|
| `rating` | Синхронизация рейтинговых полей |
| `auction`, `forum`, `marketplace` | Чтение профиля для UI |

---

**Автор:** команда разработки · **Версия:** 0.1-draft
