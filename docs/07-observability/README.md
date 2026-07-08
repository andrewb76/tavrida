# 📊 Observability

> **Статус:** spec ready · **Версия:** 0.2

## 🎯 Назначение

Мониторинг, логирование, трейсинг и алертинг Tavrida Lot.

## 📦 Стек

| Инструмент | Назначение |
|------------|------------|
| Grafana Cloud | Метрики (Mimir), логи (Loki), трейсы (Tempo) |
| OpenTelemetry | SDK в NestJS-сервисах |
| Sentry | Ошибки frontend + backend |
| Dozzle / Jaeger | Local debug ([dev-tools](../02-infrastructure/dev-tools.md)) |

## 📄 Документы

| Документ | Описание |
|----------|----------|
| [logging-metrics.md](./logging-metrics.md) | JSON logs, metric names, OTel |
| [grafana-setup.md](./grafana-setup.md) | Cloud stack, dashboards, alerts |
| [slo.md](./slo.md) | SLI/SLO targets |
| [sentry-setup.md](./sentry-setup.md) | Sentry NestJS + Vue |

## 📋 Implementation TODO

- [ ] Alloy agent в stack-tools
- [ ] OTel bootstrap shared package `@tavrida/otel`
- [ ] Grafana dashboards as code (optional)
- [ ] SLO recording rules в Mimir

## 🔗 Связанные разделы

- [Деплой](../04-deployment/README.md)
- [Тестирование](../08-testing/README.md)
- [PLATFORM-SECRETS](../02-infrastructure/PLATFORM-SECRETS.md)

---

**Автор:** команда разработки · **Версия:** 0.2-spec
