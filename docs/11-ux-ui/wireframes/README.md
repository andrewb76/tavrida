# 📐 Wireframes — индекс экранов

> **Статус:** spec ready · **Версия:** 0.4  
> **Продукт:** [platform-for-users](../../01-goal/platform-for-users.md) · **Токены:** [design-tokens](../design-tokens.md)  
> **Дерево + флаги:** [screen-tree](../screen-tree.md)

Low-fi спецификации для `apps/frontend`. Figma — optional; каталог — **источник структуры**.

## 📏 Глобальный формат (принято)

Каждый экран **W01–W16** описывается **тремя блоками**:

| # | Блок | Назначение |
|---|------|------------|
| 1 | **Содержание экрана** | зоны, элементы, поведение, states, API/WS |
| 2 | **ASCII box** | визуальная компоновка (mobile-first) |
| 3 | **Component tree** | иерархия Vue-компонентов для реализации |

Шаблон: [TEMPLATE.md](./TEMPLATE.md) · обоснование форматов: [format-lab](./format-lab/README.md) (выбор: A + C + содержание).

## 📋 Экраны

| ID | Экран | Документ | MVP | WF |
|----|-------|----------|-----|-----|
| W01 | Лендинг, Home member | [home-auth.md](./home-auth.md) | ✅ | 📐 |
| W02 | Каталог лотов | [auctions.md](./auctions.md#w02--каталог-лотов) | ✅ | 📐 |
| W03 | Страница лота + modal ставки | [auctions.md](./auctions.md#w03--страница-лота) | ✅ | 📐 |
| W04 | Создание лота | [auctions.md](./auctions.md#w04--создание-лота) | ✅ | 📐 |
| W05 | Список тем форума | [forum.md](./forum.md#w05--список-тем) | ✅ | 📐 |
| W06 | Страница темы | [forum.md](./forum.md#w06--страница-темы) | ✅ | 📐 |
| W07 | Профиль | [profile-wallet.md](./profile-wallet.md#w07--профиль) | ✅ | 📐 |
| W08 | Кошелёк, тарифы, deposit/plan modals | [profile-wallet.md](./profile-wallet.md#w08--кошелёк-и-тарифы) | ✅ | 📐 |
| W09 | Маркет услуг (+ order modal) | [marketplace.md](./marketplace.md) | ⏳ v1.1 | 📐 |
| W10 | Feedback modal | [profile-wallet.md](./profile-wallet.md#w10--отзыв-после-сделки) | ✅ | 📐 |
| W11 | Инвайт (ввод кода) | [home-auth.md](./home-auth.md#w11--инвайт-ввод-кода) | ✅ | 📐 |
| W12 | О клубе | [home-auth.md](./home-auth.md#w12--о-клубе) | ✅ | 📐 |
| W13 | Управление инвайтами | [home-auth.md](./home-auth.md#w13--управление-инвайтами) | ✅ | 📐 |
| W14 | Новая тема форума | [forum.md](./forum.md#w14--новая-тема) | ✅ | 📐 |
| W15 | Inbox (Novu) | [overlays.md](./overlays.md#w15--центр-уведомлений-inbox) | ✅ | 📐 |
| W16 | Paywall modal | [overlays.md](./overlays.md#w16--paywall-pro-фичи) | ✅ | 📐 |

**Без wireframe (⬜):** OAuth `/callback`, Webhooks settings, Admin — см. [screen-tree](../screen-tree.md).

## 📐 Общие паттерны

| Pattern | Описание |
|---------|----------|
| **Page shell** | Header + main + mobile bottom nav |
| **List + filters** | Sticky filter bar, cursor pagination «Ещё» |
| **Realtime badge** | Pulse dot on live auction card |
| **Paywall chip** | Pro feature → W16 modal with link `/plans` |
| **Empty state** | Illustration placeholder + primary CTA |
| **Error banner** | RFC 7807 `detail` under title |

## 📱 Mobile-first checklist

- [ ] Touch targets ≥ 44px
- [ ] Bid / post CTAs fixed bottom on lot/topic screens
- [ ] Image gallery swipe on lot page
- [ ] Collapse long forum threads (load more)

## 🔗 Связанные разделы

- [screen-tree](../screen-tree.md)
- [information-architecture](../information-architecture.md)
- [14-frontend](../../14-frontend/README.md)

---

**Автор:** команда разработки · **Версия:** 0.4-spec
