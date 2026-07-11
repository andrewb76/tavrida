# W07–W08–W10 — Профиль, кошелёк, отзыв

---

## W07 — Профиль

**Route:** `/profile/:userId` · `/profile/me` · **ID:** W07 · **MVP:** ✅

### Содержание экрана

| Зона | Элементы | Поведение |
|------|----------|-----------|
| Header card | Avatar, name, bio | Public |
| Stats | Rating, deals, karma, heatmap | BFF aggregate |
| Tabs | Аукционы, Форум, Услуги | Activity lists |
| Owner | Edit bio/avatar | `PATCH /profile/me` |
| Private note | On **other** profiles | Author-only, invisible to others |

**States:** loading · user not found · banned badge.

**API:** `GET /profile/{id}`

### ASCII

```
┌─────────────────────────────────────┐
│ [Avatar]  displayName               │
│ ★ 4.8 · 20 сделок · karma 128       │
│ ░░ heatmap (activity grid)          │
├─────────────────────────────────────┤
│ [ Аукционы ] [ Форум ] [ Услуги ]   │
│ Activity list …                     │
└─────────────────────────────────────┘
```

### Component tree

```yaml
ProfilePage:
  - ProfileHeader
      - Avatar
      - DisplayName
      - Bio
      - RatingStats
      - KarmaBadge
      - ActivityHeatmap
  - ProfileTabs
      - AuctionActivityList
      - ForumActivityList
      - MarketplaceActivityList
  - ProfileEditForm (owner)
  - PrivateNoteWidget (viewer ≠ subject)
```

---

## W08 — Кошелёк и тарифы

**Route:** `/wallet` · `/plans` · **ID:** W08 · **MVP:** ✅

### Содержание экрана

| Зона | Элементы | Поведение |
|------|----------|-----------|
| Balance | Amount RUB, «Пополнить» | `GET /wallets/balance` |
| Plan | Current tier, renew date | `GET /plans/subscription` |
| Actions | Upgrade, auto-renew toggle | Charge via billing |
| History | Transactions cursor | |
| Plans page | Free / Basic / Pro cards | [PLATFORM-REGISTRY](../../05-microservices/PLATFORM-REGISTRY.md) |

**States:** low balance warning · charge failed · WS `balance.updated`.

**API:** billing, plan-config; activate → charge → toast.

### ASCII

```
┌─────────────────────────────────────┐
│ Баланс: 1 250 ₽                     │
│ [Пополнить]                         │
├─────────────────────────────────────┤
│ План: Basic до 01.08 · Auto-renew ✓ │
│ [Upgrade Pro]                       │
├─────────────────────────────────────┤
│ История операций                    │
│ +500 ₽ deposit · −99 ₽ plan        │
└─────────────────────────────────────┘
```

### Component tree

```yaml
WalletPage:
  - WalletBalanceCard
      - DepositButton
  - SubscriptionSummary
      - PlanBadge
      - AutoRenewToggle
      - UpgradeLink → /plans
  - TransactionHistoryList

PlansPage:
  - PlanComparisonCards
      - PlanCard (Free, Basic, Pro)
      - ActivatePlanButton
```

---

## W08 — Modal: пополнение баланса

**Route:** modal (на `/wallet`) · **ID:** W08 · **MVP:** ✅

### Содержание экрана

| Зона | Элементы | Поведение |
|------|----------|-----------|
| Presets | 500 / 1000 / 2000 / custom ₽ | Min amount from plan-config |
| Summary | Итого к оплате | |
| Confirm | «Перейти к оплате» | Redirect payment provider |
| Cancel | Закрыть | |

**States:** redirecting · payment cancelled return.

**API:** `POST /wallets/deposit` → payment URL.

### ASCII

```
┌─────────────────────────────────────┐
│ Пополнение баланса                  │
│ [ 500 ] [ 1000 ] [ 2000 ] [ Своя ]  │
│ Сумма: 1 000 ₽                      │
│ [      Перейти к оплате           ]   │
└─────────────────────────────────────┘
```

### Component tree

```yaml
DepositModal:
  - DepositAmountPresets
  - CustomAmountInput
  - DepositSummary
  - ProceedToPaymentButton
```

---

## W08 — Modal: активация тарифа

**Route:** modal (на `/plans`) · **ID:** W08 · **MVP:** ✅

### Содержание экрана

| Зона | Элементы | Поведение |
|------|----------|-----------|
| Plan | Выбранный тариф, цена, период | From PlanCard |
| Balance | Списание с кошелька | Show remainder |
| Auto-renew | Checkbox default on | plan-config setting |
| Confirm | «Активировать» | Charge billing |

**States:** insufficient balance → link deposit · success toast.

**API:** `POST /plans/subscribe`

### ASCII

```
┌─────────────────────────────────────┐
│ Активировать Basic                  │
│ 99 ₽ / мес · списание с баланса     │
│ Баланс после: 1 151 ₽               │
│ ☑ Автопродление                     │
│ [         Активировать            ]   │
└─────────────────────────────────────┘
```

### Component tree

```yaml
ActivatePlanModal:
  - PlanSummary
  - BalanceAfterCharge
  - AutoRenewCheckbox
  - ActivateButton
  - InsufficientBalanceHint → DepositModal
```

---

## W10 — Отзыв после сделки

**Route:** modal · deep link `/feedback?dealType=…` · **ID:** W10 · **MVP:** ✅

### Содержание экрана

| Зона | Элементы | Поведение |
|------|----------|-----------|
| Context | Deal title (auction/order) | From notification |
| Checklist | Товар получен, оплата получена | Both parties |
| Rating | 1–5 stars | Required |
| Comment | Text + optional photo | Bonuses early/photo |
| Submit | | `POST /deal-feedback` |

**States:** already submitted · expired deal · reminder from Novu.

**API:** deal-feedback, rating karma bonuses.

### ASCII

```
┌─────────────────────────────────────┐
│ Отзыв по сделке                     │
│ Лот «Монета 1787»                   │
│ □ Товар получен  □ Оплата получена  │
│ ★★★★★                               │
│ Comment …                           │
│ [+ Фото]                            │
│ [        Отправить отзыв          ] │
└─────────────────────────────────────┘
```

### Component tree

```yaml
DealFeedbackModal:
  - DealFeedbackHeader
  - DealChecklist
  - StarRatingInput
  - CommentField
  - PhotoUploadOptional
  - SubmitFeedbackButton
  - BonusHints (early, photo)
```

### 🔗 Docs

- [deal_feedback](../../05-microservices/deal_feedback/README.md)
- [rating](../../05-microservices/rating/README.md)

---

**IDs:** W07, W08, W10
