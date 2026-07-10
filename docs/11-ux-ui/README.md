# 🎨 UX/UI и wireframes

> **Статус:** spec ready · **Версия:** 0.3  
> **Продукт:** [platform-for-users.md](../01-goal/platform-for-users.md)  
> **Код:** [14-frontend](../14-frontend/README.md)

## 📄 Документы

| Документ | Описание |
|----------|----------|
| [brandbook.md](./brandbook.md) | Идентичность, тон, палитра «морские чернила и патина» |
| [design-system.md](./design-system.md) | **Дизайн-система** — токены в коде, примитивы, паттерны |
| [design-tokens.md](./design-tokens.md) | Справочник `--token-*` ↔ Tailwind |
| [information-architecture.md](./information-architecture.md) | Sitemap, nav, breakpoints |
| [screen-tree.md](./screen-tree.md) | **Дерево экранов** — масштаб UI, флаги wireframe |
| [wireframes/](./wireframes/README.md) | W01–W16: содержание + ASCII + component tree |

## 📐 Wireframes (индекс)

| ID | Экран | Файл |
|----|-------|------|
| W01, W11–W13 | Главная, auth, инвайты | [home-auth.md](./wireframes/home-auth.md) |
| W02–W04 | Аукционы | [auctions.md](./wireframes/auctions.md) |
| W05–W06, W14 | Форум | [forum.md](./wireframes/forum.md) |
| W07–W08, W10 | Профиль, кошелёк, отзыв | [profile-wallet.md](./wireframes/profile-wallet.md) |
| W09 | Маркет услуг | [marketplace.md](./wireframes/marketplace.md) |
| W15–W16 | Inbox, Paywall | [overlays.md](./wireframes/overlays.md) |

## 🧱 Компоненты

- **Tailwind** + [design-tokens](./design-tokens.md) + [design-system](./design-system.md)
- **`@tavrida/ui`** — Reka UI primitives (см. design-system §6)
- **Novu Inbox** — header bell

## 📋 TODO (design)

- [ ] Миграция `tokens.css` на палитру брендбука ([design-system §15](./design-system.md#15-миграция-кода))
- [ ] Figma file + logo
- [ ] High-fi mockups from wireframes
- [ ] Admin-ui «Инструменты» page ([dev-tools](../02-infrastructure/dev-tools.md))
- [ ] Dark theme pass

## 📘 Brandbook & design system

| Документ | Роль |
|----------|------|
| [brandbook.md](./brandbook.md) | Зачем и как выглядит бренд |
| [design-system.md](./design-system.md) | Как собирать UI в коде |

## 🔗 Связанные разделы

- [platform-for-users](../01-goal/platform-for-users.md)
- [14-frontend](../14-frontend/README.md)
- [forum requirements](../05-microservices/forum/requirements/README.md)

---

**Автор:** команда разработки · **Версия:** 0.2-spec
