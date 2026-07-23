# Forum category ACL (группы доступа)

> **Статус:** implemented · **Дата:** 2026-07-23  
> **Сервис:** [forum/README.md](../README.md)

## Правило

| Связанные группы категории | Кто видит / пишет в ветке |
|----------------------------|---------------------------|
| **Нет** (пусто) | Все (гость / member) |
| **Есть ≥1** | Участник **любой** из связанных групп (**OR**) **или** platform **admin** |

Модератор платформы **не** обходит ACL (только admin).  
ACL **на узел**: каждый category со своим набором групп; скрытый узел не попадает в дерево для зрителя.

Модель как Linux-группы: пользователь ∈ группы; категория ссылается на группы.

## Хранение

| Таблица | Назначение |
|--------|-------------|
| `forum.access_group` | Группа (`id`, `name` unique, `description`) |
| `forum.access_group_member` | `(group_id, user_id)` — состав |
| `forum.category_access_group` | `(category_id, group_id)` — OR-связь с категорией |

Таблица `category_allowed_user` **удалена** (user-allowlist не используется).

## API

| Method | Path | Кто | Описание |
|--------|------|-----|----------|
| GET | `/api/v1/forum/categories` | optional JWT | Дерево с ACL; admin: `accessGroupIds` / `restricted` |
| GET/POST | `/api/v1/admin/forum/access-groups` | admin | Список / создать |
| PATCH/DELETE | `/api/v1/admin/forum/access-groups/{id}` | admin | Имя/описание / удалить |
| GET/PUT | `/api/v1/admin/forum/access-groups/{id}/members` | admin | Состав `{ "userIds": string[] }` |
| GET/PUT | `/api/v1/admin/forum/categories/{id}/access-groups` | admin | Привязка `{ "groupIds": string[] }` (`[]` = снова всем) |

Топики в закрытой категории: list/get/create → `403` / исключение из ленты для чужих.

## UI

- `/admin/access-groups` — CRUD групп и состав участников.
- `/forum/categories` — у admin «Доступ» → мультивыбор групп (не userId).

**Связано:** [knowledge-base.md](../knowledge-base.md) · [keto-schema.md](../../../09-security/keto-schema.md) (это **не** Keto)
