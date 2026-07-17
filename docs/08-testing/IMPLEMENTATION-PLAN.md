# 🧪 План внедрения полноценного тестирования

> **Статус:** accepted plan · **Дата baseline:** 2026-07-17  
> **Цель:** проверять не только domain logic, но и реальные границы Tavrida Lot:
> PostgreSQL, RabbitMQ, HTTP/auth, браузер и deployment.

## 🎯 Исходное состояние

Контрольный запуск `pnpm test` от 2026-07-17:

- 39/39 Turbo tasks successful;
- 201 assertions passed, 0 failed;
- 48 test source files в репозитории;
- runtime около 11 секунд с локальным Turbo cache.

Сильная сторона текущего набора — быстрые deterministic unit tests для auction,
BFF policies, plan-config, billing, shared helpers и frontend utilities.

Критические ограничения baseline:

- почти все repositories, transactions, HTTP clients и message brokers
  заменены mocks/fakes;
- нет теста с реальным PostgreSQL, RabbitMQ, Redis, MinIO или Keto;
- migrations ни разу не исполняются в тестах;
- нет Nest HTTP tests, проверки реального JWT/JWKS и общего internal token;
- нет Vue component/router/store tests и браузерного Playwright E2E;
- отсутствуют coverage reports и thresholds;
- `marketplace` и `deal-feedback` успешно завершают zero-test suites;
- `scalar-config` не имеет test task;
- shell expansion в test glob forum пропускает вложенный test file;
- CI последовательно запускает lint → unit tests → frontend build, но deploy
  не зависит от успешного CI.

Следовательно, текущий green означает: «скомпилировались пакеты и прошла
проверяемая pure/mock logic». Он не означает, что распределённая система,
миграции и конкурентные операции работают целиком.

## 🧭 Принципы

1. Не стремиться к формальным 100% строк. Покрывать риски и инварианты.
2. Реальную transaction/lock/constraint semantics проверять только на
   PostgreSQL, не на repository mocks.
3. Один небольшой набор critical journeys важнее сотен snapshot tests.
4. PR feedback должен оставаться быстрым: обязательный gate не дольше
   10–12 минут; тяжёлые матрицы — nightly/release.
5. Тестовые окружения изолированы: schema, RabbitMQ vhost/queue prefix,
   bucket и namespace уникальны для worker/run.
6. Никаких `sleep`: readiness/event polling с bounded timeout.
7. UTC, injected clock, seeded random/UUID и deterministic fixtures.
8. Flaky test не «лечится» бесконечным retry: owner + issue + срок quarantine.

## 🏗️ Целевая модель уровней

### L0 — Static verification

На каждом PR:

- lint, typecheck и build затронутых workspace packages;
- `docker compose config`, actionlint, ShellCheck/Hadolint;
- migration compilation и отсутствие незакоммиченного generated drift;
- dependency audit, secret scan и SAST.

### L1 — Unit

Инструменты:

- backend/packages: оставить `node:test` на первом этапе;
- frontend pure logic: мигрировать в Vitest вместе с component layer.

Scope:

- pure domain rules, transition tables, calculations, validation;
- policy/fail-closed decisions;
- serializers, event envelopes, retry/backoff, query builders;
- time-dependent code с fake/injected clock.

Target runtime: до 3 минут для полного monorepo; affected subset быстрее.

### L2 — Component and in-process integration

Frontend:

- Vitest + Vue Test Utils + Testing Library Vue;
- `createTestingPinia`, memory router, MSW, jsdom/happy-dom;
- axe для key states.

Nest:

- `TestingModule` + Supertest;
- реальные guards, pipes, DTO validation, error/status mapping;
- mocked external systems допустимы, но не controller/service wiring.

### L3 — Infrastructure integration

Testcontainers:

- PostgreSQL 17 — required PR gate;
- RabbitMQ — required для messaging changes, полный набор nightly;
- Redis/MinIO/Keto — affected PR suites + full nightly.

Проверяются реальные migrations, repositories, constraints, transactions,
locks, confirms, retries, restart recovery и DLQ.

### L4 — Contract

- generated OpenAPI для BFF/internal APIs;
- Spectral lint + `oasdiff` для breaking changes;
- BFF consumer tests против internal service contracts;
- AsyncAPI/JSON Schema для domain event envelope/payload;
- shared runtime validation для versioned events;
- Pact добавлять только для связей, где OpenAPI/schema tests недостаточны.

### L5 — System E2E

Playwright запускает frontend + BFF + минимально необходимый service graph.
Данные создаются через API fixtures; UI используется только для проверяемого
поведения.

