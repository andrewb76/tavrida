# 📒 Реестр переменных платформы

> **Статус:** draft · **Версия:** 0.3  
> **Каталог проектирования** — все настраиваемые параметры Tavrida Lot для PM, docs и domain-сервисов.

Два реестра (см. [ADR-003](../03-architecture/adr/003-settings-vs-financial-policy.md), [registry-keys.md](../13-maintenance/registry-keys.md)):

| Реестр | Сервис | Schema | Значений на ключ | Кто меняет |
|--------|--------|--------|------------------|------------|
| ⚙️ **Scalar config** | `scalar-config` | `scalar_config` | 1 (global или per-user) | Admin |
| 💳 **Plan config** | `plan-config` | `plan_config` | 3 (Free / Basic / Pro) | Admin (значения); **ключи** — sync от domain |

**Правило:** при добавлении переменной — строка **здесь** + секция 💳/⚙️ в README сервиса + **sync при старте** владельца.

### Жизненный цикл ключа (оба реестра)

1. Сервис при старте вызывает **sync** с полным списком своих ключей.
2. Реестр upsert-ит метаданные; **не перезаписывает** admin-значения при повторном sync.
3. Ключи владельца, **отсутствующие** в sync, → `syncStatus: stale` (legacy: `registrationStatus: orphaned`).
4. **Автоудаление запрещено.** Admin видит stale в UI и удаляет вручную.

### Каталог vs runtime (plan-config)

| | PLATFORM-REGISTRY (этот файл) | `plan_config.plan_variable` в БД |
|--|------------------------------|--------------------------------|
| Назначение | Проектирование, Oracle, onboarding | Production runtime |
| Когда появляется ключ | При описании фичи в docs | Когда **domain-сервис** вызвал sync |
| Пустая матрица в админке | Нормально, если auction/forum ещё не подняты | Ожидаемо до register |

Строка в таблице ниже **не означает**, что plan variable уже есть в plan-config.

---

## ⚙️ Scalar config — скалярные переменные

Одно значение на ключ. Формат: `{domain}.{group}.{name}` (min 2 сегмента).

### rating

| Ключ | Тип | Default | Scope | Описание |
|------|-----|---------|-------|----------|
| `rating.baseValue` | number | `1` | global | Базовое значение голоса |
| `rating.authorityExponent` | number | `0.2` | global | Степень авторитета голосующего |
| `rating.contextWeights` | object | см. ниже | global | Веса по контексту |
| `rating.bonus.earlyHours` | number | `24` | global | Окно «быстрого» отзыва (часы) |
| `rating.bonus.earlyBonus` | number | `0.5` | global | Бонус к рейтингу за быстрый отзыв |
| `rating.bonus.photoBonus` | number | `1.0` | global | Бонус за отзыв с фото |
| `rating.bonus.bothBonus` | number | `2.0` | global | Бонус, если оценили обе стороны |
| `rating.penalty.decayFactor` | number | `0.9` | global | Множитель штрафа за pending |
| `rating.penalty.banThreshold` | number | `10` | global | Порог pending → бан |
| `rating.penalty.banDurationDays` | number | `7` | global | Длительность бана (дни) |
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
| `forum.moderation.bannedWordsList` | string[] | `[]` | global | Список запрещённых слов |
| `forum.edit.windowMinutes` | number | `10` | global | Окно редактирования своего поста |
| `forum.reaction.karmaWeights` | object | см. [forum](./forum/requirements/README.md) | global | Вес реакций для кармы |
| `forum.markdown.sanitizeLevel` | enum | `strict` | global | `strict` \| `documentation` |
| `forum.tags.bannedSlugs` | string[] | `[]` | global | Запрещённые slug тегов |

### auction

| Ключ | Тип | Default | Scope | Описание |
|------|-----|---------|-------|----------|
| `auction.bid.incrementDefault` | number | `100` | global | Шаг ставки по умолчанию (₽) |
| `auction.lot.minStartingPrice` | number | `1` | global | Минимальная стартовая цена |
| `auction.lot.expertAppraisalBoost` | number | `1.2` | global | Множитель значимости лота с экспертизой |

