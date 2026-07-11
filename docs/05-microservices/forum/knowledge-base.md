# 📖 Справочник клуба на движке форума

> **Статус:** spec ready · **Версия:** 0.1  
> **Контент-TЗ:** [content-brief.md](../../01-goal/content-brief.md) · **Юр. документы:** [legal-documents.md](../../01-goal/legal-documents.md)

Один микросервис **`forum`** обслуживает и обсуждения, и **статичные справочные материалы** — различие только в настройках **ветки категорий**.

---

## 🎯 Зачем

- Единый рендер **Markdown**, поиск, версии, модерация
- Не плодить CMS / отдельный wiki-сервис на MVP
- Эксперты и модераторы пишут в «своих» ветках ([ADR-007](../../03-architecture/adr/007-category-scoped-expert.md))

---

## 🌳 Политики на уровне категории (`category.policy`)

Поля на **любой узел** дерева категорий (наследуются вниз, override на дочерней ветке):

| Поле | Тип | Default | Описание |
|------|-----|---------|----------|
| `kind` | enum | `DISCUSSION` | `DISCUSSION` \| `DOCUMENTATION` \| `LEGAL` |
| `allowMemberTopics` | boolean | `true` | Member может создавать topic |
| `allowComments` | boolean | `true` | Комментарии к topic |
| `allowReactions` | boolean | `true` | Реакции (в LEGAL часто `false`) |
| `defaultTags` | uuid[] | `[]` | Автотеги для новых topic в ветке |
| `pinnedOrder` | int | — | Сортировка в меню справочника |

### Пресет `DOCUMENTATION` (справочник)

```json
{
  "kind": "DOCUMENTATION",
  "allowMemberTopics": false,
  "allowComments": false,
  "allowReactions": false
}
```

Только **admin**, **moderator** (scoped) или **expert** (scoped) создают и редактируют topic.

### Пресет `LEGAL`

Как `DOCUMENTATION` + `kind: LEGAL`, обязательный review legal перед publish.

### Пресет `DISCUSSION` (обычный форум)

Все `true` — стандартные лимиты plan-config.

### Комбинации (примеры)

| Сценарий | allowMemberTopics | allowComments |
|----------|-------------------|---------------|
| Открытая категория «Находки» | true | true |
| «Правила аукциона» (только staff пишет) | false | false |
| «FAQ» (staff пишет, все комментируют) | false | true |
| «Правовая информация» | false | false |

---

## 📝 Markdown в topic и comment

### Поддерживаемый subset (GFM)

| Элемент | Поддержка |
|---------|-----------|
| Заголовки `#`…`######` | ✅ |
| **Жирный**, *курсив*, `код` | ✅ |
| Списки, checkbox | ✅ |
| Ссылки `[text](url)` | ✅ (rel=nofollow external) |
| Таблицы | ✅ |
| Blockquote | ✅ |
| Fenced code blocks | ✅ + syntax highlight |
| Mermaid diagrams | ✅ в `DOCUMENTATION` / `LEGAL` |
| Raw HTML | ❌ |
| Images `![alt](url)` | ✅ MinIO uploads + whitelist |

### Pipeline

1. **Store:** `bodyMarkdown` (source) + `bodyHtml` (sanitized cache)
2. **Render:** unified/remark на write; invalidate cache on edit
3. **Preview:** в редакторе topic — live MD preview
4. **Справочник C-021:** живая демо-страница в форуме

Settings: `forum.markdown.sanitizeLevel` (`strict` | `documentation`).

---

## 🔐 Проверка прав (create topic / comment)

```
canCreateTopic(user, category):
  if !category.allowMemberTopics:
    return admin OR moderator(category) OR expert(category)
  return member AND limits OK AND !banned

canComment(user, topic):
  if !category.allowComments:
    return admin OR moderator(category) OR expert(category)
  return member AND ...
```

Keto: наследование moderator/expert от category ancestor ([moderator-mapping](../../09-security/moderator-mapping.md), [ADR-007](../../03-architecture/adr/007-category-scoped-expert.md)).

---

## 🔍 Поиск

- **MVP:** PostgreSQL FTS по `bodyMarkdown` / title
- **Post-MVP:** [OpenSearch ADR-008](../../03-architecture/adr/008-opensearch-full-text.md)

---

## 📨 События

Без отдельного сервиса — стандартные `forum.topic_created`, `forum.comment_created`.  
Подписки на обновления справочника: `subscriptions` + `FORUM_CATEGORY`.

---

**Связано:** [tags.md](./tags.md) · [requirements/README.md](./requirements/README.md)
