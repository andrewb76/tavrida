# 📒 Реестр переменных платформы

> **Статус:** draft · **Версия:** 0.1  
> **Единый источник истины** для всех настраиваемых параметров Tavrida Lot.

Два реестра (см. [ADR-003](../03-architecture/adr/003-settings-vs-financial-policy.md)):

| Реестр | Сервис | Значений на ключ | Кто меняет |
|--------|--------|------------------|------------|
| ⚙️ **Settings** | `settings` | 1 (global или per-user) | Admin |
| 💳 **Financial-policy** | `financial-policy` | 3 (Free / Basic / Pro) | Admin |

**Правило:** при добавлении переменной в сервис — строка **здесь** + краткая секция в README сервиса.

---

## ⚙️ Settings — скалярные переменные

Одно значение на ключ. Формат: `{service}.{parameterName}`.

### rating

| Ключ | Тип | Default | Scope | Описание |
|------|-----|---------|-------|----------|
| `rating.baseValue` | number | `1` | global | Базовое значение голоса |
| `rating.authorityExponent` | number | `0.2` | global | Степень авторитета голосующего |
| `rating.contextWeights` | object | см. ниже | global | Веса по контексту |
| `rating.bonuses.earlyHours` | number | `24` | global | Окно «быстрого» отзыва (часы) |
| `rating.bonuses.earlyBonus` | number | `0.5` | global | Бонус к рейтингу за быстрый отзыв |
| `rating.bonuses.photoBonus` | number | `1.0` | global | Бонус за отзыв с фото |
| `rating.bonuses.bothBonus` | number | `2.0` | global | Бонус, если оценили обе стороны |
| `rating.penalties.penaltyDecayFactor` | number | `0.9` | global | Множитель штрафа за pending |
| `rating.penalties.banThreshold` | number | `10` | global | Порог pending → бан |
| `rating.penalties.banDurationDays` | number | `7` | global | Длительность бана (дни) |
| `rating.referral.maxDepth` | number | `2` | global | Глубина реферального дерева (N уровней) |
| `rating.referral.karmaCoefficients` | number[] | `[0.15, 0.05]` | global | α_d — вклад кармы invitee на уровне d |
| `rating.referral.ratingCoefficients` | number[] | `[0.05, 0.02]` | global | β_d — вклад рейтинга invitee на уровне d |
| `rating.referral.neutralRating` | number | `3.0` | global | Нейтраль для `(R(u) - R_neutral)` |
| `rating.referral.ratingClampMin` | number | `1.0` | global | Min `effectiveRating` |
| `rating.referral.ratingClampMax` | number | `5.0` | global | Max `effectiveRating` |

> Формулы и влияние: [karma-and-rating.md](../01-goal/karma-and-rating.md).

Default `rating.contextWeights`:

```json
{ "auction": 1.0, "forum": 1.2, "marketplace": 0.9 }
```

### club

| Ключ | Тип | Default | Scope | Описание |
|------|-----|---------|-------|----------|
| `club.registration.inviteOnly` | boolean | `true` | global | Закрытая регистрация (только инвайт) |
| `club.invite.validityDays` | number | `14` | global | Срок действия кода (дни) |
| `club.invite.codeType` | enum | `SINGLE_USE` | global | `SINGLE_USE` \| `MULTI_USE` |
| `club.landing.publicSections` | string[] | `about,rules,request` | global | Блоки публичного лендинга |

> [club-access.md](../01-goal/club-access.md)

### forum

| Ключ | Тип | Default | Scope | Описание |
|------|-----|---------|-------|----------|
| `forum.bannedWordsList` | string[] | `[]` | global | Список запрещённых слов |
| `forum.editWindowMinutes` | number | `10` | global | Окно редактирования своего поста |
| `forum.reaction.karmaWeights` | object | см. [forum](./forum/requirements/README.md) | global | Вес реакций для кармы |
| `forum.markdown.sanitizeLevel` | enum | `strict` | global | `strict` \| `documentation` |
| `forum.tags.bannedSlugs` | string[] | `[]` | global | Запрещённые slug тегов |

### auction

