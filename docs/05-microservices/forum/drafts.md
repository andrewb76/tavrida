# Черновики тем (topic draft)

> **Статус:** implemented · **Версия:** 1.0 · **Дата:** 2026-07-21  
> **Сервис:** [forum/README.md](./README.md) · UI: [wireframes/forum.md](../../11-ux-ui/wireframes/forum.md)

## Цель

Автор может сохранить тему **не публикуя**: доработать текст, вложения и теги. Черновик **не виден** другим, к нему **нельзя** комментировать / голосовать / реагировать. После публикации **нельзя** вернуть статус `DRAFT`.

## Правила (SoT)

| Правило | Поведение |
|---------|-----------|
| Видимость | `DRAFT` — только автор (GET чужим → **404**, не 403) |
| Список | Публичный `GET /forum/topics` — только `PUBLISHED` |
| Мои черновики | `GET /forum/topics?status=DRAFT` (JWT) — только темы текущего пользователя |
| Создание | `POST` с `status: DRAFT \| PUBLISHED` (default **`PUBLISHED`** — совместимость) |
| Публикация | `PATCH` `{ "status": "PUBLISHED" }` только из `DRAFT` |
| Unpublish | **Запрещён** (`PUBLISHED` → `DRAFT` → 400) |
| Редактирование | Автор может править `DRAFT` **без** `editWindowMinutes`; после публикации окно от `publishedAt` |
| Комментарии | POST к `DRAFT` → 400; GET чужим → 404 |
| Голоса / реакции | На `DRAFT` topic → 400 |
| Теги | Автор может ставить на черновик; **`tag.content_tagged` не шлётся** до публикации |
| Pin / subscribe | Не применимо к черновику (публичные списки не содержат DRAFT) |
| Promote comment → topic | Новая тема сразу `PUBLISHED` |

## Модель данных

```text
forum.topic.status       varchar  DRAFT | PUBLISHED  (default PUBLISHED)
forum.topic.published_at timestamptz NULL  — момент первой публикации
```

Миграция бэкфилла: существующие строки → `PUBLISHED`, `published_at = created_at`.

## API

| Method | Path | Notes |
|--------|------|--------|
| GET | `/forum/topics` | `?categoryId=` · только published |
| GET | `/forum/topics?status=DRAFT` | JWT · mine only |
| POST | `/forum/topics` | body.`status` optional |
| GET | `/forum/topics/{id}` | draft → author only |
| PATCH | `/forum/topics/{id}` | title/body/attachments и/или `status: PUBLISHED` |

Ответ темы включает `status`, `publishedAt` (ISO или `null`).

## UX

| Экран | Поведение |
|-------|-----------|
| `/forum/new` | «Сохранить черновик» + «Опубликовать» |
| `/forum` | Ссылка «Мои черновики» |
| `/forum/topics/:id` (draft) | Бейдж «Черновик»; нет формы комментария / vote / reaction; кнопки сохранить + опубликовать |

## Нюансы и решения v1

1. **404 vs 403** — 404, чтобы не подтверждать существование чужого черновика по UUID.
2. **Лимит postsPerDay** — считать только `PUBLISHED` (когда лимит появится в коде).
3. **Модераторы / admin** — в v1 **не** видят чужие черновики; при необходимости LEGAL-review — отдельный поток (`category.policy`), не общий draft.
4. **Удаление черновика** — не в v1; кандидат: hard-delete только `DRAFT` автором.
5. **События** — `forum.topic_created` (когда появится producer) только при переходе в `PUBLISHED`, не при создании DRAFT.
6. **Вложения в MinIO** — объекты могут появиться до публикации; ок для v1 (URL не светится в публичных списках). Cleanup orphan — later.
7. **SEO / tag pages** — списки по тегу должны фильтровать `PUBLISHED` (как общий list).

## План внедрения

| Шаг | Что |
|-----|-----|
| 1 | Docs (этот файл) + README / index |
| 2 | Migration + entity |
| 3 | TopicsService ACL, create/update/list/publish |
| 4 | Comments / votes block draft |
| 5 | Tags: skip outbox until publish; flush on publish |
| 6 | BFF query/DTO |
| 7 | Frontend new / list / topic |

## Вне scope v1

- Autosave / debounce draft
- Scheduled publish
- Collaborative drafts
- Soft-delete / archive
