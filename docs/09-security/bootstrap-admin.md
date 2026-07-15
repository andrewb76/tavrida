# 🚀 Bootstrap первого admin (день 0)

> **Статус:** spec ready · **Версия:** 0.1  
> **Связано:** [keto-schema.md](./keto-schema.md) · [roles.md](../01-goal/roles.md) · [invites-api.md](../05-microservices/bff/invites-api.md)

После старта платформы **нет ни одного admin** — ни в Logto, ни в Keto. Logto даёт только аутентификацию (JWT). Роль **admin** — tuple в **Ory Keto**.

---

## Последовательность

```mermaid
flowchart TD
  A[Logto: создать пользователя / первый вход] --> B[Скопировать Logto sub с /profile/me]
  B --> C[Поднять Keto локально]
  C --> D["pnpm grant:admin &lt;sub&gt;"]
  D --> E[Keto tuple platform#admin]
  E --> F[BFF: неограниченные POST /invites]
  F --> G[Раздать первые invite-ссылки]
```

| Шаг | Действие |
|-----|----------|
| 1 | Войти в SPA (Logto) — любой пользователь становится **member** по факту JWT |
| 2 | Открыть `/profile/me` — скопировать **Logto sub** (например `zox2u6bqqefb`) |
| 3 | Поднять Postgres + Keto: `docker compose -f docker/compose/infra.local.yml up -d` (или `pnpm keto:up`) |
| 4 | Назначить admin: `pnpm grant:admin <logto_sub>` |
| 5 | Перезапуск BFF не нужен — проверка при каждом `POST /invites` |

---

## Keto tuple

```text
namespace:  TavridaLot
object:     platform:tavrida-lot
relation:   admin
subject_id: user:{logtoSub}
```

См. [keto-schema.md](./keto-schema.md). OPL-модель: `docker/config/keto/namespaces.ts`.

---

## Команды

```bash
# Вся локальная infra (включая Keto)
docker compose -f docker/compose/infra.local.yml up -d

# Или только Keto (+ postgres/migrate при необходимости)
pnpm keto:up

# Первый admin — подставь свой Logto sub
pnpm grant:admin zox2u6bqqefb

# Проверка
curl -s "http://localhost:4466/relation-tuples/check?namespace=TavridaLot&object=platform:tavrida-lot&relation=admin&subject_id=user:zox2u6bqqefb"
# → {"allowed":true}
```

В `.env.local` должны быть `KETO_READ_URL` / `KETO_WRITE_URL` (см. `.env.example`).

---

## Как BFF использует admin

`POST /api/v1/invites` — лимит plan-config `club.member.invite.monthlyMax` (env `CLUB_INVITES_PER_MONTH` — fallback). **Пропускается**, если:

1. **Keto:** `platform:tavrida-lot#admin@user:{sub}` → `allowed: true`, или
2. **Env fallback:** `sub` в `CLUB_INVITES_UNLIMITED_ISSUER_IDS` (временный костыль без Keto).

Если Keto недоступен — BFF логирует warning и проверяет только env-список.

---

## Хранение (PostgreSQL)

| Параметр | Значение |
|----------|----------|
| Database | `tavrida_lot` |
| Schema | `keto` |
| DSN (docker) | `postgres://postgres:postgres@postgres:5432/tavrida_lot?sslmode=disable&search_path=keto` |
| Миграции | `keto migrate up` (автоматически в `infra.local.yml`) |
| Доступ сервисов | **только** Keto Read/Write API — не SQL из микросервисов |

При росте нагрузки — вынести в отдельную БД без смены API (смена DSN).

---

## Ограничения v0.1

| Тема | Статус |
|------|--------|
| Локальный Keto | ✅ Postgres schema `keto` в `tavrida_lot` |
| Admin API (`POST /admin/users/{sub}/roles`) | не реализован — только CLI bootstrap |
| Admin UI фаза 2 | назначение moderator/expert через UI — backlog |

---

## Следующие фазы

1. **Admin UI фаза 1** — `GET /api/v1/me/roles`, `/admin` во фронте, пункт «Админ» в header ✅
2. **Admin API** — `POST /api/v1/admin/users/{sub}/roles` (только существующий admin через Keto)
3. **Keto + Postgres** — персистентные tuples в local dev ✅ (`schema keto`)
4. **Admin UI фаза 2** — назначение moderator/expert/admin через UI

---

## Связанные документы

- [local-dev.md](../04-deployment/local-dev.md)
- [PLATFORM-SECRETS.md](../02-infrastructure/PLATFORM-SECRETS.md)
- [moderator-mapping.md](./moderator-mapping.md)

---

**Автор:** команда разработки · **Версия:** 0.1
