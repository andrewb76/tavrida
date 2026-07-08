# 👩‍💻 Процесс разработки

> **Статус:** spec ready · **Версия:** 0.2

## 🎯 Monorepo

```bash
pnpm install
pnpm dev      # turbo run dev
pnpm build    # turbo run build
pnpm lint     # turbo run lint
```

См. [AGENTS.md](../../AGENTS.md), [local-dev](../04-deployment/local-dev.md).

## 🌿 Branching

**Trunk-based** с короткими feature branches:

| Branch | Назначение |
|--------|------------|
| `master` | Всегда deployable; защищён |
| `feature/*` | Задачи, merge через PR |
| `fix/*` | Hotfix → PR → fast track deploy |

No long-lived `develop`. Release tags: `v0.1.0` на `master`.

## 💬 Commits

- **Conventional Commits** (recommended): `feat:`, `fix:`, `docs:`, `chore:`
- Imperative mood, русский или English — едино в PR title
- Docs-only: `docs:` prefix

## 🔀 Pull Request checklist

- [ ] `pnpm lint` + `pnpm build` green
- [ ] Tests added/updated for behavior change
- [ ] Docs: service README / PLATFORM-REGISTRY / event-catalog if contract changed
- [ ] Migrations included if schema change
- [ ] No secrets in diff
- [ ] ADR if architectural decision

## 🚀 Release

1. Merge to `master`
2. CI deploy dev automatically (when wired)
3. Tag `vX.Y.Z` → prod deploy + migration jobs
4. Sentry release + Grafana annotation with `GIT_SHA`

Rollback: [runbook-rollback](../04-deployment/runbook-rollback.md).

## 🔧 Local quality

- Editor: ESLint from `tools/config`
- Format: Prettier (TBD root config)
- Pre-commit: lint-staged (**TODO**)

## 🔗 Связанные разделы

- [Тестирование](../08-testing/README.md)
- [Деплой](../04-deployment/README.md)
- [docs-guidelines](../13-maintenance/docs-guidelines.md)

---

**Автор:** команда разработки · **Версия:** 0.2-spec
