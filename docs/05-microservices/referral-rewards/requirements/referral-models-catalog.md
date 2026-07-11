# 📐 Каталог моделей реферальных выплат

> **Статус:** draft · **Версия:** 0.1  
> **Продолжение:** [analysis.md](./analysis.md) · **Oracle:** [referral-forecast.md](../../oracle/topics/referral-forecast.md)

Документ для выбора **расчётной модели** реферальной программы: сравнение рыночных схем, рекомендация для Tavrida Lot и схема конфигурации «одна активная модель + свои параметры».

---

## 1. Зачем отдельный каталог моделей

В [analysis.md](./analysis.md) уже описаны типы схем (CPA, CPS, recurring, bilateral, MLM). На практике админу и founder нужно не перечисление абстракций, а:

1. **Выбрать одну рабочую модель** (или переключаться между пресетами без деплоя).
2. **Настроить только релевантные параметры** — у CPA нет `depthCoefficients`, у MLM нет `holdDays` в Oracle.
3. **Согласовать Oracle и production** — одна формула в `monetization-engine`, те же поля в `referralRewards.*`.

Предлагаемая архитектура: **Combo Model Presets + Rule Engine**.

| Слой | Роль |
|------|------|
| **Model Preset** (`models[].modelId`) | Именованный шаблон: тип вознаграждения, триггер, набор полей UI |
| **Параметры модели** | `models[].params` — значения ползунков, специфичные для preset |
| **Combo** | Несколько `models[]` с `enabled: true` — выплаты **суммируются** |
| **Rule Engine** (prod) | `referralRewards.rules[]`, синхронизированный с активными preset |
| **Oracle** | Тот же `models[]` → `computeReferralOut()` |

Админ в UI: чекбоксы активных моделей + выпадающий список для настройки параметров выбранной модели.

---

## 2. Сравнение моделей для Tavrida Lot

Контекст: закрытый клуб, граф `inviterId` уже есть, доход — подписки + разовые charge (не GMV сделок).

| ID модели | Название (RU) | Суть | Подходит? | Риск | Когда выбирать |
|-----------|---------------|------|-----------|------|----------------|
| `revshare_single` | Доля от платежа, 1 уровень | % с charge приглашённого → прямому inviter | ✅ **v1 default** | Низкий | Консервативный старт, SaaS-клуб |
| `revshare_multi_decay` | Многоуровневая с затуханием | % с charge, цепочка предков, `depthCoefficients` | ⚠️ v2 | MLM-репутация, legal | Вирусный рост, после legal review |
| `cpa_first_charge` | Фикс за первую оплату | Разовая выплата inviter при first qualifying charge | ✅ | Накрутка регистраций | Агрессивный рост, простое объяснение |
| `cpa_registration` | Фикс за регистрацию | Выплата при `invitation.redeemed` | ❌ не рекомендуем | Спам-инвайты | Только с жёстким antifraud |
| `bilateral_first_sub` | Двусторонний бонус | Inviter + invitee при первой подписке | ✅ | Удвоение CAC | Высокая конверсия в платящих |
| `recurring_lifetime_cap` | Recurring с потолком | % с каждого renew, cap на invitee/месяц | ✅ | Дорого при высоком % | LTV-ориентированная программа |
| `category_mixed` | Смешанные категории | Разные % по `SUBSCRIPTION`, `AUCTION_SERVICES`, … | ✅ | Сложность UI | Когда хотим стимулировать не только подписки |
| `deposit_rebate` | % с депозита | Rebate от пополнения кошелька | ❌ | Отмывание, плохой триггер | Не для нас |

**Итог для v1:** включить в каталог **четыре** модели с полной поддержкой Oracle + scalar-config:

1. `revshare_single` — default production и Oracle  
2. `revshare_multi_decay` — опционально после legal  
3. `cpa_first_charge` — альтернатива для экспериментов  
4. `bilateral_first_sub` — парный с `revshare_single` (можно комбинировать через rules)

`recurring_lifetime_cap` и `category_mixed` — **фаза 2** (больше параметров, нужны golden tests).

---

## 3. Каталог: параметры по моделям

Общие поля **всех** денежных моделей (глобальные, не зависят от preset):

| Параметр | scalar-config ключ | Oracle YAML | Описание |
|----------|---------------|-------------|----------|
| Вкл. программа | `globalEnabled` | `programEnabled` | Kill switch |
| Доля реферального трафика | — (прогноз) | `attachRatePercent` | % gross с inviter (только Oracle) |
| Категории charge | `enabledChargeCategories` | `enabledChargeCategories` | SUBSCRIPTION, … |
| Глобальный бюджет | `globalBudgetPerMonth` | `globalBudgetPerMonth` | Cap ₽/мес на всю программу |
| Hold | `defaultHoldDays` | — (prod only) | Задержка перед credit |
| Глубина (потолок) | `maxDepth` | `maxDepth` | Для multi-level |

