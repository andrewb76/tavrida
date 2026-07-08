# 👮 Модераторы — единая модель (UX ↔ Logto ↔ Keto)

> **Статус:** accepted · **Версия:** 0.1  
> **Связано:** [roles.md](../01-goal/roles.md) · [keto-schema.md](./keto-schema.md) · [ADR-005](../03-architecture/adr/005-forum-terminology.md)

Единый источник истины для **назначения и проверки** прав модератора. Три слоя — одна семантика.

---

## 🎯 Принципы

1. **Назначает и снимает только Admin** — модераторы **не делегируют** роли другим пользователям.
2. **Главный модератор** — без scope; **областной** — на объект и все вложенные.
3. **Несколько модераторов на объект** — допускается (scoped + унаследованные от предков + главный).
4. **Forum vs auction** — главный `platform#moderator` действует на оба домена (см. [roles.md](../01-goal/roles.md)); scoped tuples — **только форум**.

---

## 📊 Таблица соответствий

### Форум

| UX (доки, UI) | Logto custom role / claim | Keto tuple | Область |
|---------------|---------------------------|------------|---------|
| `Модератор` (главный) | `ForumModerator` | `platform:tavrida-lot#moderator@user:{id}` | Весь форум + аукционы (platform mod) |
| `Модератор:category:{id}` | `ForumModerator:CategoryId:{id}` | `category:{id}#moderator@user:{id}` | Категория + поддерево |
| `Модератор:topic:{id}` | `ForumModerator:TopicId:{id}` | `topic:{id}#moderator@user:{id}` | Topic + комментарии ветки |
| `Модератор:comment:{id}` | `ForumModerator:CommentId:{id}` | `comment:{id}#moderator@user:{id}` | Comment + ответы в поддереве |
| Admin | `Admin` (platform) | `platform:tavrida-lot#admin@user:{id}` | Всё + назначение модераторов |

> **Logto** хранит claims для UI и audit; **Keto** — source of truth для `Check` в BFF/сервисах. Sync: admin action → write Keto tuple → optional Logto claim mirror.

### Аукцион (без scoped tuples на MVP)

| Действие | Keto check |
|----------|------------|
| Hide lot, ban bidder on lot | `auction:{id}#moderator@user:{id}` OR `platform:tavrida-lot#moderator@user:{id}` |
| Assign auction-scoped mod | **Не используем на MVP** — только platform moderator |

---

## ✅ Проверка права (forum)

Пользователь может модерировать объект, если **любое** из:

1. `platform:tavrida-lot#admin@user:{id}`
2. `platform:tavrida-lot#moderator@user:{id}` (главный)
3. `{type}:{id}#moderator@user:{id}` на целевом объекте
4. `{ancestorType}:{ancestorId}#moderator@user:{id}` на любом предке (category → topic → comment)

---

## 🔀 Назначение (только Admin)

```text
# Главный модератор форума / platform
+ platform:tavrida-lot#moderator@user:{moderatorId}

# Областной (один из типов)
+ category:{categoryId}#moderator@user:{moderatorId}
+ topic:{topicId}#moderator@user:{moderatorId}
+ comment:{commentId}#moderator@user:{moderatorId}

# Снятие — symmetric delete tuple
```

**Запрещено:** `+ …#moderator@user:{id}` от имени пользователя без `platform#admin`.

---

## 🔗 Связанные документы

- [roles.md](../01-goal/roles.md)
- [keto-schema.md](./keto-schema.md)
- [forum/requirements](../05-microservices/forum/requirements/README.md)
