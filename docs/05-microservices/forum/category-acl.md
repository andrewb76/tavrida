# Forum category ACL (allowlist)

> **Статус:** implemented · **Дата:** 2026-07-23  
> **Сервис:** [forum/README.md](../README.md)

## Правило

| Состояние allowlist категории | Кто видит / пишет в ветке |
|-------------------------------|---------------------------|
| **Пустой** (нет строк) | Все (гость / member) |
| **Непустой** | Только пользователи из списка **и** platform **admin** |

Модератор платформы **не** обходит allowlist (только admin).  
ACL **на узел**: каждый category со своим списком; скрытый узел не попадает в дерево для зрителя (дети без родителя в UI не показываются).

## Хранение

Таблица `forum.category_allowed_user`:

| Column | Type |
|--------|------|
| `category_id` | uuid PK, FK → category ON DELETE CASCADE |
| `user_id` | varchar(128) PK (Logto `sub`) |

Пустая таблица для category ⇒ публичная.

## API

| Method | Path | Кто | Описание |
|--------|------|-----|----------|
| GET | `/api/v1/forum/categories` | optional JWT | Дерево с учётом ACL; admin видит всё + `allowedUserIds` / `restricted` |
| PUT | `/api/v1/admin/forum/categories/{id}/members` | admin | Заменить allowlist `{ "userIds": string[] }` (`[]` = снова всем) |
| GET | `/api/v1/admin/forum/categories/{id}/members` | admin | Текущий список |

Топики в закрытой категории: list/get/create → `403` / исключение из ленты для чужих.

## UI

`/forum/categories` — у admin кнопка «Доступ» → управление списком userId (через поиск участников / ввод id).

**Связано:** [knowledge-base.md](../knowledge-base.md) (write policies ≠ ACL) · [keto-schema.md](../../../09-security/keto-schema.md) (это **не** Keto)