### 3.1. `revshare_single` — доля от платежа, 1 уровень

**Триггер:** `billing.charge_completed`  
**Бенефициар:** `DIRECT_INVITER` (depth = 1)

| Параметр | Тип | Default | Описание |
|----------|-----|---------|----------|
| `percentOfCharge` | number % | 10 | % от суммы charge (после фильтра категории) |
| `maxPayoutPerEvent` | number ₽ | null | Cap на одно событие |
| `maxEarnedPerMonth` | number ₽ | plan-config limit | Cap на inviter / месяц |

**Формула Oracle (месяц t):**

```
eligibleGross = gross[t] × attachRate × shareSubscriptionOnly
payout = eligibleGross × percentOfCharge / 100
```

**Маппинг в rules:** одно правило `subscription-share`, `calculation: PERCENT`, `maxDepth: 1`.

---

### 3.2. `revshare_multi_decay` — многоуровневая с затуханием

**Триггер:** `billing.charge_completed`  
**Бенефициар:** `ANCESTOR_CHAIN`

| Параметр | Тип | Default | Описание |
|----------|-----|---------|----------|
| `percentOfCharge` | number % | 10 | Базовый % от charge |
| `maxDepth` | number | 3 | Уровни 1…N |
| `depthCoefficients` | number[] | `[1.0, 0.3, 0.1]` | Множитель уровня d |
| `payoutDistributionByDepth` | number[] % | `[70, 20, 10]` | Доля выплат по уровням (сумма ≤ 100) — для Oracle UI / дерева |
| `maxEarnedPerMonth` | number ₽ | plan-config | Cap на бенефициара |

**Формула Oracle:**

```
eligible = gross × attachRate × categoryFraction
payout[d] = eligible × (percent/100) × depthCoeff[d] × (distribution[d]/100)
referralOut = Σ payout[d]
```

**Требование:** `maxDepth ≤ 3` до legal sign-off.

---

### 3.3. `cpa_first_charge` — фикс за первую оплату

**Триггер:** первый `billing.charge_completed` invitee (qualifying)  
**Бенефициар:** `DIRECT_INVITER`

| Параметр | Тип | Default | Описание |
|----------|-----|---------|----------|
| `fixedAmountRub` | number ₽ | 500 | Выплата за первый qualifying charge |
| `minChargeAmountRub` | number ₽ | 100 | Минимальная сумма charge |
| `qualifyingCategories` | enum[] | `[SUBSCRIPTION]` | Какие категории считаются |
| `oncePerInvitee` | boolean | true | Только один раз на invitee |

**Формула Oracle (упрощённо):**

```
newPayingReferrals[t] ≈ registrations[t] × attachRate × planMixPaid
referralOut[t] = newPayingReferrals[t] × fixedAmountRub
```

---

### 3.4. `bilateral_first_sub` — двусторонний бонус

**Триггеры:** первая подписка invitee  
**Бенефициары:** inviter + invitee

| Параметр | Тип | Default | Описание |
|----------|-----|---------|----------|
| `inviterBonusRub` | number ₽ | 300 | Бонус пригласившему |
| `inviteeBonusRub` | number ₽ | 300 | Бонус приглашённому |
| `inviteeBonusTrigger` | enum | `ON_FIRST_SUBSCRIPTION` | Когда invitee получает бонус |
| `stackWithRevshare` | boolean | false | Суммировать с % или взаимоисключение |

**Settings:** `referralRewards.inviteeBonus.*` + отдельное rule для inviter fixed.

**Формула Oracle:**

```
referralOut = newSubsReferral × (inviterBonus + inviteeBonus)   // если stack
```

---

### 3.5. `recurring_lifetime_cap` (фаза 2)

**Триггер:** каждый renew подписки  
**Бенефициар:** `DIRECT_INVITER`

| Параметр | Тип | Default |
|----------|-----|---------|
| `percentOfRenew` | number % | 5 |
| `maxMonthsPerInvitee` | number | 12 |
| `maxTotalPerInviteeRub` | number ₽ | 3000 |

---

### 3.6. `category_mixed` (фаза 2)

**Триггер:** `billing.charge_completed`  
Отдельный % на категорию:

| Параметр | Пример |
|----------|--------|
| `percentByCategory.SUBSCRIPTION` | 10 |
| `percentByCategory.AUCTION_SERVICES` | 5 |
| `percentByCategory.FORUM_REACTIONS` | 0 |

---

## 4. Рекомендуемая схема конфигурации

### 4.1. Settings (production)

