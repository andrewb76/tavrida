# 🛠️ Oracle — план реализации

> **Статус:** draft · **Версия:** 0.1  
> **Принцип:** docs → согласование → код. После каждой фазы — checkpoint с founder.

---

## Фаза 0 — Документация ✅ (текущая)

| Шаг | Артефакт | Статус |
|-----|----------|--------|
| 0.1 | [glossary.md](./glossary.md) | ✅ |
| 0.2 | [overview.md](./overview.md) | ✅ |
| 0.3 | [topic-index.md](./topic-index.md) | ✅ |
| 0.4 | [topics/](./topics/) — детальные файлы | ✅ |
| 0.5 | [config/oracle.defaults.yaml](../../../config/oracle.defaults.yaml) | ✅ |
| 0.6 | [monetization-catalog.md](../../01-goal/monetization-catalog.md) | ✅ |

### 🔶 Checkpoint 0 (согласовать с founder)

- [ ] Пройти [topic-index.md](./topic-index.md) — ничего не забыли?
- [ ] Правки `oracle.defaults.yaml` после совещания (цены, burn, churn)
- [ ] Подтвердить формулу **breakEvenMonth** (см. [costs-breakeven](./topics/costs-breakeven.md))

---

## Фаза 1 — Движок расчёта (без UI)

| Шаг | Задача | Выход |
|-----|--------|-------|
| 1.1 | Пакет `packages/monetization-engine` | ✅ scaffold v0 ([ADR-015](../../03-architecture/adr/015-monetization-engine.md)); доработка по topics |
| 1.2 | Загрузчик defaults из YAML | `loadOracleDefaults(path)` |
| 1.3 | `simulate(input) → OracleResult` | MRR, one-time, net, breakEven |
| 1.4 | BFF `OracleModule` | `GET /defaults`, `POST /simulate`, `POST /compare` |
| 1.5 | Overlay FP/settings | цены планов, `referralRewards.globalEnabled` |

**Async / MQ:** не нужны — расчёт синхронный, &lt; 500 ms.

### 🔶 Checkpoint 1

- [ ] Пример JSON request/response на реальных defaults
- [ ] Сверка одного месяца вручную (Excel) vs engine
- [ ] Реферал off/on даёт ожидаемую delta

---

## Фаза 2 — Admin UI

| Шаг | Задача | Выход |
|-----|--------|-------|
| 2.1 | Route `/admin/oracle`, вкладки по [topic-index](./topic-index.md) | Vue |
| 2.2 | Ползунки из defaults API | min/max/step |
| 2.3 | График gross/net, break-even marker | chart lib |
| 2.4 | До 3 сценариев overlay | compare API |
| 2.5 | Реферал: tree depth chart | отдельная вкладка |
| 2.6 | Costs UX: items → total; manual total → BE only | см. oracle-config |

### 🔶 Checkpoint 2

- [ ] Прогон «базовый» сценарий на 12 мес — визуально ок?
- [ ] Ручной total burn не ломает line items
- [ ] Toggle referral меняет net

---

## Фаза 3 — Сервис `services/oracle` (опционально)

Когда: сохранённые сценарии, versioning формул, Monte Carlo.

| Шаг | Задача |
|-----|--------|
| 3.1 | NestJS :3013, stateless simulate |
| 3.2 | Schema `oracle.saved_scenario` |
| 3.3 | BFF proxy вместо in-process engine |

### 🔶 Checkpoint 3

- [ ] Нужны ли saved scenarios на практике?
- [ ] Выносить engine в сервис или оставить в BFF?

---

## Фаза 4 — Факт и экспорт (backlog)

| Шаг | Задача |
|-----|--------|
| 4.1 | Billing aggregates «план vs факт» |
| 4.2 | Экспорт CSV/PDF |
| 4.3 | Monte Carlo по min/max YAML |
| 4.4 | Промоция YAML → `settings` domain `oracle.*` |

---

## Порядок чтения для разработчика

1. [glossary.md](./glossary.md)
2. [topic-index.md](./topic-index.md)
3. Темы из группы, которую реализуешь
4. [topics/engine-and-api.md](./topics/engine-and-api.md)
5. Этот план — фаза по checkpoint

---

## Риски

| Риск | Митигация |
|------|-----------|
| Расхождение Oracle vs billing | Единый `monetization-engine`; каталог монетизации |
| Слишком много ползунков | Группировка вкладками; presets |
| TBD цены marketplace | `enabled: false` в YAML до business sign-off |
