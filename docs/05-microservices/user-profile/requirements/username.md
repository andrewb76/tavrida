# 👤 Club handle (`username`) — через Logto

> **Статус:** draft · **Версия:** 0.2 · **Дата:** 2026-07-22  
> **Решение:** **SoT = Logto** · локальная копия в `user_profile` · **не** свой CRUD username в клубе  
> **Сервис:** [user-profile](../README.md) · **Потребитель:** [chat](../../chat/requirements/analysis.md)  
> **Ops:** [logto-setup](../../../14-frontend/logto-setup.md) · [logto-webhooks](../../../14-frontend/logto-webhooks.md)

## 🎯 Назначение

Публичный handle `@username` для @mention в чатах, поиска участников и ссылок на профиль.

| Вопрос | Ответ |
|--------|--------|
| Кто владеет username? | **Logto** (tenant-wide unique) |
| Где правит пользователь? | Logto **Account Center** `/account/username` (или шаг при sign-up) |
| Зачем `user_profile.username`? | **Denormalized cache** для autocomplete / списков без Management API на каждый keystroke |
| Свой `PATCH /profile/me/username`? | **Нет** в v1 |

Уже есть sync: webhook `User.Data.Updated` + `POST /me/identity` → `sync-logto` ([logto-webhooks](../../../14-frontend/logto-webhooks.md)).

---

## ✅ Решение (Logto-first)

### 1. Username policy (Console → Sign-in & account → Username policy)

| Параметр | Значение клуба | Зачем |
|----------|----------------|--------|
| Case sensitive | **выкл** | `Alice` = `alice` |
| Length | **min 3, max 32** | удобный handle (baseline Logto ≤ 128) |
| Allowed chars | letters + digits + `_` | совпадает с baseline Logto |

Baseline Logto: только `[A-Za-z0-9_]`, **не** начинается с цифры, ≤ 128.

Документация: [Username policy](https://docs.logto.io/end-user-flows/sign-up-and-sign-in/username-policy).

### 2. Когда задаётся username

**Рекомендация для invite-клуба (Type 4):**

Sign-up identifiers: **Email + Username** (+ password по политике клуба).

```text
Invite OTT (email) → Logto sign-up
  → verify email
  → выбрать username (unique, policy)
  → (password если включено)
  → member
```

Альтернатива (если не хотим username на первом экране):

- Sign-up только Email
- Затем **Collect user profile** / Account Center: поле username **required** до использования chat @mention
- Gate в SPA: `!username` → баннер «Задайте @ник» → deep-link Account Center

**v1 recommendation:** Email + Username на регистрации (меньше «дырявых» профилей без handle).

### 3. Смена username

| Канал | Поведение |
|-------|-----------|
| Account Center `/account/username` | Edit; Logto проверяет unique + policy |
| SPA | Кнопка «Изменить @ник» → `buildAccountCenterUrl()` + path `/account/username` + `redirect` |
| BFF | **не** пишет username в Logto (кроме admin/M2M later) |

Account Center field: **`username: Edit`** (сейчас branding script часто ставит `ReadOnly` — исправить).

Смена username → `User.Data.Updated` → webhook → `user_profile.username` обновляется.

**Rate-limit смены (1 раз / 30 дней):** в Logto нет — **не делаем в v1**. При необходимости later: soft-check в BFF перед deep-link (хранить `usernameChangedAt` в cache) или custom Account API wrapper.

### 4. Sign-in identifier

Username **может** быть способом входа (если включён в Sign-in methods). Для клуба допустимо:

- Sign-in: **Email** (основной) ± Username
- Username в первую очередь — **публичный handle**, не обязательно единственный login

### 5. Reserved slugs (`admin`, `mod`, …)

В Logto **нет** denylist username. Варианты:

| Вариант | v1 |
|---------|-----|
| A. Не блокируем | ✅ принять; редкие коллизии — admin rename через Management API |
| B. Soft-filter в autocomplete | скрывать reserved из выдачи (не мешает владеть ником) |
| C. Webhook reject | нельзя откатить Logto write из webhook |

**v1:** A (+ опционально B для UX). Список reserved — константа в chat/BFF, не scalar.

### 6. Gate для chat

| Действие | Нужен username? |
|----------|-----------------|
| Self-DM / plain message | нет |
| `@mention` в теле / быть target autocomplete | **да** (`user_profile.username` not null после sync) |
| Invite в GROUP по @ | да |

SPA: если JWT/userinfo без `username` — предложить Account Center до открытия composer с @.

---

## 🗄️ Данные

`user_profile.user_profile.username` — **cache**, SoT Logto.

| Поле | Тип | Описание |
|------|-----|----------|
| `username` | varchar nullable | Копия Logto `username` |
| *(optional)* unique index | `UNIQUE (lower(username)) WHERE username IS NOT NULL` | Ускоряет search; при рассинхроне — reconcile через `sync:logto-users` |

**Не добавляем** `usernameSetAt` / club-owned change window в v1.

Поиск autocomplete: `GET /internal/v1/users/search?q=` по `user_profile` (уже ILIKE по username) — не Logto Management list на каждый символ.

Resolve `@alice` → профиль: lookup by `lower(username)` в cache; miss → optional Management API backfill.

---

## 🔌 API (пересмотр)

| Было (отклонено) | Стало |
|------------------|--------|
| `PATCH /profile/me/username` | ❌ |
| Club validate unique | ❌ — Logto |
| `GET /profile/by-username/{username}` | ✅ optional convenience на BFF → user-profile cache |
| `GET /internal/v1/users/search?q=` | ✅ для @ autocomplete |
| Deep-link Account Center | ✅ frontend |

---

## 🛠️ Ops checklist (Logto Console / script)

> **Console:** username policy + sign-up + Account Center — **сделано** (2026-07-22).

1. [x] Username policy: case-insensitive, 3–32, letters+digits+`_`.
2. [x] Sign-up: Email + Username (Type 4) **или** Collect profile с required username.
3. [x] Account Center: `fields.username = Edit`.
4. [ ] Webhook `User.Data.Updated` — проверить, что username приходит в payload sync.
5. [ ] Backfill при необходимости: `pnpm sync:logto-users`.
6. [ ] Branding script на Swarm: `username → Edit` (если Console уже Edit — ок).

---

## ⚠️ Риски

| Риск | Митигация |
|------|-----------|
| Cache stale после смены ника | webhook + SPA `me/identity` на focus/login |
| User без username (старые аккаунты) | баннер + gate @mention; admin/M2M set username |
| Management API create user без policy | admin/invite scripts обязаны задавать valid unique username |
| Два источника правды | запретить club write username |

---

## 🔗 Связанное

- [chat @mention](../../chat/requirements/analysis.md#5-mention)
- [logto-webhooks](../../../14-frontend/logto-webhooks.md)
- [Account Center](https://docs.logto.io/end-user-flows/account-settings/by-account-center-ui)
- [Username policy](https://docs.logto.io/end-user-flows/sign-up-and-sign-in/username-policy)
