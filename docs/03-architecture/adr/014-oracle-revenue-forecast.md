# ADR-014: Oracle — прогноз дохода (симулятор)

> **Статус:** accepted · **Дата:** 2026-07-11

## 🎯 Контекст

Монетизация размазана по `billing`, `plan-config`, domain-сервисам и [PLATFORM-REGISTRY](../../05-microservices/PLATFORM-REGISTRY.md). Founder/admin нужен **один экран** для «что если» (регистрации, mix планов, цены, затраты) без ручного Excel.

Риск без ADR: дублирование формул в UI и в production charge paths.

## ✅ Решение

1. **Каталог** — [monetization-catalog.md](../../01-goal/monetization-catalog.md) как индекс всех потоков.
2. **Формулы** — `@tavrida/monetization-engine` ([ADR-015](./015-monetization-engine.md)): pure functions, один source of truth для Oracle **и** platform charge paths.
3. **Oracle** — read-only симулятор; **не** alternative billing path.
4. **Доступ** — admin-only (`/admin/oracle` via BFF).
5. **Деплой по фазам:**
   - Фаза 1: BFF + `packages/monetization-engine` + `config/oracle.defaults.yaml`.
   - Фаза 3: `services/oracle` :3013 при saved scenarios.
6. **Конфиг:** [`config/oracle.defaults.yaml`](../../config/oracle.defaults.yaml) — ranges для совещаний; позже `oracle.*` в scalar-config.
7. **Аудитория:** founder/admin only; export → backlog.
8. **Реферал в прогнозе:** default off; отдельная вкладка с деревом.
9. **Затраты:** line items → total burn; manual total → только breakEvenMonth.

## 📎 Принятые продуктовые решения (2026-07-11)

См. [oracle-config.md](../../05-microservices/oracle/oracle-config.md).

## ❌ Отклонённые варианты

| Вариант | Почему нет |
|---------|------------|
| Формулы только во фронте | Расхождение с billing/plan-config |
| Писать assumptions в scalar-config | Загрязнение production config |
| Сразу отдельный сервис | Overhead до появления сохранённых сценариев |
| Использовать billing history как SoT прогноза | History = факт; прогноз = assumptions (разные задачи; merge в фазе 4) |

## 📎 Последствия

- Новая платная фича → обновить monetization-catalog + registry + monetization-engine.
- UI Oracle — не показывать placeholder-цены Basic/Pro в member-facing UI ([PLATFORM-REGISTRY](../../05-microservices/PLATFORM-REGISTRY.md)).

## 🔗 Связанные

- [oracle/README](../../05-microservices/oracle/README.md)
- [ADR-015](./015-monetization-engine.md) — разделение ответственности engine vs сервисы
- [ADR-003](./003-settings-vs-financial-policy.md)
