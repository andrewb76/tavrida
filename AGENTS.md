# Tavrida Lot (max-alice)

Monorepo: auction/forum platform for finds (Crimea focus). **Docs-first phase** — implementation is scaffold only.

**Start here:** [docs/00-meta/PROJECT-CONTEXT.md](docs/00-meta/PROJECT-CONTEXT.md)  
**Per-task docs index (read first):** [docs/00-meta/AGENT-DOCS-INDEX.md](docs/00-meta/AGENT-DOCS-INDEX.md)  
**Docs review process:** [docs/13-maintenance/docs-review.md](docs/13-maintenance/docs-review.md) (trigger: «ревью документации»)

Full documentation: [docs/README.md](docs/README.md)  
**Published docs:** [https://andrewb76.github.io/tavrida/](https://andrewb76.github.io/tavrida/)

## Monorepo layout

pnpm + Turborepo workspace. Package manager: **pnpm@11.20.0**, Turbo **2.x** (`tasks`, not `pipeline`).

```
max-alice/
├── apps/
│   └── frontend/              @tavrida/frontend — Vue 3 + Vite
│   └── docs-site/             @tavrida/docs-site — VitePress static docs
├── packages/
│   ├── tsconfig/              @tavrida/tsconfig — shared TS configs
│   ├── shared/                @tavrida/shared
│   ├── graphql/               @tavrida/graphql (+ generate script)
│   ├── content/               @tavrida/content
│   ├── internal-auth/         @tavrida/internal-auth — service-to-service auth middleware
│   ├── object-storage/        @tavrida/object-storage — MinIO/S3 abstraction
│   ├── outbox/                @tavrida/outbox — transactional outbox pattern
│   ├── monetization-engine/   @tavrida/monetization-engine — pure monetization formulas (ADR-015)
│   └── ui/                    @tavrida/ui
├── services/                  NestJS microservices (@tavrida/*)
│   ├── bff/                   port 3000
│   ├── billing/               port 3001
│   ├── plan-config/           port 3002 (legacy dir: financial-policy; PG schema: plan_config)
│   ├── auction/               port 3003
│   ├── subscriptions/         port 3004 (legacy dir: auction-subscriptions; PG schema: subscriptions)
│   ├── deal-feedback/         port 3006
│   ├── user-profile/          port 3007
│   ├── scalar-config/         port 3008 (legacy dir: settings; PG schema: scalar_config)
│   ├── forum/                 port 3009
│   ├── notifications/         port 3010
│   ├── marketplace/           port 3011
│   ├── periods/               port 3014
│   └── chat/                  port 3016
├── tools/config/              ESLint + legacy tsconfig paths
├── e2e/                       Playwright E2E tests (pnpm workspace member)
├── docker/
└── docs/
```

**Naming:** service directories use **kebab-case** (`subscriptions`, `deal-feedback`). PostgreSQL schemas may use snake_case per [ADR-001](docs/03-architecture/adr/001-database-schema-per-service.md). Renames: [ADR-006](docs/03-architecture/adr/006-service-renames-deal-feedback-subscriptions.md).

**Docs-only services** (`rating`, `webhooks`) live under `services/` but have **no `package.json`** until implementation starts — they are outside the pnpm workspace. Chat: [docs/05-microservices/chat/](docs/05-microservices/chat/README.md).

## Commands

```bash
pnpm install
pnpm dev          # turbo run dev (all packages)
pnpm build        # turbo run build
pnpm lint         # turbo run lint
pnpm lint:fix     # eslint --fix (Vue formatting)
pnpm generate     # graphql codegen placeholder
pnpm docs:dev     # VitePress — docs/ static site
pnpm docs:build
```

Filter a single package:

```bash
pnpm exec turbo run build --filter=@tavrida/billing
```

**Перед commit:** локально `turbo run test` (затронутые пакеты или весь workspace) — см. `.cursor/rules/pre-commit-tests.mdc`. Не полагаться только на CI.

## Pre-push checklist

**Перед `git push` ОБЯЗАТЕЛЬНО выполнить все пункты:**

1. **TypeScript** — `node_modules/.bin/tsc --noEmit --project <service>/tsconfig.json` для каждого затронутого пакета
2. **Lint** — `pnpm lint` (полный) или `node_modules/.bin/eslint <changed-files>` для конкретных файлов
3. **Test** — `node --test <service>/dist/**/*.test.js` для затронутых сервисов
4. **Build** — `node_modules/.bin/tsc --project <service>/tsconfig.json` (компиляция перед тестами)

Если хотя бы одна проверка не прошла — **НЕ пушить**, исправить и повторить.

### Git hook (pre-push)

В `.githooks/pre-push` есть хук который автоматически проверяет TypeScript + Lint + Tests перед пушем.

**Первая настройка:**
```bash
git config core.hooksPath .githooks
```

Хук проверяет только затронутые пакеты. Пропуск: `git push --no-verify`.

## Environment variables

Runtime secrets and infra env vars: [docs/02-infrastructure/PLATFORM-SECRETS.md](docs/02-infrastructure/PLATFORM-SECRETS.md)  
Local template: [`.env.example`](.env.example) → copy to `.env.local` (gitignored).