| Ключ | Тип | Default | Scope | Описание |
|------|-----|---------|-------|----------|
| `auction.bidIncrementDefault` | number | `100` | global | Шаг ставки по умолчанию (₽) |
| `auction.minStartingPrice` | number | `1` | global | Минимальная стартовая цена |
| `auction.expertAppraisalBoost` | number | `1.2` | global | Множитель значимости лота с экспертизой |

### marketplace

| Ключ | Тип | Default | Scope | Описание |
|------|-----|---------|-------|----------|
| `marketplace.orderAcceptTimeoutHours` | number | `48` | global | Автоотмена заказа, если поставщик не ответил (ч) |

### billing

| Ключ | Тип | Default | Scope | Описание |
|------|-----|---------|-------|----------|
| `billing.currencyDefault` | string | `RUB` | global | Валюта по умолчанию |
| `billing.minDepositAmount` | number | `100` | global | Минимальное пополнение (₽) |

### notifications

| Ключ | Тип | Default | Scope | Описание |
|------|-----|---------|-------|----------|
| `notifications.feedbackReminderDays` | number[] | `[1, 3, 7]` | global | Интервалы напоминаний об отзыве |
| `notifications.digestHourUtc` | number | `9` | global | Час отправки digest (UTC) |

### webhooks

| Ключ | Тип | Default | Scope | Описание |
|------|-----|---------|-------|----------|
| `webhooks.delivery.maxAttempts` | number | `5` | global | Попыток доставки на endpoint |
| `webhooks.delivery.initialBackoffSeconds` | number | `30` | global | Первая задержка retry |
| `webhooks.delivery.maxBackoffSeconds` | number | `3600` | global | Cap exponential backoff |
| `webhooks.delivery.timeoutMs` | number | `10000` | global | Fallback HTTP timeout |
| `webhooks.userDefaultTimeoutMs` | number | null | `user:{id}` | Дефолт timeout для всех hooks пользователя |
| `webhooks.payload.maxBytes` | number | `65536` | global | Max body после redaction |
| `webhooks.signature.header` | string | `X-Tavrida-Signature` | global | Заголовок подписи |
| `webhooks.signature.algorithm` | string | `HMAC_SHA256` | global | Алгоритм подписи |
| `webhooks.ssrf.allowPrivateIPs` | boolean | `false` | global | Запрет private IP в URL |
| `webhooks.autoDisableOnDead` | boolean | `true` | global | Auto-disable endpoint после серии DEAD |
| `webhooks.autoDisable.deadStreak` | number | `10` | global | Подряд DEAD до disable |

### settings _(мета)_

| Ключ | Тип | Default | Scope | Описание |
|------|-----|---------|-------|----------|
| `settings.cacheTtlSeconds` | number | `300` | global | TTL Redis-кэша settings |

---

## 💳 Financial-policy — тарифные переменные

Пакет значений по тарифам **Free / Basic / Pro**.  
Типы: `limit` (число, `∞` = без лимита), `feature` (boolean), `enum` (набор строк).

### auction

| Ключ | Тип | Free | Basic | Pro | Описание |
|------|-----|------|-------|-----|----------|
| `auction.activeAuctions` | limit | 5 | 20 | ∞ | Макс. одновременных участий в аукционах |
| `auction.bidsPerHour` | limit | 20 | 100 | ∞ | Ставок в час |
| `auction.auctionsCreatedPerDay` | limit | 3 | 10 | ∞ | Новых лотов в сутки |
| `auction.auctionDurationMaxHours` | limit | 72 | 336 | ∞ | Макс. длительность (часы) |
| `auction.promotionEnabled` | feature | false | false | true | Доступ к продвижению (тариф) |
| `auction.reservePriceEnabled` | feature | false | false | true | Резервная цена (тариф) |
| `auction.customDurationPresets` | feature | false | false | true | Свои шаблоны длительности |
| `auction.analyticsDashboard` | feature | false | false | true | Статистика по лотам |
| `auction.auctionTypes` | enum | `ENGLISH` | `ENGLISH,DUTCH` | `all` | Доступные типы аукционов |

