# 🧩 Микросервисы

> **Статус:** draft · **Версия:** 0.2 · **Обновлено:** 2026-07-16

## 🎯 Назначение

Каталог спецификаций микросервисов Tavrida Lot. Каждый сервис — отдельный NestJS-проект в `services/` (кроме docs-only).

## 📦 Сервисы

| Сервис | Порт | Статус кода | Docs | Документ |
|--------|------|-------------|------|----------|
| 🌐 bff | 3000 | 🚧 scaffold+ | ✅ spec | [bff](./bff/README.md) |
| 💰 billing | 3001 | 🚧 | ✅ spec | [billing](./billing/README.md) |
| 📋 plan-config | 3002 | 🚧 | ✅ spec | [plan-config](./plan-config/README.md) |
| 🔨 auction | 3003 | 🚧 | ✅ spec | [auction](./auction/README.md) |
| 🔔 subscriptions | 3004 | 🚧 CRUD + match | ✅ spec | [subscriptions](./subscriptions/README.md) |
| ⭐ rating | — | 📝 docs only | ✅ spec | [rating](./rating/README.md) |
| 💬 deal-feedback | 3006 | 🚧 pending + submit | ✅ spec | [deal_feedback](./deal_feedback/README.md) |
| 🗣️ forum | 3009 | 🚧 topics/tags/votes | ✅ spec | [forum](./forum/README.md) |
| 👤 user-profile | 3007 | 🚧 | ✅ spec | [user-profile](./user-profile/README.md) |
| ⚙️ scalar-config | 3008 | 🚧 | ✅ spec | [scalar-config](./scalar-config/README.md) |
| 📬 notifications | 3010 | 🚧 trigger + mock/Novu | ✅ spec | [notifications](./notifications/README.md) |
| 🔗 webhooks | **3015** | 📝 docs only | ✅ spec | [webhooks](./webhooks/README.md) |
| 🛒 marketplace | **3011** | 🚧 listings/orders | ✅ spec | [marketplace](./marketplace/README.md) |
| 🎁 referral-rewards | 3012 | 📝 docs / engine v0 | ✅ spec | [referral-rewards](./referral-rewards/README.md) |
| 🔮 vanga | 3013 | 📝 (BFF+UI sim) | ✅ spec draft | [vanga](./vanga/README.md) |
| ⏳ periods | 3014 | 🚧 admin + seed | ✅ spec | [periods](./periods/README.md) |
| 💬 chat | **3016** | 🚧 scaffold | ✅ spec | [chat](./chat/README.md) · [analysis](./chat/requirements/analysis.md) · [chat-api](../06-api/chat-api.md) |

> Спецификация новых сервисов: [MICROSERVICE-SPEC](./MICROSERVICE-SPEC.md) · Реестр переменных: [PLATFORM-REGISTRY](./PLATFORM-REGISTRY.md) · План дней: [WORK-PLAN-NEXT](../00-meta/WORK-PLAN-NEXT.md)

## 🔗 Общие паттерны

- Проверка лимитов → `plan-config` (`POST /limits/check`)
- Списание средств → `billing` (`POST /wallets/charge`)
- Настройки формул → `scalar-config` (`GET /settings/{domain}`)
- Исходящие webhooks → `webhooks` (события RMQ → HTTP callback) — **spec only**
- Доступ к сервисам — только через **BFF** (кроме внутренних HTTP/RabbitMQ)

## 🔗 Связанные разделы

- [Архитектура](../03-architecture/README.md)
- [API](../06-api/README.md)
- [Guidelines](../13-maintenance/docs-guidelines.md)

---

**Автор:** команда разработки · **Версия:** 0.2-draft
