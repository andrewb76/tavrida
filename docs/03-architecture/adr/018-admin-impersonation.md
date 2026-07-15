# ADR-018: Admin impersonation (X-Act-As)

> **Статус:** accepted · **Дата:** 2026-07-16

## Контекст

Админам нужно воспроизводить UX и права конкретного участника (поддержка, QA) без логина под его паролем/OTP.

## Решение

1. **Механизм:** stateless header `X-Act-As: {targetUserId}` на запросах к BFF. JWT Logto **не** меняется (остаётся `sub` админа).
2. **BFF:** после verify JWT, если заголовок есть:
   - реальный `sub` должен быть platform admin (Keto / bootstrap env);
   - target **не** должен быть admin;
   - `request.user = { sub: targetUserId, actorSub: adminUserId }`.
3. **Эффективный пользователь** для доменной логики / ownership / `GET /me/roles` = `user.sub` (target).
4. **Frontend:** session хранит `actAsUserId` + display names; все BFF `fetch` добавляют `X-Act-As`; sticky banner «Админ X → как Y» + «Выйти».
5. **Старт UI:** `/admin/users` → «Подключиться».

## Последствия

- Пока impersonation активен, `isAdmin` / admin-routes отражают **target** (обычно без admin) — выход только через banner.
- Каждый запрос с `X-Act-As` заново проверяет, что JWT-subject — admin (нельзя подделать заголовок без admin JWT).
- Audit: structural log `actorSub` + `sub` на resolve; опционально явный start log из UI.
- Не имперсонировать других админов (защита от privilege hopping).

## Альтернативы (отклонены)

| Вариант | Почему нет |
|---------|------------|
| Mint custom JWT | Logto не выдаёт act-as; своя крипта |
| Cookie/session в BFF | Лишний state, CSRF |
| Trusted client `X-User-Id` без admin check | Небезопасно (ADR-010) |

## Связанные docs

- [impersonation.md](../../09-security/impersonation.md)
- [ADR-010](./010-jwt-validation-traefik.md) — не путать с edge `X-User-Id`
