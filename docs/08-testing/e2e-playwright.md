# 🎭 Playwright E2E + BDD

> **Статус:** in progress · **Версия:** 0.2  
> **Раннер:** Playwright + [playwright-bdd](https://github.com/vitalets/playwright-bdd)

Справка по E2E. Не является постоянным фокусом спринта: расширять покрытие и править формулировки сценариев — по запросу команды после ревью.

## Конвенции

- Исполняемые сценарии: [`e2e/features/`](../../e2e/features/) (`# language: ru`).
- Индекс в docs: [`docs/01-goal/scenarios/`](../01-goal/scenarios/) — ID, компоненты, ссылка на feature, статус `e2e`.
- Теги: `@S-xxx`, `@smoke` (PR), `@wip` (ещё не гонят). Путь `frequent/` / `occasional/` / `rare/` задаёт группу.
- UI: по возможности `data-testid`. Auth в CI без Logto Cloud: `VITE_E2E=1` → `__tavridaE2E.signInDev()`.

## Команды

```bash
pnpm test:e2e
pnpm test:e2e:smoke
```

`E2E_BASE_URL` (default `http://127.0.0.1:5173`). CI: job **E2E smoke** (`@smoke`, Chromium).

Backlog волн W1–W4 — в [`AGENT-TODO.todo`](../../AGENT-TODO.todo), не дублировать здесь.

## Связанное

- [IMPLEMENTATION-PLAN T5](./IMPLEMENTATION-PLAN.md) · [platform-scenarios](../01-goal/platform-scenarios.md)

---

**Автор:** команда разработки · **Версия:** 0.2
