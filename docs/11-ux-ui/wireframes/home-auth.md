# W01 — Лендинг и auth

> **Маршруты:** `/` (visitor) · `/invite` · `/callback` · **Auth:** Logto redirect

## Layout (Visitor — лендинг)

```
┌─────────────────────────────────────┐
│ Logo                    [Войти]     │
├─────────────────────────────────────┤
│ Hero: «Клуб находок Крыма»          │
│ Закрытое сообщество — только        │
│ по приглашению                      │
│ [У меня есть инвайт]  [О клубе]     │
├─────────────────────────────────────┤
│ Блоки: about · rules · как получить │
│ инвайт (static / CMS TBD)           │
├─────────────────────────────────────┤
│ Footer: legal                       │
└─────────────────────────────────────┘
```

**Нет** live-карусели лотов, форума и bottom nav — только после member.

## Layout (Member — home после входа)

```
┌─────────────────────────────────────┐
│ Logo          [Inbox] [Balance] [👤]│
├─────────────────────────────────────┤
│ 🔴 Live now (carousel)              │
│ [card][card][card]                  │
├─────────────────────────────────────┤
│ Новые на форуме (3 topics)          │
├─────────────────────────────────────┤
│ Bottom nav (mobile)                 │
└─────────────────────────────────────┘
```

## Blocks

| Block | Data | Empty | Audience |
|-------|------|-------|----------|
| Landing sections | static / `club.landing.publicSections` | — | Visitor |
| Live carousel | `GET /auctions?status=ACTIVE&limit=6` | «Нет активных торгов» | Member |
| Forum teaser | `GET /forum/topics?sort=recent&limit=3` | link to forum | Member |
| Balance chip | `GET /wallets/balance` | hidden guest | Member |

## Auth & invite

1. Visitor → «У меня есть инвайт» → `/invite` (поле кода)
2. Logto PKCE → `/callback`
3. `POST /api/v1/invites/redeem` — без успеха member **не** видит club routes
4. Post-redeem redirect → `/auctions` или `returnTo`
5. Session: `@logto/vue` + Pinia `session` (`isMember`, `inviterId`)

## States

- Loading: skeleton (member feeds only)
- Error: retry banner on feeds
- Pending invite: экран «Введите код» после Logto

## 🔗 API / docs

- [club-access.md](../../01-goal/club-access.md)
- [BFF routing](../../05-microservices/bff/README.md)
- [platform-for-users](../../01-goal/platform-for-users.md)

---

**ID:** W01
