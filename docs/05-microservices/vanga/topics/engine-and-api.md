# ⚙️ Движок расчёта, API, async

> **Группа:** E · **Пакет:** `@tavrida/monetization-engine`

## Простыми словами

Вся математика живёт в **одном пакете** TypeScript. BFF и (позже) сервис Vanga только вызывают функции. Так прогноз не расходится с реальными правилами billing.

## Разделение ответственности

| Слой | Роль |
|------|------|
| `@tavrida/monetization-engine` | **Только math** — pure functions, без state (ADR-015) |
| BFF / `services/vanga` | YAML defaults, auth, HTTP; вызывает `simulate()` |
| `billing`, domain-сервисы | Charge в БД; сумму берут из `computeChargeAmount` / plan-config |
| Frontend `/admin/vanga` | Ползунки и графики; **без формул** |

`MonetizationMath` — static-only фасад; в тестах предпочтительны named exports.

## Архитектура (фаза 1)

```
config/vanga.defaults.yaml
        ↓
loadVangaDefaults()          ← BFF (I/O)
        ↓
simulate(SimulateInput) ──► SimulateResult   ← monetization-engine (pure)
        ↑
BFF POST /admin/vanga/simulate
        ↑
Vue /admin/vanga
```

## API (BFF, admin JWT + Keto)

### `GET /api/v1/admin/vanga/defaults`

```json
{
  "version": "0.1",
  "currency": "RUB",
  "groups": { "cohort": { ... }, "costs": { ... } },
  "overlay": {
    "subscriptions.basic.monthlyPrice": 99,
    "referralRewards.globalEnabled": false
  }
}
```

### `POST /api/v1/admin/vanga/simulate`

```json
{
  "periodMonths": 12,
  "growth": { "model": "linear", "registrationsPerMonth": 40 },
  "cohort": { "planMix": { "free": 70, "basic": 25, "pro": 5 }, "churnPercent": 5 },
  "referral": { "programEnabled": false },
  "costs": { "items": { "hosting": 8000 }, "manualTotalBurn": null }
}
```

### `POST /api/v1/admin/vanga/compare`

До 3 объектов как выше + `scenarioId`.

## Публичные функции engine

| Функция | Модуль | Статус |
|---------|--------|--------|
| `simulate(input)` | `simulate.ts` | scaffold v0 |
| `compare(inputs[])` | `simulate.ts` | scaffold v0 |
| `computeMrr(...)` | `subscriptions/` | scaffold v0 |
| `computeOneTimeRevenue(...)` | `one-time/` | scaffold v0 |
| `computeChargeAmount(target, prices)` | `one-time/` | scaffold v0 |
| `computeReferralOut(gross, referral)` | `referral/` | scaffold v0 |
| `sumFixedCosts`, `computeVariableCosts`, `computeMonthlyNet` | `costs/` | scaffold v0 |
| `findBreakEvenMonth(...)` | `costs/` | scaffold v0 |
| `registrationsForMonth`, `buildRegistrationsSeries` | `growth/` | scaffold v0 |
| `loadVangaDefaults(path)` | BFF loader | ✅ `services/bff/.../load-vanga-defaults.ts` |

## Нужна ли асинхронность / RabbitMQ?

| Вопрос | Ответ |
|--------|-------|
| Simulate в реальном времени? | **Да**, sync HTTP, &lt; 500 ms |
| Очередь для расчёта? | **Нет** в v1–v2 |
| Monte Carlo 10k прогонов? | **Фаза 4**: optional job + poll или WebSocket (backlog) |
| Читать billing events? | **Фаза 4** batch aggregate, не live consumer |

Vanga **не** подписывается на `billing.charge_completed` в v1.

## Тесты

- Fixture: 1 месяц, известные числа → snapshot JSON
- Regression при изменении [monetization-catalog](../../../01-goal/monetization-catalog.md)

## 🔶 Checkpoint

- [ ] Engine в BFF process или сразу отдельный контейнер?
- [x] OpenAPI fragment — [vanga-admin-api.md](../../../06-api/vanga-admin-api.md)
