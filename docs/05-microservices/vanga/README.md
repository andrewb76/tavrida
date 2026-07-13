# 🔮 Сервис: vanga

> **Статус:** spec draft · **Версия:** 0.3 · **Порт (резерв):** 3013

## С чего начать

| Шаг | Документ | Для кого |
|-----|----------|----------|
| 1 | [glossary.md](./glossary.md) | Термины |
| 2 | [overview.md](./overview.md) | Кратко всем |
| 3 | [topic-index.md](./topic-index.md) | Список тем по группам |
| 4 | [topics/](./topics/) | Детали: примеры, формулы, API |
| 5 | [IMPLEMENTATION-PLAN.md](./IMPLEMENTATION-PLAN.md) | План + checkpoints |
| 6 | [vanga-config.md](./vanga-config.md) | YAML и UX затрат |

**Конфиг:** [`config/vanga.defaults.yaml`](../../config/vanga.defaults.yaml)

## Назначение

Симулятор дохода для founder/admin: ползунки → прогноз MRR, разовых, net, **месяц окупаемости**. Read-only к prod.

- Каталог денег: [monetization-catalog.md](../../01-goal/monetization-catalog.md)
- ADR: [014](../../03-architecture/adr/014-vanga-revenue-forecast.md)

## UI (backlog)

`/admin/vanga` — вкладки по [topic-index](./topic-index.md).

## Фазы

| Фаза | Статус |
|------|--------|
| 0 Docs | ✅ |
| 1 Engine + BFF API | backlog |
| 2 Vue UI | backlog |
| 3 `services/vanga` | backlog |

---

**Версия:** 0.3-spec