### marketplace

| Ключ | Тип | Default | Scope | Описание |
|------|-----|---------|-------|----------|
| `marketplace.order.acceptTimeoutHours` | number | `48` | global | Автоотмена заказа, если поставщик не ответил (ч) |

### billing

| Ключ | Тип | Default | Scope | Описание |
|------|-----|---------|-------|----------|
| `billing.currency.default` | string | `RUB` | global | Валюта по умолчанию |
| `billing.deposit.minAmount` | number | `100` | global | Минимальное пополнение (₽) |

### referralRewards

| Ключ | Тип | Default | Scope | Описание |
|------|-----|---------|-------|----------|
| `referralRewards.global.enabled` | boolean | `false` | global | Kill switch денежной реферальной программы |
| `referralRewards.tree.maxDepth` | number | `1` | global | Макс. глубина дерева для **денежных** выплат |
| `referralRewards.tree.depthCoefficients` | number[] | `[1.0]` | global | Множители по уровням d=1…N |
| `referralRewards.charge.enabledCategories` | enum[] | `["SUBSCRIPTION"]` | global | Категории charge для триггеров |
| `referralRewards.inviteeBonus.enabled` | boolean | `false` | global | Двусторонний бонус invitee |
| `referralRewards.inviteeBonus.amount` | number | `0` | global | Сумма бонуса invitee (₽) |
| `referralRewards.inviteeBonus.trigger` | enum | `ON_REGISTRATION` | global | `ON_REGISTRATION` \| `ON_FIRST_QUALIFYING_CHARGE` |
| `referralRewards.rules` | object[] | см. README | global | Правила начисления inviter |
| `referralRewards.payout.defaultHoldDays` | number | `14` | global | Hold по умолчанию (дни) |
| `referralRewards.payout.cronMinutes` | number | `15` | global | Период cron выплат |
| `referralRewards.payout.minAmount` | number | `1` | global | Мин. сумма accrual к выплате (₽) |
| `referralRewards.budget.globalPerMonth` | number | null | global | Cap программы / месяц (null = без лимита) |
| `referralRewards.charge.excludedKeyPrefixes` | string[] | `["referral.reward:"]` | global | Prefix plan variable, исключённые из триггеров |

> Категории: [charge-categories.md](./referral-rewards/requirements/charge-categories.md).  
> **GMV сделок не участвует** — [legal-scope.md](./referral-rewards/requirements/legal-scope.md).

### notifications

| Ключ | Тип | Default | Scope | Описание |
|------|-----|---------|-------|----------|
| `notifications.feedback.reminderDays` | number[] | `[1, 3, 7]` | global | Интервалы напоминаний об отзыве |
| `notifications.digest.hourUtc` | number | `9` | global | Час отправки digest (UTC) |

### webhooks

| Ключ | Тип | Default | Scope | Описание |
|------|-----|---------|-------|----------|
| `webhooks.delivery.maxAttempts` | number | `5` | global | Попыток доставки на endpoint |
| `webhooks.delivery.initialBackoffSeconds` | number | `30` | global | Первая задержка retry |
| `webhooks.delivery.maxBackoffSeconds` | number | `3600` | global | Cap exponential backoff |
| `webhooks.delivery.timeoutMs` | number | `10000` | global | Fallback HTTP timeout |
| `webhooks.user.defaultTimeoutMs` | number | null | `user:{id}` | Дефолт timeout для всех hooks пользователя |
| `webhooks.payload.maxBytes` | number | `65536` | global | Max body после redaction |
| `webhooks.signature.header` | string | `X-Tavrida-Signature` | global | Заголовок подписи |
| `webhooks.signature.algorithm` | string | `HMAC_SHA256` | global | Алгоритм подписи |
| `webhooks.ssrf.allowPrivateIPs` | boolean | `false` | global | Запрет private IP в URL |
| `webhooks.autoDisable.onDead` | boolean | `true` | global | Auto-disable endpoint после серии DEAD |
| `webhooks.autoDisable.deadStreak` | number | `10` | global | Подряд DEAD до disable |

