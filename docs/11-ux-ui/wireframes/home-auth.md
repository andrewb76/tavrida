# W01 — Лендинг и auth

> **Auth:** Logto PKCE · **Club gate:** [club-access.md](../../01-goal/club-access.md)

---

## W01 — Visitor (лендинг)

**Route:** `/` · **ID:** W01 · **MVP:** ✅

### Содержание экрана

| Зона | Элементы | Поведение |
|------|----------|-----------|
| Header | Logo, «Войти» | Login → Logto |
| Hero | Бренд Tavrida Lot (display), один заголовок, одна фраза, CTA | Static; full-bleed фон `tavrida-dark.webp` |
| CTA | «У меня есть инвайт» / регистрация, «О клубе», «Войти» | → `/join`, `/about`, Logto |
| Sections | «Три опоры» (аукционы · форум · маркет), «Как попасть» | Static copy |
| Footer | бренд + ссылки | legal TBD |

**States:** default (guest only). **Нет** bottom nav, live carousel, форума.

**Roles:** Visitor only.

**API:** static / `club.landing.publicSections` (settings, TBD).

### ASCII

```
┌─────────────────────────────────────┐
│ Logo                    [Войти]     │
├─────────────────────────────────────┤
│ Hero: «Клуб увлеченных историей людей» │
│ Закрытое сообщество — только        │
│ по приглашению                      │
│ [У меня есть инвайт]  [О клубе]     │
├─────────────────────────────────────┤
│ Блоки: about · rules · инвайт       │
├─────────────────────────────────────┤
│ Footer: legal                       │
└─────────────────────────────────────┘
```

### Component tree

```yaml
LandingPage:
  - LandingHeader
      - AppLogo
      - LoginButton → LogtoRedirect
  - LandingHero
      - HeroTitle
      - HeroSubtitle
      - InviteCtaButton → /invite
      - AboutLink
  - LandingSections
      - StaticSection (about, rules, invite-how)
  - LandingFooter
      - LegalLinks
```

---

## W01 — Member (home после входа)

**Route:** `/` или `/app` · **ID:** W01 · **MVP:** ✅

### Содержание экрана

| Зона | Элементы | Поведение |
|------|----------|-----------|
| Header | Logo, Inbox, Balance chip, Avatar | Inbox → subscriptions |
| Greeting | имя + быстрые чипы (аукционы / форум / маркет / кошелёк) | Static + session |
| Live | сетка ACTIVE лотов (до 6), skeleton / empty / retry | `GET /auctions?status=ACTIVE&sort=ENDING_SOON&limit=6` |
| Forum teaser | до 5 recent topics (list, не карточки) | `GET /forum/topics` |
| Bottom nav | Главная, Auctions, Forum, … | Mobile |

**States:** loading skeleton · empty carousel · error retry banner.

**Roles:** Member (`requireMember` guard).

**API:** `GET /auctions`, `GET /forum/topics?sort=recent&limit=3`, `GET /wallets/balance`.

### ASCII

```
┌─────────────────────────────────────┐
│ Logo          [Inbox] [Balance] [👤]│
├─────────────────────────────────────┤
│ 🔴 Live now (carousel)              │
│ [card][card][card]                  │
├─────────────────────────────────────┤
│ Новые на форуме (3 topics)          │
├─────────────────────────────────────┤
│ Home │ Auctions │ Forum │ Profile   │
└─────────────────────────────────────┘
```

### Component tree

```yaml
MemberHomePage:
  - AppHeader
      - NotificationBell
      - BalanceChip
      - UserMenu
  - LiveAuctionCarousel
      - AuctionCard (×N)
  - ForumTeaserList
      - TopicTeaserCard (×3)
  - AppBottomNav
```

---

## Auth & invite (flow)

1. **Новый участник:** `/join` (код `TAV-…` или ссылка) → Logto (one-time token) → `/callback` → `/app`
2. **Уже есть Logto:** «Войти» на лендинге → `/callback` → `/app`
3. Member = JWT Logto (ADR-012); реферал — `inviterId` при регистрации по invite
4. Session: `@logto/vue` + Pinia `session` (`isMember` ≡ authenticated)

---

## W11 — Инвайт (ввод кода)

**Route:** `/invite` · **ID:** W11 · **MVP:** ✅

