# 🧪 Тестирование

> **Статус:** spec ready · **Версия:** 0.2

## 🎯 Пирамида

| Уровень | Инструмент | Scope |
|---------|------------|-------|
| Unit | Jest | Domain logic, pure functions |
| Integration | Jest + Testcontainers | HTTP + PG + RMQ |
| Contract | (future) OpenAPI diff | BFF ↔ services |
| E2E | Playwright (future) | Critical user flows |
| Load | k6 | Auction bids, BFF RPS |

## 🔬 Unit

- Colocate: `*.spec.ts` рядом с модулем
- Mock: repositories, HTTP clients, RMQ
- **Обязательно:** billing charge idempotency, rating formula, plan-config limit check

```bash
pnpm exec turbo run test --filter=@tavrida/billing
```

## 🔗 Integration

Testcontainers (PostgreSQL, Redis, RabbitMQ):

```ts
// sketch: billing charge integration
beforeAll(async () => {
  pg = await new PostgreSqlContainer().start()
  // run migrations on billing schema
})
it('charge deducts balance atomically', async () => { … })
```

Запуск в CI: Docker-in-Docker или dedicated runner.

## 📋 Critical scenarios (MVP)

Источник истины — **[platform-scenarios.md](../01-goal/platform-scenarios.md)**:

| Группа | MVP gate |
|--------|----------|
| [Частые](../01-goal/scenarios/frequent.md) | S-003, S-010, S-011, S-012, S-015 |
| [Средние](../01-goal/scenarios/occasional.md) | S-021 |
| [Редкие](../01-goal/scenarios/rare.md) | S-036 |

| # | Сценарий | Services |
|---|----------|----------|
| 1 | Create auction → bid → complete → feedback | auction, feedback, rating |
| 2 | Activate Pro plan → charge → subscription | plan-config, billing |
| 3 | Insufficient balance → 402 | billing, BFF |
| 4 | Forum topic + comment + reaction karma | forum, rating |
| 5 | Idempotent charge retry | billing |

## 📈 Load (k6)

Targets ([slo](../07-observability/slo.md)):

- `POST /api/v1/auctions/{id}/bids` — 50 VUs, p95 < 500ms
- WS subscribe + bid events delivery

Scripts: `tools/k6/` (**TODO** in repo).

## ✅ CI gate

PR must pass:

```bash
pnpm lint
pnpm build
pnpm test   # when test scripts wired per package
```

## 🔗 Связанные разделы

- [12-dev-process](../12-dev-process/README.md)
- [06-api](../06-api/README.md)
- [MICROSERVICE-SPEC](../05-microservices/MICROSERVICE-SPEC.md)

---

**Автор:** команда разработки · **Версия:** 0.2-spec
