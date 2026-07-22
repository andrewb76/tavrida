# Tavrida Lot (max-alice)

Monorepo: auction/forum platform for finds (Crimea focus). **Docs-first phase** — implementation is scaffold only.

**Start here:** [docs/00-meta/PROJECT-CONTEXT.md](docs/00-meta/PROJECT-CONTEXT.md)  
**Per-task docs index (read first):** [docs/00-meta/AGENT-DOCS-INDEX.md](docs/00-meta/AGENT-DOCS-INDEX.md)

Full documentation: [docs/README.md](docs/README.md)  
**Published docs:** [https://andrewb76.github.io/tavrida/](https://andrewb76.github.io/tavrida/)

## Monorepo layout

pnpm + Turborepo workspace. Package manager: **pnpm@11.13.0**, Turbo **2.x** (`tasks`, not `pipeline`).

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
│   └── chat/                  port 3016 (docs only; schema: chat)
├── tools/config/              ESLint + legacy tsconfig paths
├── docker/
└── docs/
```

**Naming:** service directories use **kebab-case** (`subscriptions`, `deal-feedback`). PostgreSQL schemas may use snake_case per [ADR-001](docs/03-architecture/adr/001-database-schema-per-service.md). Renames: [ADR-006](docs/03-architecture/adr/006-service-renames-deal-feedback-subscriptions.md).

**Docs-only services** (`rating`, `chat`, …) live under `services/` but have **no `package.json`** until implementation starts — they are outside the pnpm workspace. Chat spec: [docs/05-microservices/chat/](docs/05-microservices/chat/README.md).

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

## Environment variables

Runtime secrets and infra env vars: [docs/02-infrastructure/PLATFORM-SECRETS.md](docs/02-infrastructure/PLATFORM-SECRETS.md)  
Local template: [`.env.example`](.env.example) → copy to `.env.local` (gitignored).
