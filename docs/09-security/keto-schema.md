# 🔐 Ory Keto — schema авторизации

> **Статус:** draft · **Версия:** 0.1  
> **Связано:** [roles.md](../01-goal/roles.md) · [09-security](./README.md)

Namespace: `TavridaLot` (Ory Keto v0.11+).  
**Лимиты тарифов** — через plan-config, **не** через Keto.

---

## 🎯 Namespace definition

```yaml
# keto-namespace.yaml (draft)
name: TavridaLot

relation-tuples:
  # Platform-wide roles (inheritance: admin > moderator > member; expert orthogonal)
  - platform:tavrida-lot#member@user:*
  - platform:tavrida-lot#moderator@user:*     # assigned explicitly
  - platform:tavrida-lot#expert@user:*         # assigned explicitly (admin)
  - platform:tavrida-lot#admin@user:*          # assigned explicitly

  # Moderator inherits member capabilities
  - platform:tavrida-lot#member@platform:tavrida-lot#moderator

  # Expert inherits member (not moderator)
  - platform:tavrida-lot#member@platform:tavrida-lot#expert

  # Admin inherits moderator + member
  - platform:tavrida-lot#moderator@platform:tavrida-lot#admin
  - platform:tavrida-lot#member@platform:tavrida-lot#admin
```

---

## 📦 Object types

| Object | ID format | Relations | Описание |
|--------|-----------|-----------|----------|
| `platform` | `tavrida-lot` | `member`, `moderator`, `expert`, `admin` | Глобальные роли |
| `auction` | `{auctionId}` | `owner`, `viewer`, `moderator` | Лот |
| `category` | `{categoryId}` | `moderator`, `expert` | Категория форума |
| `topic` | `{topicId}` | `owner`, `moderator` | Топик (тема) |
| `comment` | `{commentId}` | `owner`, `moderator` | Комментарий |
| `report` | `{reportId}` | `viewer` | Жалоба (moderator+) |

> **Форум:** `post` **deprecated** → `topic` / `comment` ([ADR-005](../03-architecture/adr/005-forum-terminology.md)).  
> **Модераторы:** [moderator-mapping.md](./moderator-mapping.md) — единая таблица UX ↔ Logto ↔ Keto.

### 👮 Модераторы форума

См. [moderator-mapping.md](./moderator-mapping.md). Keto tuples:

| Назначение | Tuple | Область |
|------------|-------|---------|
| Главный | `platform:tavrida-lot#moderator@user:{id}` | весь форум + аукционы |
| Областной | `category\|topic\|comment:{id}#moderator@user:{id}` | объект + вложенные |

Назначение и снятие — **только admin**.

### ⭐ Эксперты (scoped)

См. [ADR-007](../03-architecture/adr/007-category-scoped-expert.md).

| Назначение | Tuple | Область |
|------------|-------|---------|
| Главный | `platform:tavrida-lot#expert@user:{id}` | все категории |
| Областной | `category:{id}#expert@user:{id}` | категория + поддерево; expert appraisal лотов в ветке |

Проверка appraisal: `category:{auction.categoryId}#expert@user:{id}` OR platform expert.

---

## 🔗 Relation tuples (примеры)

### Platform roles (назначает admin)

```text
platform:tavrida-lot#moderator@user:550e8400-e29b-41d4-a716-446655440000
platform:tavrida-lot#expert@user:770e8400-e29b-41d4-a716-446655440002
platform:tavrida-lot#admin@user:660e8400-e29b-41d4-a716-446655440001
```

При регистрации (Logto webhook → BFF):

```text
platform:tavrida-lot#member@user:{newUserId}
```

### Auction ownership (создаёт auction service)

```text
auction:{auctionId}#owner@user:{sellerId}
auction:{auctionId}#viewer@platform:tavrida-lot#member
```

Moderator на все аукционы (наследование от platform):

```text
auction:{auctionId}#moderator@platform:tavrida-lot#moderator
```

### Forum content

```text
topic:{topicId}#owner@user:{authorId}
topic:{topicId}#moderator@user:{scopedModeratorId}    # областной: только эта ветка

comment:{commentId}#owner@user:{authorId}
comment:{commentId}#moderator@user:{scopedModeratorId}

category:{categoryId}#moderator@user:{scopedModeratorId}  # вся категория
```

Главный модератор (наследование от platform):

