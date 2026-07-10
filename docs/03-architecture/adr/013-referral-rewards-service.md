# ADR-013: Денежные реферальные вознаграждения — сервис `referral-rewards`

> **Статус:** accepted · **Дата:** 2026-07-10

## 🎯 Контекст

Tavrida Lot — **закрытый клуб**: каждый member приходит по инвайту, `inviterId` сохраняется в `user-profile`. В `rating` уже есть **репутационный** referral (влияние кармы/рейтинга приглашённых на effective metrics inviter).

Продукт хочет **опциональный денежный слой**: вознаграждение за монетизацию сети (подписки, разовые платежи платформе), с **гибкой настройкой** через `settings` и `financial-policy`, без хардкода схем в коде.

Триггер — события биллинга о **списаниях** (`billing.charge_completed`) и, опционально, регистрация по инвайту.

## ✅ Решение

1. Новый микросервис **`referral-rewards`** (schema `referral_rewards`).
2. **Source of truth** графа — `user-profile` (`inviterId`); сервис **не дублирует** дерево, запрашивает цепочку предков internal API.
3. **Rule engine**: правила начисления — JSON в settings `referralRewards.rules`; лимиты и множители по тарифу — financial-policy `referralRewards.*`.
4. **Event-driven**: consume `billing.charge_completed`, `billing.refund_completed`, `invitation.redeemed`; produce `referral.reward_accrued`, `referral.reward_paid`, `referral.reward_reversed`.
5. **Выплата** — internal `POST /wallets/credit` в billing (расширение billing: тип `CREDIT` / platform credit), после `holdDays`.
6. **Idempotency** — уникальность accrual по `(sourceEventId, ruleId, beneficiaryUserId, depth)`.
7. **Глобальный kill switch** — `referralRewards.globalEnabled = false` по умолчанию.
8. **Глубина и бонус invitee** — только через settings (`maxDepth`, `depthCoefficients`, `inviteeBonus.*`).
9. **Категории платежей** — whitelist `enabledChargeCategories` incl. `MARKETPLACE_SERVICES` (платформе, не заказ); каталог в [charge-categories.md](../../05-microservices/referral-rewards/requirements/charge-categories.md).
10. **GMV сделок исключён** — нет % от цены лота / заказа между участниками ([legal-scope.md](../../05-microservices/referral-rewards/requirements/legal-scope.md)).

### Граница с rating

| | `rating` | `referral-rewards` |
|---|----------|-------------------|
| Метрика | karma, rating | ₽ на балансе |
| Settings | `rating.referral.*` | `referralRewards.*` |
| Триггер | `rating.updated`, `invitation.redeemed` | billing + invitation |
| UI | effectiveKarma/Rating | «Реферальный доход», история accrual |

## 🔄 Альтернативы

| Вариант | Плюсы | Минусы |
|---------|-------|--------|
| Всё в `rating` | Один «referral» в голове | Смешение денег и репутации, тяжёлый сервис |
| В `billing` слушать граф | Меньше сервисов | Billing не должен знать правила маркетинга |
| Hardcoded % в коде | Быстрый MVP | Нет гибкости, ADR-003 нарушен |
| Только немонетарный | Проще | Не закрывает запрос на monetized referral |
| **Отдельный сервис + rules** | Чёткий BC, гибкость | +1 сервис, синхронизация с billing credit API |

## 📌 Последствия

- ✅ Документация: [referral-rewards](../../05-microservices/referral-rewards/README.md), [analysis](../../05-microservices/referral-rewards/requirements/analysis.md)
- ✅ PLATFORM-REGISTRY — ключи `referralRewards.*`
- ✅ event-catalog — новые события referral + `billing.refund_completed`, `billing.credit_completed`
- ⏳ billing — добавить internal credit endpoint и event (зависимость)
- ⏳ BFF — `GET /referral-rewards/summary` для UI (member)
- ⏳ UI — раздел «Приглашения» дополняется доходом (не в v1 кода)
- ✅ Глубина / invitee bonus / категории платежей — settings (решение 2026-07-10)
- ✅ GMV сделок — вне scope (legal)
- ⚠️ Legal review перед `maxDepth > 1` с деньгами в prod
- ⚠️ Не использовать `billing.deposit_completed` как триггер

## 🔗 Связанные документы

- [ADR-003](./003-settings-vs-financial-policy.md)
- [ADR-012](./012-club-invite-via-logto.md)
- [karma-and-rating.md](../../01-goal/karma-and-rating.md)