На PR — Chromium critical smoke. Firefox/WebKit, полная матрица тем и viewport
— nightly/release.

### L6 — Non-functional

- accessibility: axe component + Playwright;
- visual regression: light/dark, mobile/desktop;
- performance: k6 и Lighthouse CI;
- security: CodeQL, dependency review, Gitleaks, Trivy; ZAP на stage;
- resilience: restart broker/worker, duplicate delivery, lease recovery;
- migration rehearsal и backup/restore — nightly/release.

## 🚦 Этапы внедрения

### T0 — Test foundation

Оценка: 2–3 engineer-days.

- исправить discovery всех `*.test.ts`, включая вложенные forum tests;
- zero-test package должен fail, а не быть green;
- добавить test task для `scalar-config`;
- разделить scripts: `test:unit`, `test:integration`, `test:component`,
  `test:e2e`, `test:coverage`;
- убрать двойной build из `pretest` там, где dependency уже задаёт Turbo;
- добавить JUnit/coverage artifacts;
- зафиксировать Node 22 одинаково в CI и Docker;
- перестроить CI в параллельные `static`, `unit`, `build`;
- full workspace nightly, affected packages на PR.

**Gate:** все существующие tests действительно обнаруживаются; marketplace /
deal-feedback не могут пройти с нулём без явного `test:skip` с причиной.

### T1 — PostgreSQL, migrations and concurrency

Оценка: 6–9 engineer-days. Первый высокий приоритет.

Создать `packages/testkit`:

- lifecycle Testcontainers;
- factory `DataSource` с отдельной schema;
- migration runner и cleanup;
- deterministic fixtures/clock/UUID;
- helpers для parallel requests и expected constraint errors.

Обязательные suites:

1. Все 12 baseline migrations на пустой БД.
2. Upgrade representative pre-baseline schema.
3. Четыре outbox migrations и индексы.
4. Billing: concurrent same idempotency key, concurrent debit, rollback,
   insufficient funds, decimal precision.
5. Auction: competing English bids, bid vs close, Dutch accept vs step-down,
   advisory cron lock, domain update + outbox atomicity.
6. Invite: simultaneous claims, expiry/maxUses, rollback + outbox.
7. Plan renewal: competing jobs, one charge, expired-plan fallback.
8. Forum vote/change-window and marketplace order-transition races.

**Gate:** schema or transaction change нельзя merge без real-PostgreSQL test.

### T2 — HTTP, auth and API contracts

Оценка: 4–6 engineer-days.

- boot BFF и каждый live service через Nest `TestingModule`;
- smoke every `/health` and `/health/ready`;
- internal endpoint matrix: no token / wrong token / valid token;
- BFF JWT tests с local JWKS server: signature, issuer, audience, expiry,
  malformed header, JWKS failure/cache;
- production startup fail-closed при отсутствии required auth config;
- DTO validation и stable error shape для critical endpoints;
- генерировать OpenAPI и блокировать breaking diff;
- contract tests для BFF clients и upstream controllers.

**Gate:** новый endpoint требует HTTP test и contract update.

### T3 — RabbitMQ, outbox and consumers

Оценка: 5–7 engineer-days.

- real RabbitMQ + PostgreSQL Testcontainers;
- outbox claim с competing workers и `skip_locked`;
- publisher confirm success/failure, reconnect, lease expiry;
- rollback domain transaction не оставляет outbox record;
- redelivery сохраняет `eventId`;
- consumer ack/retry headers/backoff/DLQ;
- persisted idempotency в deal-feedback;
- добавить полноценную consumer idempotency в subscriptions и тест duplicate
  delivery;
- restart relay/consumer между publish и ack.

Critical chains:

- auction/marketplace completed → deal-feedback pending;
- forum `tag.content_tagged` → subscriptions match → notification;
- invitation claimed → `invitation.redeemed`.

**Gate:** новый producer/consumer не merge без broker integration test.

### T4 — Frontend component and state tests

Оценка: 6–9 engineer-days.

Foundation:

- Vitest, Vue Test Utils, Testing Library Vue, MSW, axe;
- migrate 18 frontend pure tests из manual `tsconfig.test.json`;
- shared render helper: Pinia + router + i18n + Logto stubs;
- fake timers и deferred-response helper для race tests.

Priority suites:

1. Router guards, callback, protected deep link, admin roles.
2. Impersonation enter/exit и очистка identity-scoped cache.
3. Subscriptions store epoch/inflight/latest-request-wins.
4. Roles, wallet and profile requests при смене identity.
5. Auction create paid options/idempotency и English/Dutch bid UI.
6. Wallet/plan success, 402, auto-renew mutation errors.
7. Forum vote/reaction/edit, Markdown sanitization.
8. Marketplace order transitions.
9. Modal focus/Escape/restore и media upload lifecycle.

