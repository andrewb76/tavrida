# @tavrida/monetization-engine

**Единый stateless-движок формул монетизации** — платформа и Oracle.

> ADR: [docs/03-architecture/adr/015-monetization-engine.md](../../docs/03-architecture/adr/015-monetization-engine.md)

## Принципы

1. **Pure functions** — без side effects, без async, без глобального state.
2. **Caller supplies config** — цены, коэффициенты, assumptions передаются аргументами.
3. **Deterministic** — `f(x) === f(x)`; тесты через golden JSON.
4. **No I/O** — не импортирует Nest, TypeORM, fetch.

## Кто использует

| Consumer | Примеры вызовов |
|----------|-----------------|
| `services/bff` (Oracle) | `simulate()`, `compare()` |
| `services/auction` | `computeOneTimeRevenue()`, `computeChargeAmount()` |
| `services/financial-policy` | `computeSubscriptionCharge()` |
| `services/referral-rewards` | `computeReferralPayout()` |
| `services/oracle` (фаза 3) | `simulate()` |

## API surface

### Named exports (предпочтительно в тестах)

- `computeMrr`, `computeOneTimeRevenue`, `computeReferralOut`, `computeMonthlyNet`
- `registrationsForMonth`, `findBreakEvenMonth`, `simulate`

### Фасад

```typescript
import { MonetizationMath } from '@tavrida/monetization-engine';

MonetizationMath.computeMrr(state, prices);
```

`MonetizationMath` — static-only, не инстанцируется.

## Структура `src/`

```
types.ts          # входы/выходы (без runtime)
money.ts          # roundRub, clamp
subscriptions/    # MRR
one-time/         # разовые targets
referral/         # outflow по глубине
costs/            # fixed, variable, break-even
growth/           # модели регистраций
simulate.ts       # оркестратор (композиция pure fn)
monetization-math.ts  # static фасад
index.ts
```

## Чего здесь нет

- Запись в БД, RabbitMQ, charge в billing.
- Чтение `config/oracle.defaults.yaml` (это BFF / loader в apps).

## Тесты

```bash
pnpm exec turbo run build --filter=@tavrida/monetization-engine
pnpm --filter @tavrida/monetization-engine test   # pretest пересобирает dist
```
