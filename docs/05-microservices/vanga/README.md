# 🔮 Сервис: vanga

> **Статус:** in progress · **Версия:** 0.3 · **Порт (резерв):** 3013  
> **Код сервиса:** `services/vanga` — **ещё нет** (фаза 3). Симулятор сейчас в BFF + Vue.

## С чего начать

| Шаг | Документ | Для кого |
|-----|----------|----------|
| 1 | [glossary.md](./glossary.md) | Термины |
| 2 | [overview.md](./overview.md) | Кратко всем |
| 3 | [topic-index.md](./topic-index.md) | Список тем по группам |
| 4 | [topics/](./topics/) | Детали: примеры, формулы, API |
| 5 | [IMPLEMENTATION-PLAN.md](./IMPLEMENTATION-PLAN.md) | План + checkpoints |
| 6 | [vanga-config.md](./vanga-config.md) | YAML и UX затрат |

**Конфиг:** [`config/vanga.defaults.yaml`](../../../config/vanga.defaults.yaml) (корень репо)

## Назначение

Симулятор дохода для founder/admin: ползунки → прогноз MRR, разовых, net, **месяц окупаемости**. Read-only к prod.

- Каталог денег: [monetization-catalog.md](../../01-goal/monetization-catalog.md)
- ADR: [014](../../03-architecture/adr/014-vanga-revenue-forecast.md) · [015](../../03-architecture/adr/015-monetization-engine.md)

## UI

`/admin/vanga` — вкладки по [topic-index](./topic-index.md) · BFF `GET/POST /api/v1/admin/vanga/*` · формулы в `packages/monetization-engine`.

## Фазы

| Фаза | Статус |
|------|--------|
| 0 Docs | ✅ |
| 1 Engine (`monetization-engine`) + BFF API | ✅ |
| 2 Vue UI `/admin/vanga` | ✅ |
| 3 `services/vanga` (saved scenarios и т.п.) | backlog |

---

**Версия:** 0.3
