# 📚 Документация Tavrida Lot

> Платформа для обсуждения и продажи находок (Крым). Статус: **draft v0.2**

**Опубликованная версия (GitHub Pages):** [https://andrewb76.github.io/tavrida/](https://andrewb76.github.io/tavrida/)  
Сборка: `@tavrida/docs-site` · workflow [docs-pages.yml](../.github/workflows/docs-pages.yml) · см. [github-actions.md](./04-deployment/github-actions.md)

---

## 👥 Платформа для людей

| Документ | Описание |
|----------|----------|
| [🌊 platform-for-users](./01-goal/platform-for-users.md) | Функциональность без технического жаргона |
| [🏛️ club-access](./01-goal/club-access.md) | Клуб: лендинг, инвайт-only |
| [⭐ karma-and-rating](./01-goal/karma-and-rating.md) | Рейтинг, карма, формулы, referral |
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
| 11 | [UX/UI](./11-ux-ui/README.md) | Wireframes, design tokens, IA |
| 12 | [Процесс разработки](./12-dev-process/README.md) | Git, code review, релизы |
| 13 | [Сопровождение](./13-maintenance/README.md) | Guidelines, changelog |
| 14 | [Фронтенд](./14-frontend/README.md) | SPA: стек, API-слой, auth, сборка |

## 🏗️ Ключевые документы (фундамент)

| Документ | Описание |
|----------|----------|
| [platform-for-users](./01-goal/platform-for-users.md) | **Продукт:** функциональность для людей |
| [platform-scenarios](./01-goal/platform-scenarios.md) | **Поведение:** индекс + [частые / средние / редкие](./01-goal/scenarios/frequent.md) |
| [roles](./01-goal/roles.md) | **Продукт:** роли и права |
| [karma-and-rating](./01-goal/karma-and-rating.md) | **Продукт:** рейтинг, карма, referral |
| [content-brief](./01-goal/content-brief.md) | **Контент:** ТЗ справочника |
| [legal-documents](./01-goal/legal-documents.md) | **Legal:** документы платформы |
| [club-access](./01-goal/club-access.md) | **Продукт:** закрытый клуб |
| [PLATFORM-REGISTRY](./05-microservices/PLATFORM-REGISTRY.md) | **Конфиг:** settings + financial-policy + цены |
| [PLATFORM-SECRETS](./02-infrastructure/PLATFORM-SECRETS.md) | **Секреты:** env vars для Bitwarden / runtime |
| [PROJECT-CONTEXT](./00-meta/PROJECT-CONTEXT.md) | **Bootstrap:** краткий контекст для новой сессии |
| [keto-schema](./09-security/keto-schema.md) | **Auth:** Ory Keto namespace |
| [MICROSERVICE-SPEC](./05-microservices/MICROSERVICE-SPEC.md) | Требования к docs и коду каждого сервиса |
| [Event catalog](./03-architecture/event-catalog.md) | Все RabbitMQ-события |
| [Deployment](./04-deployment/README.md) | Swarm, CI/CD, migrations |
| [Observability](./07-observability/README.md) | Grafana, SLO, logging |
| [Security ops](./09-security/security-ops.md) | Network, secrets, incidents |
| [UX / wireframes](./11-ux-ui/README.md) | Design tokens, IA, screens W01–W10 |
| [Frontend SPA](./14-frontend/README.md) | Vue app spec, routes |
| [ADR index](./03-architecture/adr/README.md) | Архитектурные решения |
| [moderator-mapping](./09-security/moderator-mapping.md) | UX ↔ Logto ↔ Keto |
| [naming](./13-maintenance/naming.md) | Именование сервисов, schema, registry |
| [Notifications analysis](./03-architecture/notifications-analysis.md) | Выбор платформы уведомлений |

## 🧩 Микросервисы

| Сервис | Статус | Документ |
|--------|--------|----------|
| 🌐 BFF | ✅ spec ready | [bff](./05-microservices/bff/README.md) |
| 💰 billing | ✅ spec ready | [billing](./05-microservices/billing/README.md) |
| 📋 financial-policy | ✅ spec ready | [financial-policy](./05-microservices/financial-policy/README.md) |
| 🔨 auction | ✅ spec ready | [auction](./05-microservices/auction/README.md) |
| 🔔 subscriptions | ✅ spec ready | [subscriptions](./05-microservices/subscriptions/README.md) |
| ⭐ rating | ✅ spec ready | [rating](./05-microservices/rating/README.md) |
| 💬 deal-feedback | ✅ spec ready | [deal_feedback](./05-microservices/deal_feedback/README.md) |
| 🗣️ forum | ✅ spec ready | [forum](./05-microservices/forum/README.md) · [requirements](./05-microservices/forum/requirements/README.md) |
| 👤 user-profile | ✅ spec ready | [user-profile](./05-microservices/user-profile/README.md) |
| ⚙️ settings | ✅ spec ready | [settings](./05-microservices/settings/README.md) |
| 📬 notifications | ✅ spec ready | [notifications](./05-microservices/notifications/README.md) |
| 🛒 marketplace | ✅ spec ready | [marketplace](./05-microservices/marketplace/README.md) |

**Легенда:** 📝 draft/spec · 🚧 код в `services/` (каркас)

## 📋 Roadmap документации

| Фаза | Статус | Содержание |
|------|--------|------------|
| **1. Фундамент** | ✅ done | Architecture, API, Events, ADR 001–005, naming, moderator-mapping |
| **2. Core services** | ✅ done | billing, financial-policy, auction, bff |
| **3. Domain services** | ✅ done | rating, feedback, forum, user-profile, settings, notifications, marketplace, auction-subscriptions |
| **4. Ops** | ✅ done | deployment, observability SLO, security ops, testing, dev-process |
| **5. UX** | ✅ done | design tokens, IA, wireframes W01–W10 |
| **6. Frontend** | ✅ spec | [SPA-спецификация](./14-frontend/README.md), реализация ⏳ |
| **7. CI / Docs site** | ✅ done | [GitHub Actions](./04-deployment/github-actions.md), `@tavrida/docs-site` |

---

**Автор:** команда разработки · **Версия:** 0.2-draft
