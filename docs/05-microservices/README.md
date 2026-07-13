# 🧩 Микросервисы

> **Статус:** draft · **Версия:** 0.1

## 🎯 Назначение

Каталог спецификаций микросервисов Tavrida Lot. Каждый сервис — отдельный NestJS-проект в `services/`.

## 📦 Сервисы

| Сервис | Порт | Статус кода | Docs | Документ |
|--------|------|-------------|------|----------|
| 🌐 bff | 3000 | 📝 | ✅ spec | [bff](./bff/README.md) |
| 💰 billing | 3001 | 🚧 | ✅ spec | [billing](./billing/README.md) |
| 📋 plan-config | 3002 | 🚧 | ✅ spec | [plan-config](./plan-config/README.md) |
| 🔨 auction | 3003 | 🚧 | ✅ spec | [auction](./auction/README.md) |
| 🔔 subscriptions | 3004 | 🚧 CRUD v1 | ✅ spec | [subscriptions](./subscriptions/README.md) |
| ⭐ rating | — | 📝 | ✅ spec | [rating](./rating/README.md) |
| 💬 deal-feedback | — | 📝 | ✅ spec | [deal_feedback](./deal_feedback/README.md) |
| 🗣️ forum | — | 📝 | ✅ spec | [forum](./forum/README.md) |
| 👤 user-profile | — | 📝 | ✅ spec | [user-profile](./user-profile/README.md) |
| ⚙️ scalar-config | — | 📝 | ✅ spec | [scalar-config](./scalar-config/README.md) |
| 📬 notifications | 3010 | 📝 | ✅ spec | [notifications](./notifications/README.md) |
| 🔗 webhooks | 3011 | 📝 | ✅ spec | [webhooks](./webhooks/README.md) |
| 🛒 marketplace | — | 📝 | ✅ spec | [marketplace](./marketplace/README.md) |
| 🎁 referral-rewards | 3012 | 📝 | ✅ spec | [referral-rewards](./referral-rewards/README.md) |
| 🔮 vanga | 3013 | 📝 | ✅ spec draft | [vanga](./vanga/README.md) |

> Спецификация новых сервисов: [MICROSERVICE-SPEC](./MICROSERVICE-SPEC.md) · Реестр переменных: [PLATFORM-REGISTRY](./PLATFORM-REGISTRY.md)

## 🔗 Общие паттерны

- Проверка лимитов → `plan-config` (`POST /limits/check`)
- Списание средств → `billing` (`POST /wallets/charge`)
- Настройки формул → `scalar-config` (`GET /settings/{domain}`)
- Исходящие webhooks → `webhooks` (события RMQ → HTTP callback)
- Доступ к сервисам — только через **BFF** (кроме внутренних HTTP/RabbitMQ)

## 🔗 Связанные разделы

- [Архитектура](../03-architecture/README.md)
- [API](../06-api/README.md)
- [Guidelines](../13-maintenance/docs-guidelines.md)

---

**Автор:** команда разработки · **Версия:** 0.1-draft