### forum

| Ключ | Тип | Free | Basic | Pro | Описание |
|------|-----|------|-------|-----|----------|
| `forum.postsPerDay` | limit | 10 | 50 | ∞ | Постов в сутки |
| `forum.commentsPerPost` | limit | 10 | 50 | ∞ | Комментариев к одному посту |
| `forum.categoryDepthMax` | limit | 3 | 5 | ∞ | Уровней категорий |
| `forum.threadedCommentsDepth` | limit | 2 | 5 | ∞ | Глубина вложенных ответов |
| `forum.attachmentsMaxCount` | limit | 1 | 3 | ∞ | Файлов на пост |
| `forum.attachmentsMaxSize` | limit | 2 MB | 5 MB | 20 MB | Размер одного файла |
| `forum.tagCountMax` | limit | 3 | 10 | ∞ | Тегов на тему |
| `forum.pinnedTopicsMax` | limit | 0 | 1 | 3 | Прикреплённых тем (своих) |
| `forum.embeddedMedia` | feature | false | false | true | Встроенное медиа |
| `forum.anonymousPosts` | feature | false | false | true | Анонимные посты |
| `forum.nestedRepliesEnabled` | feature | false | true | true | Вложенные ответы |
| `forum.pushNotifications` | feature | false | false | true | Push при ответах |
| `forum.emailDigest` | feature | false | false | true | Email-дайджест по теме |
| `forum.topicChatEnabled` | feature | false | false | true | Чат внутри темы |
| `forum.searchFilters` | feature | false | false | true | Расширенный поиск |
| `forum.searchScope` | enum | `TITLE` | `FULL_TEXT` | `FULL_TEXT,FILTERS` | Глубина поиска |
| `forum.postLengthMax` | limit | 5000 | 5000 | 10000 | Макс. длина поста (символы) |
| `forum.customTopicFields` | feature | false | false | true | Кастомные поля темы |
| `forum.tagsWithPriority` | feature | false | false | true | Теги с приоритетами |
| `forum.auctionTopicLink` | feature | false | false | true | Тема «Обсуждение лота #N» |

> Маппинг UI → ключи: [forum/requirements](./forum/requirements/README.md).

### rating

| Ключ | Тип | Free | Basic | Pro | Описание |
|------|-----|------|-------|-----|----------|
| `rating.maxPendingBeforePenalty` | limit | 3 | 5 | 10 | Pending-сделок до штрафа |
| `rating.maxActiveAuctionsWhenLimited` | limit | 2 | 3 | 5 | Лимит аукционов при низком рейтинге |

### club

| Ключ | Тип | Free | Basic | Pro | Описание |
|------|-----|------|-------|-----|----------|
| `club.invitesPerMonth` | limit | 1 | 3 | 10 | Новых инвайт-кодов в месяц |
| `club.referralInfluenceEnabled` | feature | true | true | true | Учитывать referral tree в effective karma/rating |

### subscriptions

| Ключ | Тип | Free | Basic | Pro | Описание |
|------|-----|------|-------|-----|----------|
| `subscriptions.auctionCategoriesMax` | limit | 3 | 10 | ∞ | Подписок на категории аукциона |
| `subscriptions.auctionsMax` | limit | 5 | 20 | ∞ | Подписок на лоты |
| `subscriptions.forumCategoriesMax` | limit | 5 | 15 | ∞ | Подписок на категории форума |
| `subscriptions.forumTopicsMax` | limit | 10 | 50 | ∞ | Подписок на темы |
| `subscriptions.tagsMax` | limit | 3 | 10 | ∞ | Подписок на теги |
| `subscriptions.emailDigest` | feature | false | false | true | Email digest |

> Legacy: `auction_subscriptions.*` → migrate ([ADR-006](../03-architecture/adr/006-service-renames-deal-feedback-subscriptions.md)).

### webhooks

| Ключ | Тип | Free | Basic | Pro | Описание |
|------|-----|------|-------|-----|----------|
| `webhooks.endpointsMax` | limit | 0 | 2 | 10 | USER webhook endpoints на аккаунт |
| `webhooks.replaysPerDay` | limit | 0 | 5 | 50 | Ручных replay доставки / сутки |
| `webhooks.userScopeEnabled` | feature | false | true | true | Пользовательские webhooks |

