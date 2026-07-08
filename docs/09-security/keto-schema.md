# 🔐 Ory Keto — schema авторизации

> **Статус:** draft · **Версия:** 0.1  
> **Связано:** [roles.md](../01-goal/roles.md) · [09-security](./README.md)

Namespace: `TavridaLot` (Ory Keto v0.11+).  
**Лимиты тарифов** — через financial-policy, **не** через Keto.

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
| `post` | `{postId}` | `owner`, `moderator` | Пост/тема форума |
| `comment` | `{commentId}` | `owner`, `moderator` | Комментарий |
| `report` | `{reportId}` | `viewer` | Жалоба (moderator+) |

---

## 🧩 Форумные роли модерации (naming)

Для форумной области используем отдельные роли модератора:

- `ForumModerator`
- `ForumModerator:CategoryId:{id}`
- `ForumModerator:TopicId:{id}`
- `ForumModerator:CommentId:{id}`

`ForumModerator` — глобальный доступ ко всему форумному контенту, scoped-варианты — доступ только к соответствующему объекту и его дочернему дереву.

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
post:{postId}#owner@user:{authorId}
post:{postId}#moderator@platform:tavrida-lot#moderator
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
| Moderate forum post | `post:{id}#moderator@user:{id}` OR platform moderator | 403 |
| Moderate auction (hide lot) | `auction:{id}#moderator@user:{id}` OR platform moderator | 403 |
| Edit own post | `post:{id}#owner@user:{id}` | 403 |
| Edit auction (seller) | `auction:{id}#owner@user:{id}` | 403 |
| Add expert appraisal | `platform:tavrida-lot#expert@user:{id}` + not `auction:{id}#owner` | 403 |
| Place bid | `platform:tavrida-lot#member@user:{id}` + financial-policy limits + rating ban | 403/402 |
| Create auction | `platform:tavrida-lot#member@user:{id}` + FP limits | 403 |

> **Moderator + аукционы:** может просматривать жалобы на лоты, скрывать/восстанавливать лот, блокировать ставки пользователя на конкретном лоте. Не может менять баланс, тарифы, назначать admin. *(уточняется)*

---

## 🚫 Что НЕ в Keto

| Проверка | Где |
|----------|-----|
| `forum.postsPerDay`, `auction.activeAuctions` | financial-policy `limits/check` |
| Рейтинговый бан | rating `check-ban` |
| Pro-фичи | financial-policy `features/can-use` |
| Достаточно баланса | billing |

---

## 🔄 Жизненный цикл tuples

| Событие | Действие Keto |
|---------|---------------|
| User registered | `+ platform#member@user` |
| Admin assigns moderator | `+ platform#moderator@user` |
| Admin assigns expert | `+ platform#expert@user` |
| Admin removes expert | `- platform#expert@user` |
| Admin removes moderator | `- platform#moderator@user` |
| Auction created | `+ auction#owner@user`, `+ auction#viewer@platform#member` |
| Auction deleted | `- all tuples for auction:{id}` |
| Post created | `+ post#owner@user` |

---

## 📋 TODO

- [ ] Финализировать права moderator на auction (hide, cancel, ban bidder)
- [ ] Expand API: batch check в BFF middleware
- [ ] Sync Logto custom claims ↔ Keto (optional mirror)
- [ ] Integration tests: keto + BFF
- [ ] OPL / TypeScript SDK wrapper `@tavrida/keto-client`

---

## 🔗 Связанные документы

- [roles.md](../01-goal/roles.md)
- [BFF](../05-microservices/bff/README.md)
- [06-api](../06-api/README.md)

---

**Автор:** команда разработки · **Версия:** 0.1-draft
