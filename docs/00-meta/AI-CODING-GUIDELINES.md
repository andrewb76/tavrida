# 🤖 AI Coding Guidelines — Tavrida Lot

> **Назначение:** поведенческие правила для LLM-агентов при работе с кодовой базой.  
> **Основано на:** CLAUDE.md (корневой) — переносим в документацию проекта для версионирования и доступности через AGENT-DOCS-INDEX.md.

---

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

---

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: *"Would a senior engineer say this is overcomplicated?"* If yes, simplify.

---

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

---

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

## 5. Project-Specific Rules (Tavrida Lot)

### Документация
- **Docs-first phase**: реализация — scaffold only. Править docs до кода.
- Индекс для AI: `docs/00-meta/AGENT-DOCS-INDEX.md` — читать в начале задачи.
- При изменении функций: обновлять `01-goal/`, `05-microservices/`, ADR при необходимости.
- Обновлять строку темы в `AGENT-DOCS-INDEX.md` (статус, дата, новые пути).

### Монорепо / Команды
- Пакетный менеджер: **pnpm@11.20.0**, Turbo **2.x** (`tasks`, не `pipeline`).
- `pnpm dev` / `pnpm build` / `pnpm lint` / `pnpm test` — через Turbo.
- Фильтр пакета: `pnpm exec turbo run build --filter=@tavrida/<pkg>`

### Pre-push checklist (обязательно перед `git push`)
1. **TypeScript** — `tsc --noEmit --project <pkg>/tsconfig.json`
2. **Lint** — `pnpm lint` (или конкретные файлы)
3. **Test** — `node --test <pkg>/dist/**/*.test.js`
4. **Build** — `tsc --project <pkg>/tsconfig.json`

Если проверка не прошла — **не пушить**, исправлять и повторять.
Git hook: `.githooks/pre-push` (настроить `git config core.hooksPath .githooks`).

### Именование
- Сервисы / папки: **kebab-case** (`deal-feedback`, `subscriptions`).
- PG схемы: **snake_case** (ADR-001).
- ADR: `docs/03-architecture/adr/NNN-*.md`.

### Безопасность
- Никаких секретов в коде/логах/коммитах.
- Валидация вложений: `@tavrida/object-storage` (domain, ownership, size, count).
- JWT: fail-closed, 401 stale token → `/auth/relogin`.

### Тестирование
- Unit: Node.js `node:test` (`pnpm test`).
- E2E: Playwright (`pnpm exec playwright test` в `e2e/`).
- Не полагаться только на CI — прогонять локально затронутые пакеты.

---

## 6. Quick Reference: Key Paths

| What | Where |
|------|-------|
| Project bootstrap | `docs/00-meta/PROJECT-CONTEXT.md` |
| AI docs index | `docs/00-meta/AGENT-DOCS-INDEX.md` |
| Docs review process | `docs/13-maintenance/docs-review.md` |
| ADR registry | `docs/03-architecture/adr/` |
| Platform registry (tariffs) | `docs/05-microservices/PLATFORM-REGISTRY.md` |
| Event catalog | `docs/03-architecture/event-catalog.md` |
| Frontend stack | `docs/14-frontend/README.md` + `stack-decisions.md` |

---

## 7. Success Indicators

These guidelines are working if:
- Fewer unnecessary changes in diffs
- Fewer rewrites due to overcomplication
- Clarifying questions come **before** implementation rather than after mistakes

---

**Версия:** 1.0 (перенесено из корневого CLAUDE.md 2026-09-24)  
**Источник:** [CLAUDE.md](../../CLAUDE.md) (корневой, для внешних AI-инструментов)