```text
topic:{topicId}#moderator@platform:tavrida-lot#moderator
comment:{commentId}#moderator@platform:tavrida-lot#moderator
category:{categoryId}#moderator@platform:tavrida-lot#moderator
```

Назначение областного модератора (admin):

```text
+ category:{categoryId}#moderator@user:{moderatorId}
+ topic:{topicId}#moderator@user:{moderatorId}
+ comment:{commentId}#moderator@user:{moderatorId}
```

---

## ✅ Check API — типовые запросы

Формат Ory Keto `Check`:

```json
{
  "namespace": "TavridaLot",
  "object": "platform:tavrida-lot",
  "relation": "admin",
  "subject_id": "user:550e8400-..."
}
```

### Матрица checks → endpoint

| Действие | Check | Fallback |
|----------|-------|----------|
| Admin API | `platform:tavrida-lot#admin@user:{id}` | 403 |
| Assign/remove forum moderator | `platform:tavrida-lot#admin@user:{id}` | 403 |
| Moderate forum object | `platform#moderator` OR `{type}:{id}#moderator` OR ancestor `#moderator` | 403 |
| Promote comment → topic | то же, что moderate на comment/topic/category-предке | 403 |
| Moderate auction (hide lot) | `auction:{id}#moderator@user:{id}` OR platform moderator | 403 |
| Edit own topic | `topic:{id}#owner@user:{id}` | 403 |
| Edit own comment | `comment:{id}#owner@user:{id}` | 403 |
| Edit auction (seller) | `auction:{id}#owner@user:{id}` | 403 |
| Add expert appraisal | `platform:tavrida-lot#expert@user:{id}` + not `auction:{id}#owner` | 403 |
| Place bid | `platform:tavrida-lot#member@user:{id}` + plan-config limits + rating ban | 403/402 |
| Create auction | `platform:tavrida-lot#member@user:{id}` + plan-config limits | 403 |

> **Moderator + аукционы:** может просматривать жалобы на лоты, скрывать/восстанавливать лот, блокировать ставки пользователя на конкретном лоте. Не может менять баланс, тарифы, назначать admin. *(уточняется)*

---

## 🚫 Что НЕ в Keto

| Проверка | Где |
|----------|-----|
| `forum.postsPerDay`, `auction.activeAuctions` | plan-config `limits/check` |
| Рейтинговый бан | rating `check-ban` |
| Pro-фичи | plan-config `features/can-use` |
| Достаточно баланса | billing |

---

## 🔄 Жизненный цикл tuples

| Событие | Действие Keto |
|---------|---------------|
| User registered | `+ platform#member@user` |
| Admin assigns chief moderator | `+ platform#moderator@user` |
| Admin assigns scoped moderator | `+ category\|topic\|comment:{id}#moderator@user` |
| Admin removes moderator | `- соответствующий tuple` |
| Admin assigns expert | `+ platform#expert@user` |
| Admin removes expert | `- platform#expert@user` |
| Auction created | `+ auction#owner@user`, `+ auction#viewer@platform#member` |
| Auction deleted | `- all tuples for auction:{id}` |
| Topic created | `+ topic#owner@user` |
| Comment created | `+ comment#owner@user` |
| Comment promoted to topic | новый `topic` + ссылки; tuples без изменения moderator scope |

---

## 📋 TODO

- [x] Модель модератора форума: главный vs scoped `category|topic|comment:{id}`
- [x] Promote comment → topic: права и lifecycle tuples
- [x] Bootstrap первого admin: `pnpm grant:admin`, `docker/keto`, [bootstrap-admin.md](./bootstrap-admin.md)
- [x] Postgres persistence: schema `keto` в `tavrida_lot` ([ADR-001](../03-architecture/adr/001-database-schema-per-service.md))
- [ ] Финализировать права moderator на auction (hide, cancel, ban bidder)
- [ ] Expand API: batch check в BFF middleware
- [ ] Sync Logto custom claims ↔ Keto (optional mirror)
- [ ] Integration tests: keto + BFF
- [ ] OPL / TypeScript SDK wrapper `@tavrida/keto-client`

---

## 🔗 Связанные документы

- [roles.md](../01-goal/roles.md)
- [moderator-mapping.md](./moderator-mapping.md)
- [bootstrap-admin.md](./bootstrap-admin.md)
- [BFF](../05-microservices/bff/README.md)
- [06-api](../06-api/README.md)

---

**Автор:** команда разработки · **Версия:** 0.1-draft
