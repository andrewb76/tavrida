# 📋 Architecture Decision Records (ADR)

> Реестр архитектурных решений Tavrida Lot. Новое решение → новый файл `NNN-short-title.md`.

## 📊 Статусы

| Статус | Значение |
|--------|----------|
| proposed | На обсуждении |
| accepted | Принято, действует |
| deprecated | Заменено другим ADR |
| superseded | Ссылка на новый ADR |

## 📄 Реестр

| ADR | Название | Статус | Дата |
|-----|----------|--------|------|
| [001](./001-database-schema-per-service.md) | PostgreSQL: schema per service | accepted | 2026-07-06 |
| [002](./002-bff-rest-wss.md) | BFF: REST + WebSocket | accepted | 2026-07-06 |
| [003](./003-settings-vs-financial-policy.md) | Settings vs Financial-policy | accepted | 2026-07-06 |
| [004](./004-notifications-adapter.md) | Notifications: Novu Cloud Free + adapter | accepted | 2026-07-06 |

## 📝 Шаблон ADR

```markdown
# ADR-NNN: Название

> **Статус:** accepted · **Дата:** YYYY-MM-DD

## 🎯 Контекст
Какая проблема решается.

## ✅ Решение
Что принято.

## 🔄 Альтернативы
Что рассматривалось.

## 📌 Последствия
Плюсы, минусы, что нужно сделать.
```

---

**Автор:** команда разработки · **Версия:** 0.1