### scalar_config _(мета)_

| Ключ | Тип | Default | Scope | Описание |
|------|-----|---------|-------|----------|
| `scalar_config.cache.ttlSeconds` | number | `300` | global | TTL Redis-кэша scalar-config |

---

## 💳 Plan config — plan variables

Пакет значений по тарифам **Free / Basic / Pro** (после sync владельцем).  
Типы: `limit` (−1 = ∞), `feature`, `enum`, **`price`** (разовые списания — бывший `charge_target`).

Дефолты в колонках Free/Basic/Pro — **рекомендуемые `planValues` при register**, не встроенные знания plan-config.

### auction

| Ключ | Тип | Free | Basic | Pro | Описание |
|------|-----|------|-------|-----|----------|
| `auction.seller.01lot.activeMax` | limit | 2 | 5 | ∞ | **Seller:** макс. **своих** лотов ACTIVE |
| `auction.seller.02lot.dailyCreateMax` | limit | 3 | 10 | ∞ | **Seller:** новых лотов за календарные сутки |
| `auction.seller.03lot.durationMaxHours` | limit | 72 | 336 | ∞ | Макс. длительность (часы) |
| `auction.bidder.01participation.activeMax` | limit | 5 | 20 | ∞ | **Bidder:** чужих торгов со ставками одновременно |
| `auction.bidder.02bid.hourlyMax` | limit | 20 | 100 | ∞ | Ставок в час (антибот) |
| `auction.seller.04promotion.enabled` | feature | false | false | true | Доступ к продвижению (тариф) |
| `auction.seller.05reservePrice.enabled` | feature | false | false | true | Резервная цена (тариф) |
| `auction.seller.06durationPreset.customEnabled` | feature | false | false | true | Свои шаблоны длительности |
| `auction.seller.07analytics.dashboardEnabled` | feature | false | false | true | Статистика по лотам |
| `auction.bidder.03auctionTypes.allowed` | enum | `ENGLISH` | `ENGLISH,DUTCH` | `all` | Доступные типы аукционов |
| `auction.seller.08promotion.unitPrice` | **price** | 200 | 200 | 200 | Продвижение лота (₽) |
| `auction.seller.09reservePrice.unitPrice` | **price** | 100 | 100 | 100 | Установка резервной цены (₽) |
| `auction.seller.10durationPreset.unitPrice` | **price** | 50 | 50 | 50 | Добавить шаблон длительности (₽) |
| `auction.member.01search.scope` | enum | `TITLE` | `FULL_TEXT` | `FULL_TEXT,FILTERS` | Глубина поиска в каталоге |
| `auction.member.02search.filtersEnabled` | feature | false | false | true | Расширенные фильтры каталога (Pro) |

> Legacy mapping: [registry-keys.md](../13-maintenance/registry-keys.md).

### forum

