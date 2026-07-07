# 📊 Observability

> **Статус:** draft · **Версия:** 0.1

## 🎯 Назначение

Мониторинг, логирование, трейсинг и алертинг для Tavrida Lot.

## 📦 Стек

| Инструмент | Назначение |
|------------|------------|
| Grafana Cloud | Метрики, логи, трейсы |
| Sentry | Ошибки фронта и бэка |

## 📄 Документы

| Документ | Описание | Статус |
|----------|----------|--------|
| [sentry-setup.md](./sentry-setup.md) | Интеграция Sentry (NestJS + Vue) | ✅ |
| [grafana-setup.md](./grafana-setup.md) | Grafana Cloud, дашборды, алерты | 📝 TODO |

## 📋 TODO

- [ ] Стандарт именования метрик (`tavrida_lot_{service}_{metric}`)
- [ ] Structured logging (JSON, correlation ID)
- [ ] OpenTelemetry SDK в NestJS-сервисах
- [ ] SLI/SLO для критичных эндпоинтов

## 🔗 Связанные разделы

- [Инфраструктура](../02-infrastructure/README.md)
- [Тестирование](../08-testing/README.md)

---

**Автор:** команда разработки · **Версия:** 0.1-draft