> Platform endpoints (`scope=PLATFORM`) — только admin, не лимитируются FP.

### marketplace _(draft)_

| Ключ | Тип | Free | Basic | Pro | Описание |
|------|-----|------|-------|-----|----------|
| `marketplace.listingsMax` | limit | **0** | 3 | ∞ | Активных объявлений услуг (0 = только заказывать) |
| `marketplace.ordersPerMonth` | limit | 2 | 10 | ∞ | Заказов в месяц (заказчик) |
| `marketplace.portfolioItemsMax` | limit | — | 5 | 20 | Фото в портфолио на одну услугу |

---

## 💰 Разовые платежи (billing)

Не тарифные переменные — фиксированная цена за операцию. Списание через `billing.charge` + `target`.

### auction

| Target | Цена (₽) | Описание |
|--------|----------|----------|
| `auction.promotion` | 200 | Продвижение лота в списке |
| `auction.reservePrice` | 100 | Установка резервной цены |
| `auction.customDurationPreset` | 50 | Добавить шаблон длительности |

### forum

| Target | Цена (₽) | Описание |
|--------|----------|----------|
| `forum.reaction.celebrate` | 50 | Реакция 🎉 |
| `forum.reaction.laugh` | 50 | Реакция 😄 |
| `forum.reaction.smile` | 50 | Реакция 😊 |
| `forum.reaction.clap` | 50 | Реакция 👏 |
| `forum.reaction.eyes` | 50 | Реакция 👀 |
| `forum.reaction.rocket` | 100 | Реакция 🚀 |
| `forum.reaction.fire` | 100 | Реакция 🔥 |
| `forum.reaction.handshake` | 100 | Реакция 🤝 |
| `forum.reaction.brain` | 100 | Реакция 🧠 |

> `forum.reaction.pin` — только модератор, бесплатно ([roles](../01-goal/roles.md)).

---

## 📋 Подписки (тарифные планы)

Цены хранятся в `Plan` (financial-policy), задаёт admin. **Финальные цены не утверждены** — placeholder для обсуждения:

| planId | Название | Статус |
|--------|----------|--------|
| `free` | Бесплатно | 0 ₽ |
| `basic` | Базовый | **TBD** (ориентир ~99 ₽/мес — не утверждено) |
| `pro` | Pro | **TBD** (ориентир ~399 ₽/мес — не утверждено) |

> Не использовать placeholder в UI/production до решения business. Обновить этот раздел и [platform-for-users.md](../01-goal/platform-for-users.md).

---

## 🔄 Как обновлять реестр

1. Новая переменная в сервисе → строка в этот файл.
2. Settings → `POST /api/v1/settings/register` при деплое.
3. Financial-policy → `POST /api/v1/parameters/register` + `POST /api/v1/features/set-limit`.
4. Разовая цена → константа в billing + строка в секции «Разовые платежи».
5. Изменение лимита для пользователя → обновить [platform-for-users.md](../01-goal/platform-for-users.md) если UX затронут.

---

## 🔗 По сервисам

| Сервис | Settings | Financial-policy | Billing |
|--------|----------|------------------|---------|
| [rating](./rating/README.md) | ✅ | ✅ | — |
| [user-profile](./user-profile/README.md) | ✅ club | ✅ club | — |
| [forum](./forum/requirements/README.md) | ✅ | ✅ | ✅ реакции |
| [auction](./auction/requirements/financial-features.md) | ✅ | ✅ | ✅ |
| [subscriptions](./subscriptions/README.md) | — | ✅ | — |
| [deal_feedback](./deal_feedback/README.md) | ✅ | — | — |
| [marketplace](./marketplace/README.md) | ✅ | ✅ draft | — |
| [billing](./billing/README.md) | ✅ | — | — |
| [notifications](./notifications/README.md) | ✅ | — | — |

---

**Автор:** команда разработки · **Версия:** 0.1-draft
