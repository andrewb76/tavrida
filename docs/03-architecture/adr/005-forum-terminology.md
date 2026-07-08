# ADR-005: Форум — терминология сущностей

> **Статус:** accepted · **Дата:** 2026-07-08

## 🎯 Контекст

В документации форума смешивались термины `post`, `topic`, `comment`, «тема», «топик». Это ломает модель данных, Keto object types, API paths и event payloads.

## ✅ Решение

### Канонические сущности (schema `forum`)

| Сущность | Таблица | Описание |
|----------|---------|----------|
| **Category** | `category` | Дерево разделов форума |
| **Topic** | `topic` | Корень обсуждения (заголовок + первый пост) |
| **Comment** | `comment` | Ответ в ветке; иерархия через closure table |
| **Reaction** | `reaction` | Эмодзи-реакция на topic **или** comment |
| **TopicClosure** | `comment_closure` | Родство comment → ancestor (closure table) |

### Deprecated

| Термин | Статус | Замена |
|--------|--------|--------|
| **`post`** | **deprecated** | `topic` или `comment` по контексту |
| **`post_closure`** | **deprecated** | `comment_closure` |
| **`postId` в API/events** | **deprecated** | `contentId` + `contentType: 'topic' \| 'comment'` |

### Registry keys `forum.postsPerDay` и т.п.

Префикс `forum.` в [PLATFORM-REGISTRY](../../05-microservices/PLATFORM-REGISTRY.md) — **имя домена**, не имя сущности.  
Переименование ключей (`forum.topicsPerDay`) **не делаем** без миграции FP — в README сервиса явно указать: «postsPerDay = лимит создания topic + comment».

### Promote comment → topic

Принят **алгоритм A** ([forum/requirements](../../05-microservices/forum/requirements/README.md)):

1. Новый `topic` с текстом комментария.
2. Прямые дети комментария → родитель = новый topic.
3. Исходный комментарий **остаётся** в старом topic с `promotedTopicId`.
4. Оба topic **равноправны**, живут независимо.

Ветка **не удаляется** из исходного topic.

## 🔄 Альтернативы

| Вариант | Плюсы | Минусы |
|---------|-------|--------|
| Один тип `post` (flat) | Проще | Плохо для UI «тема vs ответ» |
| `post` = topic, comment отдельно | Близко к старому | Путаница «post в теме» |
| **topic + comment** | Ясная иерархия, Keto, UX | Нужна миграция терминов в docs |

## 📌 Последствия

- ✅ Обновить `10-data`, `06-api`, `event-catalog`, forum requirements
- ✅ Keto: только `category`, `topic`, `comment` ([keto-schema](../../09-security/keto-schema.md))
- ✅ Новый код/API — без `post`; legacy упоминания помечать deprecated
- ⚠️ UI может показывать «сообщение» как umbrella term — не путать с entity `post`

## 🔗 Связанные документы

- [moderator-mapping.md](../../09-security/moderator-mapping.md)
- [forum/requirements](../../05-microservices/forum/requirements/README.md)
- [keto-schema.md](../../09-security/keto-schema.md)