| Ключ | Тип | Free | Basic | Pro | Описание |
|------|-----|------|-------|-----|----------|
| `forum.author.01post.dailyMax` | limit | 10 | 50 | ∞ | Постов в сутки |
| `forum.author.02comment.perTopicMax` | limit | 10 | 50 | ∞ | Комментариев к одной теме |
| `forum.admin.01category.depthMax` | limit | 3 | 5 | ∞ | Уровней категорий |
| `forum.author.03thread.depthMax` | limit | 2 | 5 | ∞ | Глубина вложенных ответов |
| `forum.author.04attachment.countMax` | limit | 1 | 3 | ∞ | Файлов на пост |
| `forum.author.05attachment.sizeMaxMb` | limit | 2 | 5 | 20 | Размер одного файла (MB) |
| `forum.author.06tag.countMax` | limit | 3 | 10 | ∞ | Тегов на тему |
| `forum.author.07topic.pinnedMax` | limit | 0 | 1 | 3 | Прикреплённых тем (своих) |
| `forum.author.08media.embeddedEnabled` | feature | false | false | true | Встроенное медиа |
| `forum.author.09post.anonymousEnabled` | feature | false | false | true | Анонимные посты |
| `forum.author.10reply.nestedEnabled` | feature | false | true | true | Вложенные ответы |
| `forum.author.11notify.pushEnabled` | feature | false | false | true | Push при ответах |
| `forum.author.12notify.emailDigestEnabled` | feature | false | false | true | Email-дайджест по теме |
| `forum.author.13topic.chatEnabled` | feature | false | false | true | Чат внутри темы |
| `forum.author.14search.filtersEnabled` | feature | false | false | true | Расширенный поиск |
| `forum.author.15search.scope` | enum | `TITLE` | `FULL_TEXT` | `FULL_TEXT,FILTERS` | Глубина поиска |
| `forum.author.16post.lengthMax` | limit | 5000 | 5000 | 10000 | Макс. длина поста (символы) |
| `forum.author.17topic.customFieldsEnabled` | feature | false | false | true | Кастомные поля темы |
| `forum.author.18tag.priorityEnabled` | feature | false | false | true | Теги с приоритетами |
| `forum.author.19topic.auctionLinkEnabled` | feature | false | false | true | Тема «Обсуждение лота #N» |
| `forum.reaction.01celebrate.unitPrice` | price | 50 | 50 | 50 | Реакция 🎉 |
| `forum.reaction.02laugh.unitPrice` | price | 50 | 50 | 50 | Реакция 😄 |
| `forum.reaction.03smile.unitPrice` | price | 50 | 50 | 50 | Реакция 😊 |
| `forum.reaction.04clap.unitPrice` | price | 50 | 50 | 50 | Реакция 👏 |
| `forum.reaction.05eyes.unitPrice` | price | 50 | 50 | 50 | Реакция 👀 |
| `forum.reaction.06rocket.unitPrice` | price | 100 | 100 | 100 | Реакция 🚀 |
| `forum.reaction.07fire.unitPrice` | price | 100 | 100 | 100 | Реакция 🔥 |
| `forum.reaction.08handshake.unitPrice` | price | 100 | 100 | 100 | Реакция 🤝 |
| `forum.reaction.09brain.unitPrice` | price | 100 | 100 | 100 | Реакция 🧠 |

> `forum.reaction.pin` — только модератор, бесплатно ([roles](../01-goal/roles.md)).

### rating

| Ключ | Тип | Free | Basic | Pro | Описание |
|------|-----|------|-------|-----|----------|
| `rating.member.01pending.dealMax` | limit | 3 | 5 | 10 | Pending-сделок до штрафа |
| `rating.member.02auction.activeWhenLimitedMax` | limit | 2 | 3 | 5 | Лимит аукционов при низком рейтинге |

### club

| Ключ | Тип | Free | Basic | Pro | Описание |
|------|-----|------|-------|-----|----------|
| `club.member.01invite.monthlyMax` | limit | 1 | 3 | 10 | Новых инвайт-кодов в месяц |
| `club.member.02referral.influenceEnabled` | feature | true | true | true | Учитывать referral tree в effective karma/rating |

### referralRewards

| Ключ | Тип | Free | Basic | Pro | Описание |
|------|-----|------|-------|-----|----------|
| `referralRewards.program.enabled` | feature | false | true | true | Участие тарифа в денежных выплатах |
| `referralRewards.payout.multiplier` | limit | 0.5 | 1.0 | 1.5 | Множитель к расчётной сумме |
| `referralRewards.earning.monthlyMax` | limit | 500 | 3000 | 10000 | Cap gross начислений / месяц (₽) |

### subscriptions

| Ключ | Тип | Free | Basic | Pro | Описание |
|------|-----|------|-------|-----|----------|
| `subscriptions.member.01auction.categoryMax` | limit | 3 | 10 | ∞ | Подписок на категории аукциона |
| `subscriptions.member.02auction.lotMax` | limit | 5 | 20 | ∞ | Подписок на лоты |
| `subscriptions.member.03forum.categoryMax` | limit | 5 | 15 | ∞ | Подписок на категории форума |
| `subscriptions.member.04forum.topicMax` | limit | 10 | 50 | ∞ | Подписок на темы |
| `subscriptions.member.05tag.max` | limit | 3 | 10 | ∞ | Подписок на теги |
| `subscriptions.member.06notify.emailDigestEnabled` | feature | false | false | true | Email digest |

