# 🗺️ Roadmap документации → «Идеал»

> **Статус:** living doc · **Версия:** 0.1 · **Обновлять** при закрытии пунктов backlog  
> **Опубликовано:** [GitHub Pages](https://andrewb76.github.io/tavrida/) · сборка: `@tavrida/docs-site`

## 🎯 Что такое «идеал»

Документация **готова к реализации и сопровождению**, если:

| Критерий | Смысл |
|----------|--------|
| **Два слоя** | [platform-for-users](../01-goal/platform-for-users.md) (люди) + технические specs (код) синхронизированы |
| **Сервисы** | Каждый bounded context по [MICROSERVICE-SPEC](../05-microservices/MICROSERVICE-SPEC.md) |
| **Конфиг** | [PLATFORM-REGISTRY](../05-microservices/PLATFORM-REGISTRY.md) + [PLATFORM-SECRETS](../02-infrastructure/PLATFORM-SECRETS.md) полные |
| **События** | [event-catalog](../03-architecture/event-catalog.md) + [messaging](../03-architecture/messaging.md) без пробелов для MVP |
| **ADR** | Принятые решения в [adr/](../03-architecture/adr/README.md); proposed — явно помечены |
| **Сценарии** | BDD/TDD [platform-scenarios](../01-goal/platform-scenarios.md) покрывают MVP-потоки |
| **UX** | IA + wireframes + [frontend spec](../14-frontend/README.md) |
| **Ops** | Деплой, observability, security ops — spec ready |
| **Legal** | Черновики L-01…L-17 **или** явный TBD с владельцем |
| **Сайт** | VitePress: sync, автосайдбар, CI, **без битых ссылок**, mermaid читаем |
| **API** | Конвенции + **OpenAPI** (или generated) как single source |
| **Живость** | Один roadmap (этот файл), без устаревших дублей и ghost-планов |

---

## 📍 Где мы сейчас

```text
Спецификации (docs)     ████████████████░░░░  ~80 %
Продуктовый слой        ███████████████░░░░░  ~75 %
Ops / infra docs        ██████████████░░░░░░  ~70 %
UX / frontend spec      ███████████████░░░░░  ~75 %
Legal тексты            ████░░░░░░░░░░░░░░░░  ~20 %
Код ↔ docs parity       ███░░░░░░░░░░░░░░░░░  ~15 %
CI quality (links, etc.)████████░░░░░░░░░░░░░░  ~40 %
```

**Фаза проекта:** docs **v0.2** — spec-ready для MVP; **реализация** — каркас нескольких сервисов.

**Последние крупные шаги:** webhooks + ADR-011, messaging, автосайдбар VitePress, GitHub Pages.

---

## ✅ Есть (не дублировать)

### Продукт и цель

| Область | Документы |
|---------|-----------|
| Для людей | platform-for-users, club-access, karma-and-rating, roles |
| Сценарии | platform-scenarios → frequent / occasional / rare |
| Legal (индекс) | legal-documents L-01…L-17 |
| Контент форума | content-brief, forum/knowledge-base, tags |

### Архитектура

| Область | Статус |
|---------|--------|
| C4 L1–L2, паттерны | [03-architecture/README](../03-architecture/README.md) |
| ADR 001–007, **011** accepted | [adr/README](../03-architecture/adr/README.md) |
| ADR 008–010 | proposed |
| Event catalog + messaging | ✅ |

### Микросервисы (spec ready)

bff, billing, financial-policy, auction, subscriptions, rating, deal-feedback, forum, user-profile, settings, notifications, **webhooks**, marketplace — см. [каталог](../05-microservices/README.md).

### Ops и инфра

deployment, github-actions, observability/SLO, security (keto, moderator-mapping, security-ops), PLATFORM-SECRETS, naming.

### UX / frontend

design-tokens, IA, wireframes W01–W10 (W09 marketplace — v1.1), [14-frontend](../14-frontend/README.md).

### Публикация

`@tavrida/docs-site`, sync-docs, generate-sidebar, workflow docs-pages.

---

## ❌ Нет или слабо

| Пробел | Почему важно |
|--------|----------------|
| **OpenAPI** (`06-api/openapi.yaml`) | Контракт BFF ↔ клиент; codegen |
| **C4 Level 3** (BFF, auction) | Onboarding разработчиков |
| **Тексты legal L-01…L-17** | Только оглавление; нужен review юристов |
| **admin-ui** | Не описан (архитектурный TODO) |
| **docker/** в репо | Контракт в docs, каталог кода — TODO |
| **ADR: mTLS / service JWT** | Упомянуто в API/security, решения нет |
| **Проверка ссылок в CI** | `ignoreDeadLinks: true` маскирует проблемы |
| **Mermaid на Pages** | Диаграммы могут не рендериться (нужна проверка) |
| **CHANGELOG docs** | Нет истории изменений доков |
| **Цены Basic/Pro** | TBD в registry / admin |
| **Marketplace юридика/комиссия** | TBD (platform-for-users) |
| **Код vs docs** | 4 сервиса с каркасом; остальные — только docs |

### Намеренные заглушки (не удалять пока)

| Путь | Назначение |
|------|------------|
| `feedback/`, `auction_subscriptions/` | Redirect на deal-feedback / subscriptions ([ADR-006](../03-architecture/adr/006-service-renames-deal-feedback-subscriptions.md)) |

---

## 📋 Backlog → идеал (приоритет)

### P0 — качество сайта и навигации

- [ ] Прогнать link-check по `content/` после sync; убрать битые ссылки (AGENTS.md, `.env.example` и т.п.)
- [ ] Проверить mermaid на GitHub Pages; при необходимости plugin или статичные SVG
- [ ] CI: `pnpm docs:build` уже есть — добавить optional link checker

### P1 — контракты и архитектура

- [ ] OpenAPI draft для BFF public API
- [x] ADR-011 в [adr/README](../03-architecture/adr/README.md)
- [ ] ADR service-to-service auth (JWT vs mTLS) — закрыть TODO в 06-api / 09-security
- [ ] C4 Level 3: BFF + auction (компоненты)

### P2 — продукт и legal

- [ ] Черновики L-01, L-02, L-04 для MVP (остальное — по мере фич)
- [ ] L-17 webhooks — финал после юристов
- [ ] W09 marketplace wireframe v1.1
- [ ] Цены подписок в PLATFORM-REGISTRY (после решения PM)

### P3 — сопровождение

- [ ] `CHANGELOG-docs.md` или release notes секция в 13-maintenance
- [ ] Удалить deprecated stubs `feedback/`, `auction_subscriptions/` **после** переименования в коде
- [ ] admin-ui spec (отдельный doc или модуль BFF)
- [ ] `docker/` каталог + связка с 04-deployment

### P4 — post-MVP (ADR proposed)

- [ ] ADR-008 OpenSearch — принять или отложить
- [ ] ADR-009 E2EE deal chat
- [ ] ADR-010 JWT на Traefik — принять для prod

---

## 🧹 Удалено / не использовать

| Что | Действие |
|-----|----------|
| `.gigacode/plans/fix-markdown-formatting.md` | **Удалён** — устарел (пустые README уже заполнены) |
| Дублирующие TODO в разделах | Сводим сюда; в README разделов — ссылка на этот файл |
| Ручной сайдбар VitePress | Заменён на `generate-sidebar.mjs` |

Локальные черновики — только вне git (`.gigacode/` в `.gitignore`). Планы для команды — **только** этот roadmap в `docs/`.

---

## 🔗 Быстрые ссылки

| Задача | Старт |
|--------|--------|
| Новая сессия | [PROJECT-CONTEXT](./PROJECT-CONTEXT.md) |
| Новый сервис | [MICROSERVICE-SPEC](../05-microservices/MICROSERVICE-SPEC.md) |
| Новая переменная | [PLATFORM-REGISTRY](../05-microservices/PLATFORM-REGISTRY.md) |
| Правила правок | [docs-guidelines](../13-maintenance/docs-guidelines.md) |
| Оглавление | [docs/README](../README.md) |

---

**Автор:** команда разработки · **Последнее обновление:** 2026-07-09
