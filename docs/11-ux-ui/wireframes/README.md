# 📐 Wireframes — индекс экранов

> **Статус:** spec ready · **Версия:** 0.2  
> **Продукт:** [platform-for-users](../../01-goal/platform-for-users.md) · **Токены:** [design-tokens](../design-tokens.md)

Low-fi спецификации для реализации во `apps/frontend`. Figma — optional; этот каталог — **источник структуры** до появления макетов.

## 📋 Экраны

| ID | Экран | Документ | MVP |
|----|-------|----------|-----|
| W01 | Главная, auth shell | [home-auth.md](./home-auth.md) | ✅ |
| W02 | Каталог лотов | [auctions.md](./auctions.md#каталог) | ✅ |
| W03 | Страница лота | [auctions.md](./auctions.md#страница-лота) | ✅ |
| W04 | Создание лота | [auctions.md](./auctions.md#создание-лота) | ✅ |
| W05 | Список тем форума | [forum.md](./forum.md#список) | ✅ |
| W06 | Страница темы | [forum.md](./forum.md#тема) | ✅ |
| W07 | Профиль | [profile-wallet.md](./profile-wallet.md#профиль) | ✅ |
| W08 | Кошелёк и тарифы | [profile-wallet.md](./profile-wallet.md#кошелёк) | ✅ |
| W09 | Маркет услуг | [marketplace.md](./marketplace.md) | ⏳ v1.1 |
| W10 | Feedback modal | [profile-wallet.md](./profile-wallet.md#отзыв) | ✅ |

## 📐 Общие паттерны

| Pattern | Описание |
|---------|----------|
| **Page shell** | Header + main + mobile bottom nav |
| **List + filters** | Sticky filter bar, cursor pagination «Ещё» |
| **Realtime badge** | Pulse dot on live auction card |
| **Paywall chip** | Pro feature → modal with link `/plans` |
| **Empty state** | Illustration placeholder + primary CTA |
| **Error banner** | RFC 7807 `detail` under title |

## 📱 Mobile-first checklist

- [ ] Touch targets ≥ 44px
- [ ] Bid / post CTAs fixed bottom on lot/topic screens
- [ ] Image gallery swipe on lot page
- [ ] Collapse long forum threads (load more)

## 🔗 Связанные разделы

- [information-architecture](../information-architecture.md)
- [14-frontend](../../14-frontend/README.md)

---

**Автор:** команда разработки · **Версия:** 0.2-spec