> Legacy: `auction_subscriptions.*` → migrate ([ADR-006](../03-architecture/adr/006-service-renames-deal-feedback-subscriptions.md)).

### webhooks

| Ключ | Тип | Free | Basic | Pro | Описание |
|------|-----|------|-------|-----|----------|
| `webhooks.member.01endpoint.max` | limit | 0 | 2 | 10 | USER webhook endpoints на аккаунт |
| `webhooks.member.02replay.dailyMax` | limit | 0 | 5 | 50 | Ручных replay доставки / сутки |
| `webhooks.member.03userScope.enabled` | feature | false | true | true | Пользовательские webhooks |

> Platform endpoints (`scope=PLATFORM`) — только admin, не лимитируются plan-config.

### marketplace _(draft)_

| Ключ | Тип | Free | Basic | Pro | Описание |
|------|-----|------|-------|-----|----------|
| `marketplace.seller.01listing.activeMax` | limit | **0** | 3 | ∞ | Активных объявлений (0 = только заказывать) |
| `marketplace.buyer.01order.monthlyMax` | limit | 2 | 10 | ∞ | Заказов в месяц (заказчик) |
| `marketplace.seller.02portfolio.itemMax` | limit | — | 5 | 20 | Фото в портфолио на услугу |
| `marketplace.seller.03listing.promotionUnitPrice` | price | TBD | TBD | TBD | Продвижение в каталоге |
| `marketplace.seller.04listing.featuredUnitPrice` | price | TBD | TBD | TBD | Закрепление в категории |

> **Запрещено** для referral: GMV между users — [legal-scope](./referral-rewards/requirements/legal-scope.md).

---

## 📋 Подписки (тарифные планы)

Цены хранятся в `Plan` (plan-config), задаёт admin. **Финальные цены не утверждены:**

| planId | Название | Статус |
|--------|----------|--------|
| `free` | Бесплатно | 0 ₽ |
| `basic` | Базовый | **TBD** (~99 ₽/мес — не утверждено) |
| `pro` | Pro | **TBD** (~399 ₽/мес — не утверждено) |

---

## 🔄 Как обновлять реестр

1. Новая переменная в сервисе → строка в этот файл + [registry-keys.md](../13-maintenance/registry-keys.md).
2. Scalar → `POST /internal/v1/settings/sync` при деплое (scalar-config).
3. Plan variable → `POST /internal/v1/plan-variables/sync` + `planValues` (plan-config).
4. Разовая цена → plan variable `valueType: price` (не отдельный charge_target).
5. Изменение лимита для пользователя → обновить [platform-for-users.md](../01-goal/platform-for-users.md) если UX затронут.

---

## 🔗 По сервисам

| Сервис | Scalar config | Plan config | Billing |
|--------|---------------|-------------|---------|
| [rating](./rating/README.md) | ✅ | ✅ | — |
| [user-profile](./user-profile/README.md) | ✅ club | ✅ club | — |
| [forum](./forum/requirements/README.md) | ✅ | ✅ | ✅ реакции (price) |
| [auction](./auction/requirements/financial-features.md) | ✅ | ✅ | ✅ |
| [subscriptions](./subscriptions/README.md) | — | ✅ | — |
| [deal_feedback](./deal_feedback/README.md) | ✅ | — | — |
| [marketplace](./marketplace/README.md) | ✅ | ✅ draft | — |
| [billing](./billing/README.md) | ✅ | — | — |
| [bff](./bff/README.md) | ✅ club | — | — |
| [notifications](./notifications/README.md) | ✅ | — | — |

---

**Автор:** команда разработки · **Версия:** 0.3-draft
