# 🧩 Микросервисы

> **Статус:** draft · **Версия:** 0.1

## 🎯 Назначение

Каталог спецификаций микросервисов Tavrida Lot. Каждый сервис — отдельный NestJS-проект в `services/`.

## 📦 Сервисы

| Сервис | Порт | Статус кода | Документ |
|--------|------|-------------|----------|
| 🌐 bff | — | 📝 | [bff](./bff/README.md) |
| 💰 billing | 3001 | 🚧 | [billing](./billing/README.md) |
| 📋 financial-policy | 3002 | 🚧 | [financial-policy](./financial-policy/README.md) |
| 🔨 auction | — | 🚧 | [auction](./auction/README.md) |
| 🔔 auction-subscriptions | — | 🚧 | [auction_subscriptions](./auction_subscriptions/README.md) |
| ⭐ rating | — | 📝 | [rating](./rating/README.md) |
| 💬 feedback | — | 📝 | [feedback](./feedback/README.md) |
| 🗣️ forum | — | 📝 | [forum/requirements](./forum/requirements/README.md) |
| 👤 user-profile | — | 📝 | [user-profile](./user-profile/README.md) |
| ⚙️ settings | — | 📝 | [settings](./settings/README.md) |
| 📬 notifications | — | 📝 | [notifications](./notifications/README.md) |
| 🛒 marketplace | — | 📝 | [marketplace](./marketplace/README.md) |

> Спецификация новых сервисов: [MICROSERVICE-SPEC](./MICROSERVICE-SPEC.md) · Реестр переменных: [PLATFORM-REGISTRY](./PLATFORM-REGISTRY.md)

## 🔗 Общие паттерны

- Проверка лимитов → `financial-policy` (`POST /limits/check`)
- Списание средств → `billing` (`POST /wallets/charge`)
- Настройки формул → `settings` (`GET /settings/{domain}`)
- Доступ к сервисам — только через **BFF** (кроме внутренних HTTP/RabbitMQ)

## 🔗 Связанные разделы

- [Архитектура](../03-architecture/README.md)
- [API](../06-api/README.md)
- [Guidelines](../13-maintenance/docs-guidelines.md)

---

**Автор:** команда разработки · **Версия:** 0.1-draft