```json
{
  "referralRewards.globalEnabled": false,
  "referralRewards.models": [
    { "modelId": "revshare_single", "enabled": true, "params": { "percentOfCharge": 10 } },
    { "modelId": "bilateral_first_sub", "enabled": true, "params": { "inviterBonusRub": 300, "inviteeBonusRub": 300 } }
  ],
  "referralRewards.maxDepth": 1,
  "referralRewards.depthCoefficients": [1.0],
  "referralRewards.enabledChargeCategories": ["SUBSCRIPTION"],
  "referralRewards.inviteeBonus.enabled": false,
  "referralRewards.rules": []
}
```

При смене `calculationModelId` BFF/scalar-config **валидирует** `modelParams` по JSON Schema preset (лишние ключи отклоняются).  
Опционально: кнопка «Сгенерировать rules из модели» заполняет `rules[]` для прозрачности в audit.

### 4.2. Oracle (`config/oracle.defaults.yaml`)

```yaml
referral:
  programEnabled: { default: false }
  calculationModelId:
    default: revshare_single
    options:
      - id: revshare_single
        label: Доля от платежа (1 уровень)
      - id: revshare_multi_decay
        label: Многоуровневая с затуханием
      - id: cpa_first_charge
        label: Фикс за первую оплату
      - id: bilateral_first_sub
        label: Двусторонний бонус
  models:
    revshare_single:
      percentOfCharge: { min: 0, max: 50, default: 10, step: 1 }
    revshare_multi_decay:
      percentOfCharge: { min: 0, max: 30, default: 10, step: 1 }
      maxDepth: { min: 1, max: 3, default: 2, step: 1 }
      depthCoefficients: { default: [1.0, 0.3, 0.1] }
    cpa_first_charge:
      fixedAmountRub: { min: 0, max: 5000, default: 500, step: 50 }
    bilateral_first_sub:
      inviterBonusRub: { min: 0, max: 3000, default: 300, step: 50 }
      inviteeBonusRub: { min: 0, max: 3000, default: 300, step: 50 }
  # Общие для прогноза (все модели):
  attachRatePercent: { min: 0, max: 100, default: 25, step: 5 }
```

### 4.3. Движок (`monetization-engine`)

```typescript
type ReferralModelId =
  | 'revshare_single'
  | 'revshare_multi_decay'
  | 'cpa_first_charge'
  | 'bilateral_first_sub';

function computeReferralOut(
  gross: number,
  modelId: ReferralModelId,
  params: Record<string, unknown>,
  context: ReferralMonthContext,
): ReferralOutResult;
```

Текущая `computeReferralOut` ≈ `revshare_multi_decay` без `percentOfCharge` (нормализация в v2).

---

## 5. UI: вкладка «Реферал» (Oracle и admin scalar-config)

1. Чекбокс «Программа включена».  
2. **Select «Модель расчёта»** — список из `calculationModelId.options`.  
3. Динамические ползунки из `referral.models[activeModel]`.  
4. Общие поля: attach rate (Oracle), категории, бюджет.  
5. Блок «Выплаты по уровням» — только для `revshare_multi_decay`.

---

## 6. План внедрения

| Фаза | Что | Статус |
|------|-----|--------|
| 0 | Этот каталог + согласование с founder | **сейчас** |
| 1 | `revshare_single` в engine + Oracle UI (текущие ползунки + % charge) | частично (engine v0) |
| 2 | Select модели + условные поля в Oracle | backlog |
| 3 | `calculationModelId` в scalar-config + валидатор `modelParams` | backlog |
| 4 | `referral-rewards` service: preset → rules compiler | backlog |
| 5 | `revshare_multi_decay`, `cpa_*`, `bilateral_*` + golden tests | backlog |

---

## 7. Открытые вопросы для обсуждения

1. **Комбинация моделей:** разрешено включать **несколько** preset одновременно; выплаты **суммируются**. Oracle и settings отражают список `models[]` с флагом `enabled` на каждую.

2. **Синхронизация rules:** хранить только `modelParams` или дублировать в `rules[]` для audit?  
   *Рекомендация:* `modelParams` — source of truth для preset; `rules` — материализованный snapshot при publish.

3. **Репутация vs деньги:** немонетарный слой (`rating.referral.*`) всегда отдельно — не смешивать в model picker.

4. **Вывод на карту:** вне scope; все модели → credit на баланс клуба.

---

## 🔗 Связанные документы

- [analysis.md](./analysis.md)
- [charge-categories.md](./charge-categories.md)
- [legal-scope.md](./legal-scope.md)
- [referral-rewards README](../README.md)
- [referral-forecast.md](../../oracle/topics/referral-forecast.md)
- [ADR-013](../../../03-architecture/adr/013-referral-rewards-service.md)

---

**Автор:** команда разработки · **Версия:** 0.1-draft
