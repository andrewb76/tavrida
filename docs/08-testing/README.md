# 🧪 Тестирование

> **Статус:** unit baseline implemented · **Версия:** 0.3
> **Rollout:** [IMPLEMENTATION-PLAN.md](./IMPLEMENTATION-PLAN.md)

## 📍 Состояние на 2026-07-17

- `pnpm test`: 201 assertions passed, 0 failed; 39/39 Turbo tasks.
- 48 test source files; преимущественно pure logic и mock-based services.
- Текущий backend runner — Node `node:test`, не Jest.
- Frontend: 18 pure-logic assertions; component/browser tests отсутствуют.
- PostgreSQL/Testcontainers, RabbitMQ, Nest HTTP, contract, Playwright и k6
  пока не подключены.
- `marketplace` и `deal-feedback` имеют zero-test suites; `scalar-config` не
  имеет test task.

Green baseline подтверждает compile/unit logic, но не migrations, locks,
broker delivery или critical browser journeys.

## 🎯 Целевые уровни

- **Unit:** `node:test` backend; Vitest frontend.
- **Component:** Vitest + Testing Library Vue + MSW + axe.
- **HTTP:** Nest TestingModule + Supertest.
- **Infrastructure:** Testcontainers PostgreSQL/RabbitMQ/Redis/MinIO/Keto.
- **Contract:** generated OpenAPI + `oasdiff`; AsyncAPI/JSON Schema events.
- **E2E:** Playwright critical journeys.
- **Non-functional:** k6, Lighthouse, ZAP, resilience/migration rehearsals.

## 🔬 Unit

- Colocate: `*.test.ts` рядом с модулем
- Mock: repositories, HTTP clients, RMQ
- **Обязательно:** billing charge idempotency, rating formula, plan-config limit check

```bash
pnpm exec turbo run test --filter=@tavrida/billing
```

## 🔗 Infrastructure integration

Первый required layer — Testcontainers PostgreSQL: migrations, constraints,
transactions и concurrency. RabbitMQ/outbox, Redis, MinIO и Keto добавляются
следующими этапами. Детали и DoD:
[IMPLEMENTATION-PLAN](./IMPLEMENTATION-PLAN.md).

## 📋 Critical scenarios (MVP)

Источник истины — **[platform-scenarios.md](../01-goal/platform-scenarios.md)**:

| Группа | MVP gate |
|--------|----------|
| [Частые](../01-goal/scenarios/frequent.md) | S-003, S-010, S-011, S-012, S-015 |
| [Средние](../01-goal/scenarios/occasional.md) | S-021 |
| [Редкие](../01-goal/scenarios/rare.md) | S-036 |

| # | Сценарий | Services |
|---|----------|----------|
| 1 | Create auction → bid → complete → feedback | auction, deal-feedback, user-profile |
| 2 | Activate Pro plan → charge → subscription | plan-config, billing |
| 3 | Insufficient balance → 402 | billing, BFF |
| 4 | Forum topic + comment + reaction karma | forum, rating |
| 5 | Idempotent charge retry | billing |

## 📈 Load (k6)

Targets ([slo](../07-observability/slo.md)):

- `POST /api/v1/auctions/{id}/bids` — 50 VUs, p95 < 500ms
- WS subscribe + bid events delivery

Scripts: `tools/k6/` (**TODO**, этап T6).

## ✅ CI gate

Текущий PR gate:

```bash
pnpm lint
pnpm test
pnpm exec turbo run build --filter=@tavrida/frontend
pnpm docs:build # PR only
```

Целевой PR graph: parallel `static`, `unit`, `integration`, `contract`,
`frontend-smoke`, `build`; deploy только после required CI.

## 🔗 Связанные разделы

- [12-dev-process](../12-dev-process/README.md)
- [06-api](../06-api/README.md)
- [MICROSERVICE-SPEC](../05-microservices/MICROSERVICE-SPEC.md)

---

**Автор:** команда разработки · **Версия:** 0.2-spec