### Содержание экрана

| Зона | Элементы | Поведение |
|------|----------|-----------|
| Header | Logo, «Назад» | → `/` |
| Form | Поле кода, «Продолжить» | Validate format client-side |
| Hint | Где взять код, ссылка «О клубе» | Static copy |
| Error | Неверный / использован / истёк | RFC 7807 `detail` |

**States:** default · validating · error · redirect to Logto (если не залогинен).

**Roles:** Visitor (до redeem) или Member (redeem доп. кода — edge, TBD).

**API:** `GET /api/v1/invites/resolve` до Logto, затем authenticated
`POST /api/v1/invites/claim`; код временно хранится в sessionStorage.

### ASCII

```
┌─────────────────────────────────────┐
│ ← Logo                              │
├─────────────────────────────────────┤
│ Введите код приглашения              │
│ ┌─────────────────────────────┐     │
│ │ TAV-XXXX-XXXX               │     │
│ └─────────────────────────────┘     │
│ [         Продолжить            ]   │
│ Нет кода? [О клубе]                 │
└─────────────────────────────────────┘
```

### Component tree

```yaml
InviteRedeemPage:
  - LandingHeader (minimal)
  - InviteCodeForm
      - InviteCodeInput
      - SubmitButton → LogtoRedirect | redeem API
  - InviteHelpText
  - FormErrorBanner
```

---

## W12 — О клубе

**Route:** `/about` · **ID:** W12 · **MVP:** ✅

### Содержание экрана

| Зона | Элементы | Поведение |
|------|----------|-----------|
| Header | Logo, «Войти» / «В клуб» | Auth-aware CTA |
| Content | Миссия, правила, как попасть | Static / CMS |
| CTA | «У меня есть инвайт» | → `/invite` |
| Footer | legal links | L-01…L-07 |

**States:** default only.

**Roles:** Visitor и Member (public page).

**API:** static / `club.about.sections` (settings, TBD).

### ASCII

```
┌─────────────────────────────────────┐
│ Logo                    [Войти]     │
├─────────────────────────────────────┤
│ О клубе · история · сообщество      │
│ Миссия · правила · сообщество       │
│ Как получить инвайт …               │
├─────────────────────────────────────┤
│ [      У меня есть инвайт         ] │
├─────────────────────────────────────┤
│ Footer: legal                       │
└─────────────────────────────────────┘
```

### Component tree

```yaml
AboutPage:
  - LandingHeader
  - AboutContentSections
      - MissionSection
      - RulesSection
      - HowToJoinSection
  - InviteCtaButton
  - LandingFooter
```

---

## W13 — Управление инвайтами

**Route:** `/invites` · **ID:** W13 · **MVP:** ✅

### Содержание экрана

| Зона | Элементы | Поведение |
|------|----------|-----------|
| Summary | Выдано / лимит plan-config | metadata из реализованных invites endpoints; отдельного `/invites/quota` нет |
| List | Код, статус, дата, redeem by | Copy to clipboard |
| Actions | «Создать инвайт» | Disabled at limit |
| Share | Copy link, native share (mobile) | `tavrida-lot.ru/invite?code=` |

**States:** loading · empty (нет выданных) · limit reached · error.

**Roles:** Member only (`invitesPerMonth` per plan-config).

**API:** `GET /invites`, `POST /invites`

### ASCII

```
┌─────────────────────────────────────┐
│ ← Мои инвайты                       │
├─────────────────────────────────────┤
│ Выдано: 2 / 3 в этом месяце         │
│ [      + Создать инвайт           ] │
├─────────────────────────────────────┤
│ TAV-A1B2 · активен · [Копировать]   │
│ TAV-C3D4 · использован user@…       │
└─────────────────────────────────────┘
```

### Component tree

```yaml
InvitesManagePage:
  - AppHeader
  - InviteQuotaSummary
  - CreateInviteButton
  - InviteCodeList
      - InviteCodeRow
          - CodeLabel
          - StatusBadge
          - CopyButton
          - ShareButton
  - EmptyInvitesState
```

### 🔗 Docs

- [platform-for-users](../../01-goal/platform-for-users.md)
- [bff](../../05-microservices/bff/README.md)

---

**IDs:** W01, W11, W12, W13
