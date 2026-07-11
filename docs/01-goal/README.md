# 🎯 Цель и назначение платформы

> **Раздел:** продуктовое видение и пользовательское описание

## 📄 Документы раздела

| Документ | Аудитория | Описание |
|----------|-----------|----------|
| **Этот README** | PM, архитекторы | Миссия, сценарии, NFR |
| **[platform-for-users.md](./platform-for-users.md)** | Все | Функциональность человеческим языком |
| **[platform-scenarios.md](./platform-scenarios.md)** | PM, QA, dev | Индекс: 3 группы по частоте, стандарты TDD/BDD |
| **[scenarios/frequent.md](./scenarios/frequent.md)** | QA, dev | ~85% — core loop |
| **[scenarios/occasional.md](./scenarios/occasional.md)** | QA, dev | ~12% — монетизация |
| **[scenarios/rare.md](./scenarios/rare.md)** | QA, security | ~3% — mod, admin, edge |
| **[club-access.md](./club-access.md)** | PM, UX | Закрытый клуб, лендинг, инвайты |
| **[content-brief.md](./content-brief.md)** | PM, legal, контент | ТЗ на справочник клуба |
| **[legal-documents.md](./legal-documents.md)** | legal, PM | Перечень юр. документов |
| **[karma-and-rating.md](./karma-and-rating.md)** | PM, QA, dev | Рейтинг, карма, формулы, referral |
| **[roles.md](./roles.md)** | PM, UX, разработчики | Роли, тарифы, права, матрица доступа |
| **[monetization-catalog.md](./monetization-catalog.md)** | PM, founder, admin | Индекс доходов/расходов + формулы для Oracle |
| **[PROJECT-CONTEXT.md](../00-meta/PROJECT-CONTEXT.md)** | Dev, AI | Bootstrap — краткий контекст проекта |

> 👉 Новым участникам — [platform-for-users.md](./platform-for-users.md).  
> 👉 Новая dev/AI-сессия — [PROJECT-CONTEXT.md](../00-meta/PROJECT-CONTEXT.md) или [AGENTS.md](../../AGENTS.md).

## 🚀 Миссия

Создать удобную платформу для обсуждения и продажи находок с упором на регион Крым.

## 📱 Основные сценарии

Полный реестр — **[platform-scenarios.md](./platform-scenarios.md)** (индекс) · [частые](./scenarios/frequent.md) · [средние](./scenarios/occasional.md) · [редкие](./scenarios/rare.md).

Кратко:
- Пользователь публикует лот на аукционе (разные типы аукционов).
- Пользователь обсуждает находки на форуме.
- Пользователь покупает/продаёт платные услуги (маркет услуг).
- Система управляет доступом по планам (Free/Basic/Pro), лимитами, кармой/рейтингами; **вход в клуб — только по инвайту**.

## ✅ Ключевые требования (NFR)

- Поддержка разных типов аукционов (английский, голландский и т.п.).
- Современный UX/UI, адаптивность.
- Масштабируемость, отказоустойчивость, наблюдаемость.

## 🔗 Связанные разделы

- [UX/UI](../11-ux-ui/README.md)
- [Микросервисы](../05-microservices/README.md)
- [Архитектура](../03-architecture/README.md)
