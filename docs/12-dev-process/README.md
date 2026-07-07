# 👩‍💻 Процесс разработки

> **Статус:** TODO · **Версия:** 0.1

## 🎯 Назначение

Git-workflow, code review, релизы и локальная разработка Tavrida Lot.

## 📦 Monorepo

Структура: `apps/` (UI), `packages/` (shared libs), `services/` (NestJS).  
Подробнее: [AGENTS.md](../../AGENTS.md) в корне репозитория.

```bash
pnpm install
pnpm dev      # turbo run dev
pnpm build    # turbo run build
pnpm lint     # turbo run lint
```

## 📋 TODO

- [ ] Branching strategy (trunk-based / GitFlow)
- [ ] Conventional Commits
- [ ] PR checklist (tests, docs, migrations)
- [x] Локальный запуск (`pnpm dev`, turbo)
- [ ] Pre-commit hooks (lint, format)
- [ ] Версионирование (semver)

## 🔗 Связанные разделы

- [Тестирование](../08-testing/README.md)
- [Деплой](../04-deployment/README.md)
- [Guidelines](../13-maintenance/docs-guidelines.md)

---

**Автор:** команда разработки · **Версия:** 0.1-draft
