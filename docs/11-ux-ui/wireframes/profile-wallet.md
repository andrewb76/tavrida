# W07–W08–W10 — Профиль, кошелёк, отзыв

## Профиль

**Route:** `/profile/:userId` · `/profile/me`

```
┌─────────────────────────────────────┐
│ Avatar · displayName · bio          │
│ ★ 4.8 · 20 сделок · karma (forum)   │
├─────────────────────────────────────┤
│ Tabs: Аукционы | Форум | Услуги     │
├─────────────────────────────────────┤
│ List of user's public activity      │
└─────────────────────────────────────┘
```

| Private (owner) | Note |
|-----------------|------|
| Edit bio/avatar | `PATCH /profile/me` |
| Private note on other user | Only on **their** profile, author-only visibility |

Others never see `ProfileNote`.

**API:** `GET /profile/{id}`; BFF agg rating fields

---

## Кошелёк

**Route:** `/wallet` · `/plans`

```
┌─────────────────────────────────────┐
│ Balance: 1 250 ₽                    │
│ [Пополнить]                         │
├─────────────────────────────────────┤
│ Текущий план: Basic до 01.08        │
│ [Upgrade Pro] [Auto-renew ✓]        │
├─────────────────────────────────────┤
│ Transaction history (cursor)        │
└─────────────────────────────────────┘
```

Plans page (`/plans`): cards Free / Basic / Pro — features from [PLATFORM-REGISTRY](../../05-microservices/PLATFORM-REGISTRY.md).

Activate flow: confirm → charge → toast; WS `balance.updated` updates header chip.

---

## Отзыв

**Modal / drawer** (deep link `/feedback?dealType=auction&auctionId=`)

```
┌─────────────────────────────────────┐
│ Сделка: лот «Монета 1787»           │
│ □ Товар получен  □ Оплата получена  │
│ Rating ★★★★★                        │
│ Comment                             │
│ [Фото] optional                     │
│ [Отправить]                         │
└─────────────────────────────────────┘
```

Triggered from Novu + pending badge on profile.

Post-submit: bonus hints (early, photo) from [rating](../../05-microservices/rating/README.md).

---

**IDs:** W07, W08, W10
