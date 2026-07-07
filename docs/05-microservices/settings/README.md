# ⚙️ Сервис: settings

> **Статус:** draft · **Версия:** 0.1

## 🎯 Назначение

Единый сервис управления **настройками** для всей платформы **Tavrida Lot**.

- Хранит JSON-конфиги для `rating.*`, `billing.*`, `auction.*`
- Кэширует в Redis (`settings:*`)
- Предоставляет API для чтения и изменения (админ)

## 📖 Термины

| Термин | Описание |
|--------|----------|
| `settingKey` | Путь к параметру (например, `rating.authorityExponent`) |
| `settingValue` | JSON-значение (строка, число, объект) |
| `settingScope` | Глобальный (`global`) или пользовательский (`user:uuid`) |

## 🗄️ Сущность

```ts
@Entity()
export class Setting {
  @PrimaryColumn('varchar', { length: 255 })
  key: string // 'rating.authorityExponent'

  @Column('jsonb')
  value: any

  @Column('varchar', { default: 'global' })
  scope: 'global' | 'user'

  @Column('uuid', { nullable: true })
  userId?: string // для user-scoped

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
```

## ⚙️ Переменные settings (реестр)

Settings **владеет** скалярными конфигами. Доменные сервисы регистрируют ключи — см. **[PLATFORM-REGISTRY.md](../PLATFORM-REGISTRY.md)**.

### API

#### `GET /api/v1/settings/{domain}`

#### `POST /api/v1/settings/{domain}` (admin)

#### `POST /api/v1/settings/register` (internal, при деплое сервиса)

```json
{
  "keys": [
    { "key": "rating.authorityExponent", "type": "number", "default": 0.2, "service": "rating" }
  ]
}
```

**Ответ:** `201 Created`

### Пример: `GET /api/v1/settings/rating`

```json
{
  "authorityExponent": 0.2,
  "contextWeights": { "auction": 1.0, "forum": 1.2 }
}
```

### `POST /api/v1/settings/rating` (admin)

**Payload:**

```json
{
  "authorityExponent": 0.3,
  "bonuses": { "earlyHours": 24, "earlyBonus": 0.5 }
}
```

**Ответ:** `200 OK`

## 🚀 Кэширование

- Redis TTL: `300s` (5 минут)
- Инвалидация при `POST /settings/*`
- Ключи: `settings:rating:latest`, `settings:auction:latest`

## 🔗 Взаимодействие

| Сервис | Взаимодействие |
|--------|----------------|
| `rating` | Читает `settings.rating.*` |
| `auction` | Читает `settings.auction.*` |
| `billing` | Читает `settings.billing.*` |

## 📎 Связанные разделы

- [ADR-003](../../03-architecture/adr/003-settings-vs-financial-policy.md)
- [MICROSERVICE-SPEC](../MICROSERVICE-SPEC.md)
- [financial-policy](../financial-policy/README.md)

---

**Автор:** команда разработки · **Версия:** 0.1-draft
