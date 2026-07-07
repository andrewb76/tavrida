# 📚 Документация Tavrida Lot

> Платформа для обсуждения и продажи находок (Крым). Статус: **draft v0.2**

## 👥 Платформа для людей

| Документ | Описание |
|----------|----------|
| [🌊 platform-for-users](./01-goal/platform-for-users.md) | Функциональность без технического жаргона |
| [👥 roles](./01-goal/roles.md) | Роли, тарифы, права, матрица доступа |

---

## 🗺️ Оглавление

| # | Раздел | Описание |
|---|--------|----------|
| 00 | [Метаданные](./00-meta/README.md) | PROJECT-CONTEXT, правила |
| 01 | [Цель](./01-goal/README.md) | Миссия · **[для пользователей](./01-goal/platform-for-users.md)** |
| 02 | [Инфраструктура](./02-infrastructure/README.md) | Окружения, Docker Swarm, хранилища |
| 03 | [Архитектура](./03-architecture/README.md) | C4, паттерны, ADR, events |
| 04 | [Деплой](./04-deployment/README.md) | CI/CD, Swarm-стеки |
| 05 | [Микросервисы](./05-microservices/README.md) | Спецификации сервисов |
| 06 | [API](./06-api/README.md) | REST, WS, ошибки, идемпотентность |
| 07 | [Observability](./07-observability/README.md) | Метрики, логи, трейсы |
| 08 | [Тестирование](./08-testing/README.md) | Unit, интеграция, нагрузка |
| 09 | [Безопасность](./09-security/README.md) | Auth, RBAC, секреты |
| 10 | [Данные](./10-data/README.md) | Schema per service, ownership |
| 11 | [UX/UI](./11-ux-ui/README.md) | Wireframes, компоненты |
| 12 | [Процесс разработки](./12-dev-process/README.md) | Git, code review, релизы |
| 13 | [Сопровождение](./13-maintenance/README.md) | Guidelines, changelog |

## 🏗️ Ключевые документы (фундамент)

| Документ | Описание |
|----------|----------|
| [platform-for-users](./01-goal/platform-for-users.md) | **Продукт:** функциональность для людей |
| [roles](./01-goal/roles.md) | **Продукт:** роли и права |
| [PLATFORM-REGISTRY](./05-microservices/PLATFORM-REGISTRY.md) | **Конфиг:** settings + financial-policy + цены |
| [PLATFORM-SECRETS](./02-infrastructure/PLATFORM-SECRETS.md) | **Секреты:** env vars для Bitwarden / runtime |
| [PROJECT-CONTEXT](./00-meta/PROJECT-CONTEXT.md) | **Bootstrap:** краткий контекст для новой сессии |
| [keto-schema](./09-security/keto-schema.md) | **Auth:** Ory Keto namespace |
| [MICROSERVICE-SPEC](./05-microservices/MICROSERVICE-SPEC.md) | Требования к docs и коду каждого сервиса |
| [Event catalog](./03-architecture/event-catalog.md) | Все RabbitMQ-события |
| [ADR index](./03-architecture/adr/README.md) | Архитектурные решения |
| [Notifications analysis](./03-architecture/notifications-analysis.md) | Выбор платформы уведомлений |

## 🧩 Микросервисы

| Сервис | Статус | Документ |
|--------|--------|----------|
| 🌐 BFF | 📝 draft | [bff](./05-microservices/bff/README.md) |
| 💰 billing | 🚧 spec ready | [billing](./05-microservices/billing/README.md) |
| 📋 financial-policy | 🚧 spec ready | [financial-policy](./05-microservices/financial-policy/README.md) |
| 🔨 auction | 🚧 spec partial | [auction](./05-microservices/auction/README.md) |
| 🔔 auction-subscriptions | 📝 draft | [auction_subscriptions](./05-microservices/auction_subscriptions/README.md) |
| ⭐ rating | 📝 spec ready | [rating](./05-microservices/rating/README.md) |
| 💬 feedback | 📝 spec ready | [feedback](./05-microservices/feedback/README.md) |
| 🗣️ forum | 📝 requirements | [forum](./05-microservices/forum/requirements/README.md) |
| 👤 user-profile | 📝 spec ready | [user-profile](./05-microservices/user-profile/README.md) |
| ⚙️ settings | 📝 spec ready | [settings](./05-microservices/settings/README.md) |
| 📬 notifications | 📝 spec ready | [notifications](./05-microservices/notifications/README.md) |
| 🛒 marketplace | 📝 spec ready | [marketplace](./05-microservices/marketplace/README.md) |

**Легенда:** 📝 draft/spec · 🚧 код в `services/` (каркас)

## 📋 Roadmap документации

| Фаза | Статус | Содержание |
|------|--------|------------|
| **1. Фундамент** | ✅ done | Architecture, API, Events, Data, ADR, MICROSERVICE-SPEC |
| **2. Core services** | ⏳ next | billing, financial-policy, auction, bff — production-spec |
| **3. Domain services** | ⏳ | rating, feedback, forum, user-profile, settings |
| **4. Ops** | ⏳ | deployment runbooks, Grafana, SLO, security depth |
| **5. UX** | ⏳ | wireframes (от [platform-for-users](./01-goal/platform-for-users.md)) |

---

**Автор:** команда разработки · **Версия:** 0.2-draft