**Gate:** bugfix состояния требует regression test на observable behavior.

### T5 — Browser E2E and visual/accessibility smoke

Оценка: 7–10 engineer-days.

- Playwright config и full-stack test profile;
- deterministic local OIDC/JWKS; cloud Logto не использовать на PR;
- API fixture endpoints/scripts для setup/cleanup;
- trace, screenshot, console/network log only on failure;
- один retry в CI максимум.

PR smoke:

1. Existing member opens protected deep link.
2. Invite resolve → auth callback → claim.
3. Admin enter/exit impersonation без утечки state.
4. Create English auction → bid; accept Dutch ask.
5. Paid option / plan activation: success и insufficient balance.
6. Forum topic → comment → vote/tag subscription.
7. Marketplace order → completion → pending feedback.
8. Valid/invalid media upload.

Nightly:

- Firefox/WebKit;
- light/dark screenshots, desktop/mobile;
- axe scan primary routes;
- broader admin/config/period scenarios.

### T6 — Deployment and release gates

Оценка: 5–8 engineer-days.

- deploy workflow зависит от required CI;
- build image один раз, scan/sign и promote immutable digest;
- one-shot migration job до rollout;
- wait for Swarm convergence и real readiness;
- post-deploy API + Playwright smoke;
- rollback/fail deployment on unhealthy services;
- nightly full system, migration matrix, broker restart and backup restore;
- stage: k6 thresholds, ZAP baseline, Lighthouse budget.

**Gate:** успешный `docker stack deploy` сам по себе не означает успешный
deployment.

## 🔥 Приоритет первой волны

Первые suites должны закрыть максимальный риск:

1. Migration matrix всех live schemas.
2. Billing idempotency и overdraft под concurrency.
3. Auction bid/close/Dutch races + transactional outbox.
4. Internal-token HTTP matrix и JWT fail-closed.
5. Outbox relay + RabbitMQ retry/DLQ/idempotency.
6. Plan-config renewal/paid policy fail-closed.
7. Invite simultaneous claim.
8. Frontend impersonation/identity request races.
9. Marketplace completion → deal-feedback.
10. Forum tag → subscriptions → notifications.

## 📊 Coverage policy

Coverage — сигнал, не цель продукта:

- T0: только публиковать baseline, merge не блокировать;
- после T1/T4: changed lines ≥ 80%, changed branches ≥ 70%;
- critical pure policy/formula modules: branches ≥ 90%;
- global thresholds повышать ratchet-механизмом, не снижать;
- infrastructure integration, E2E и accessibility учитываются отдельно:
  line coverage не заменяет проверку locks, contracts и user journeys;
- исключения требуют краткого rationale в PR.

## ⏱️ CI budget

- static/unit/build jobs идут параллельно;
- unit feedback: до 3 минут;
- affected integration: до 8 минут;
- Chromium smoke: до 8 минут;
- общий required PR gate: целевой p95 до 12 минут;
- full workspace/infrastructure/browser matrix: nightly до 30–45 минут;
- performance сравнивается только на стабильном dedicated runner/stage.

## ✅ Definition of Tested

Изменение готово, когда применимые пункты выполнены:

- domain rule имеет unit test;
- persistence/transaction change имеет PostgreSQL integration test;
- endpoint имеет HTTP + contract test;
- producer/consumer имеет RabbitMQ delivery/idempotency test;
- user-facing critical flow имеет component или Playwright regression;
- auth/role/plan denial проверены негативными cases;
- docs и CI command отражают реально запускаемый уровень;
- test deterministic и не зависит от shared dev state.

## 📍 Порядок исполнения

Рекомендуемый rollout:

1. T0.
2. T1 и T4 foundation параллельно.
3. T2 и T3.
4. T4 priority suites.
5. T5.
6. T6 и non-functional nightly/release gates.

Ориентир полной первой реализации: 35–50 engineer-days. Это не одна большая
ветка: каждый этап должен давать самостоятельный required gate и mergeable
результат.

## 🔗 Связанные документы

- [Testing overview](./README.md)
- [Critical product scenarios](../01-goal/platform-scenarios.md)
- [CI/CD](../04-deployment/github-actions.md)
- [Migrations](../04-deployment/migrations.md)
- [Messaging](../03-architecture/messaging.md)
- [Security](../09-security/README.md)
- [Frontend](../14-frontend/README.md)

