# ⭐ Карма и рейтинг

> **Статус:** spec ready · **Версия:** 0.1  
> **Сервис:** [rating](../05-microservices/rating/README.md) · **Клуб:** [club-access.md](./club-access.md)

Единый справочник: **термины**, **принципы**, **формулы**, **переменные** и **влияние на поведение** на платформе.

---

## 📑 Оглавление

1. [Назначение](#-1-назначение)
2. [Модель клуба и доверие](#-2-модель-клуба-и-доверие)
3. [Термины](#-3-термины)
4. [Принципы построения](#-4-принципы-построения)
5. [Влияние на платформу](#-5-влияние-на-платформу)
6. [Реферальное дерево (инвайты)](#-6-реферальное-дерево-инвайты)
7. [Рейтинг сделок (deal trust)](#-7-рейтинг-сделок-deal-trust)
8. [Карма (social score)](#-8-карма-social-score)
9. [Штрафы, ограничения и бан](#-9-штрафы-ограничения-и-бан)
10. [Справочник переменных](#-10-справочник-переменных)
11. [Алгоритмы простым языком](#-11-алгоритмы-простым-языком)
12. [Связь с сервисами и событиями](#-12-связь-с-сервисами-и-событиями)

---

## 1. Назначение

| Метрика | Вопрос, на который отвечает |
|---------|----------------------------|
| **Рейтинг** | «Насколько надёжен участник в **сделках**?» |
| **Карма** | «Насколько полезен участник **сообществу** (форум)?» |
| **Реферальный вклад** | «Кого participant **привёл в клуб** и как ведут себя его приглашённые?» |

Три числа **не смешиваются** в одну формулу без явного коэффициента. UI может показывать их рядом; лимиты платформы смотрят на нужную метрику по контексту.

---

## 2. Модель клуба и доверие

В **закрытом клубе** инвайт — act of trust: пригласивший разделяет ответственность за качество сети. Поэтому:

- рейтинг/карма **приглашённых** на глубине **1…N** влияют на **реферальный вклад** пригласившего;
- **N** и коэффициенты — **настраиваемые** ([scalar-config](#-10-справочник-переменных), [plan-config](#-10-справочник-переменных));
- открытая регистрация не даёт «нулевой» репутации обойти клубный фильтр.

Подробнее о доступе: [club-access.md](./club-access.md).

---

## 3. Термины

| Термин | EN | Определение | Диапазон / тип |
|--------|-----|-------------|----------------|
| **Рейтинг** | `totalRating` | Средневзвешенная оценка по **завершённым сделкам** (аукцион, маркет) | обычно 1.0…5.0 |
| **Карма** | `karma` | Накопленный **социальный** балл (реакции на форуме, модераторские бонусы — TBD) | ℝ, может быть < 0 |
| **Верифицированная сделка** | `verifiedSales` | Сделка с завершённым feedback обеих сторон или истёкшим сроком | count |
| **Pending сделка** | `pendingSales` | Сделка завершена, отзыв не дан | count |
| **Покрытие отзывами** | `feedbackCoverage` | `verifiedSales / (verifiedSales + pendingSales)` | 0…1 |
| **Реферальный вклад (карма)** | `referralKarma` | Добавка к карме inviter от дерева приглашённых | ℝ |
| **Реферальный вклад (рейтинг)** | `referralRating` | Добавка к **эффективному** рейтингу inviter | ℝ, малый вес |
| **Эффективный рейтинг** | `effectiveRating` | `totalRating + referralRating` (для лимитов/UI) | 1.0…5.0 cap TBD |
| **Эффективная карма** | `effectiveKarma` | `karma + referralKarma` | ℝ |
| **Inviter** | — | Кто выдал инвайт принятому member | userId |
| **Уровень дерева** | `depth` | 1 = прямой invitee, 2 = invitee моего invitee, … | 1…N |
| **Vote value** | — | Вес голоса при расчёте влияния авторитета | formula §7 |

**Не путать:**

- «Лайк на форуме» → **карма**, не рейтинг.
- «Оценка 5★ после аукциона» → **рейтинг**, не карма.
- «Привёл друга» → **referral\***, не прямой бонус к totalRating без формулы.

---

## 4. Принципы построения

1. **Раздельные каналы** — сделки (rating) vs форум (karma) vs сеть (referral).
2. **Source of truth один** — сервис `rating`; profile только cache.
3. **Параметры снаружи кода** — коэффициенты в `scalar-config` / `plan-config`, не hardcode.
4. **Прозрачность для member** — в профиле видны `totalRating`, `karma`, `referral*` и **почему** ограничен доступ (если ограничен).
5. **Graduated response** — сначала soft limit, потом penalty, потом ban ([§9](#-9-штрафы-ограничения-и-бан)).
6. **Referral depth capped** — вклад уровня `d` затухает; `d > N` не учитывается.
7. **Клуб** — без инвайта нет member; referral tree строится при `invites/redeem`.

---

## 5. Влияние на платформу

| Ситуация | Метрика | Порог / правило | Эффект |
|----------|---------|-----------------|--------|
| Ставка на аукционе | `effectiveRating`, ban | `check-ban`, pending limit | 403 / блок |
| Создание лота | pending, daily limits | plan-config + `rating.maxActiveAuctionsWhenLimited` | 403 |
| Пост на форуме | karma (display), ban | `check-ban` | 403 |
| Вес реакции автора | karma автора | `forum.reaction.karmaWeights` | ±karma |
| Выдача инвайтов | `effectiveRating`, plan | `club.invitesPerMonth` | cap codes |
| Сортировка лотов / trust badge | seller `effectiveRating` | `auction.expertAppraisalBoost` settings | UI rank |
| Pro paywall | — | plan-config feature flags | не rating |
| Публичный профиль | all public aggregates | — | display only |

---

## 6. Реферальное дерево (инвайты)

> **Денежные вознаграждения** (₽ на баланс) — отдельный сервис [referral-rewards](../05-microservices/referral-rewards/README.md).  
> Этот раздел — только **репутация** (`referralKarma`, `referralRating`).

### 6.1 Данные

```
user_profile.invitation:
  userId (invitee)
  inviterId
  inviteCode
  acceptedAt
```

Дерево строится по `inviterId`. Обход — BFS до глубины **N**.

### 6.2 Формулы

Пусть:

- `K(u)` — карма пользователя `u` (без referral).
- `R(u)` — `totalRating` пользователя `u`.
- `L` — множество пользователей на глубине `d` от inviter `I`.
- `α_d` — `rating.referral.karmaCoefficients[d-1]` (settings).
- `β_d` — `rating.referral.ratingCoefficients[d-1]` (settings).

**Реферальная карма пригласившего:**

```
referralKarma(I) = Σ_{d=1..N}  α_d × Σ_{u ∈ L(d)}  K(u)
```

**Реферальная добавка к рейтингу:**

```
referralRating(I) = Σ_{d=1..N}  β_d × Σ_{u ∈ L(d)}  (R(u) - R_neutral)
```

где `R_neutral` = `rating.referral.neutralRating` (default **3.0**) — отклонение от «нейтрального» участника.

**Эффективные значения:**

```
effectiveKarma(I)    = karma(I) + referralKarma(I)
effectiveRating(I) = clamp( totalRating(I) + referralRating(I), R_min, R_max )
```

| Переменная | Default | Реестр |
|------------|---------|--------|
| `N` | 2 | `rating.referral.maxDepth` |
| `α` | `[0.15, 0.05]` | `rating.referral.karmaCoefficients` |
| `β` | `[0.05, 0.02]` | `rating.referral.ratingCoefficients` |
| `R_neutral` | 3.0 | `rating.referral.neutralRating` |
| `R_min`, `R_max` | 1.0, 5.0 | `rating.referral.ratingClampMin/Max` |

### 6.3 Когда пересчитывается

| Событие | Действие |
|---------|----------|
| `rating.updated` (любой user) | Пересчёт referral для всех предков до N |
| Invite redeemed | Построить ребро; пересчёт inviter |
| CRON nightly | Полный reconcile (optional) |

### 6.4 Простое объяснение

> Если вы пригласили активного и честного участника, ваш **referralKarma** растёт. Если ваши приглашённые (или их приглашённые — до N шагов) ведут себя плохо на форуме, карма сети **тянет вас вниз**. Глубокие уровни влияют **слабее** (меньший α, β).

---

## 7. Рейтинг сделок (deal trust)

### 7.1 Источники

| Источник | Вклад |
|----------|--------|
| Feedback после аукциона | Оценка 1–5 от контрагента |
| Feedback после маркета | То же |
| Бонусы | Быстрый отзыв, фото, обе стороны |
| Штрафы | Pending без отзыва ([§9](#-9-штрафы-ограничения-и-бан)) |

### 7.2 Базовая агрегация

```
totalRating = (Σ w_i × score_i) / (Σ w_i)
```

| `score_i` | Оценка в feedback (1…5) |
| `w_i` | Вес записи (default 1; future: давность) |

Начальное значение для нового member без сделок: **нет оценки** (UI: «новый участник») или `R_neutral` только для referral math, **не** для display.

### 7.3 Бонусы (feedback)

| Бонус | Settings key | Default | Эффект |
|-------|--------------|---------|--------|
| Early | `rating.bonuses.earlyBonus` | +0.5 | к rolling rating |
| Photo | `rating.bonuses.photoBonus` | +1.0 | |
| Both sides | `rating.bonuses.bothBonus` | +2.0 | |
| Early window | `rating.bonuses.earlyHours` | 24 h | условие Early |

### 7.4 Authority (вес голосующего)

Используется когда **ваш** feedback влияет на **другого** (будущее: weighted reviews) и в `VoteLog`:

```
authority = log10(1 + verifiedSales_voter)
voteValue = baseValue × authority^authorityExponent × contextWeight[context]
```

| Переменная | Key | Default |
|------------|-----|---------|
| `baseValue` | `rating.baseValue` | 1 |
| `authorityExponent` | `rating.authorityExponent` | 0.2 |
| `contextWeight` | `rating.contextWeights` | auction 1.0, forum 1.2, marketplace 0.9 |

---

## 8. Карма (social score)

### 8.1 Источники

| Источник | Δ karma |
|----------|---------|
| Реакция 👍 / голос + | +`forum.vote.karmaPlusWeight` (default 0.2; emoji: `forum.reaction.karmaWeights.plus`) |
| Реакция 👎 / голос − | −`forum.vote.karmaMinusWeight` (default 0.2) |
| ❤️ | +0.3 |
| 😮 | +0.1 |
| 🤔 | 0 |
| Платные Pro-реакции | по таблице forum + charge |

Settings: `forum.reaction.karmaWeights` (object).

### 8.2 Формула накопления

```
karma(u) += Σ delta_reaction
```

Карма **не усредняется** — это интеграл активности. Реферальная часть добавляется отдельно ([§6](#-6-реферальное-дерево-инвайты)).

### 8.3 Связь с рейтингом

Карма **не заменяет** рейтинг в сделках. Опционально (TBD): при `effectiveKarma < threshold` — soft warning в UI, без блокировки сделок.

---

## 9. Штрафы, ограничения и бан

### 9.1 Pending feedback

| Условие | Эффект |
|---------|--------|
| `pendingSales > maxPendingBeforePenalty` (plan-config) | `totalRating *= penaltyDecayFactor` |
| `pendingSales >= banThreshold` (settings) | `banUntil = now + banDurationDays` |

| Key | Default | Реестр |
|-----|---------|--------|
| `penaltyDecayFactor` | 0.9 | scalar-config |
| `banThreshold` | 10 | scalar-config |
| `banDurationDays` | 7 | scalar-config |
| `maxPendingBeforePenalty` | 3/5/10 | plan-config per plan |

### 9.2 Ограничение участия

При penalty: `isLimited = true`, `maxActiveAuctionsWhenLimited` (plan-config) — cap одновременных аукционов.

### 9.3 События

`rating.penalty_applied`, `rating.user_banned` → auction/forum block via `check-ban`.

---

## 10. Справочник переменных

### 10.1 settings (`scalar-config` service)

| Key | Тип | Default | § |
|-----|-----|---------|---|
| `rating.baseValue` | number | 1 | 7.4 |
| `rating.authorityExponent` | number | 0.2 | 7.4 |
| `rating.contextWeights` | object | см. registry | 7.4 |
| `rating.bonuses.*` | number | см. registry | 7.3 |
| `rating.penalties.*` | number | см. registry | 9 |
| `rating.referral.maxDepth` | number | 2 | 6 |
| `rating.referral.karmaCoefficients` | number[] | [0.15, 0.05] | 6 |
| `rating.referral.ratingCoefficients` | number[] | [0.05, 0.02] | 6 |
| `rating.referral.neutralRating` | number | 3.0 | 6 |
| `rating.referral.ratingClampMin` | number | 1.0 | 6 |
| `rating.referral.ratingClampMax` | number | 5.0 | 6 |
| `forum.reaction.karmaWeights` | object | см. forum docs | 8 |
| `club.registration.inviteOnly` | boolean | true | club |
| `club.invite.validityDays` | number | 14 | club |

> Полный дубль: [PLATFORM-REGISTRY.md](../05-microservices/PLATFORM-REGISTRY.md)

### 10.2 plan-config (per plan)

| Key | Описание | § |
|-----|----------|---|
| `rating.maxPendingBeforePenalty` | Pending до штрафа | 9 |
| `rating.maxActiveAuctionsWhenLimited` | Cap аукционов при penalty | 9 |
| `club.invitesPerMonth` | Инвайт-коды / месяц | 5 |
| `club.referralInfluenceEnabled` | Учитывать referral tree | 6 |

---

## 11. Алгоритмы простым языком

### Рейтинг после сделки

1. Аукцион завершился → обе стороны получают задачу оставить отзыв.
2. Каждая оценка 1–5 **подмешивается** в среднее `totalRating`.
3. Быстро, с фото, с обеих сторон — **бонусы** из scalar-config.
4. Не оставил отзыв — растёт `pendingSales`; много pending — **рейтинг множится на 0.9**, потом **бан**.

### Карма на форуме

1. Кто-то ставит реакцию на ваш topic/comment.
2. Сервис forum шлёт delta в rating.
3. Сумма всех delta = ваша **karma** (может уйти в минус).

### Referral после инвайта

1. Вы пригласили Васю (уровень 1). Вася набрал karma +10, rating 4.5.
2. Вася пригласил Петю (уровень 2 для вас).
3. Раз в день (или по событию) rating-сервис суммирует вклад по α, β до N=2.
4. В профиле: «Ваша сеть: +1.5 karma, +0.08 rating» (пример).

---

## 12. Связь с сервисами и событиями

| Сервис | Роль |
|--------|------|
| **rating** | SoT: расчёт всех метрик |
| **feedback** | Триггер обновления rating |
| **forum** | Триггер delta karma |
| **user-profile** | `inviterId`, cache для UI |
| **settings** | Коэффициенты формул |
| **plan-config** | Лимиты pending, invites |
| **auction / forum** | `check-ban`, enforce limits |

| Event | Эффект |
|-------|--------|
| `feedback.submitted` | Recalc `totalRating` |
| `rating.updated` | Referral recompute upstream |
| `rating.user_banned` | Block mutations |

---

## 🔗 Связанные документы

- [club-access.md](./club-access.md)
- [platform-for-users.md](./platform-for-users.md)
- [rating/README.md](../05-microservices/rating/README.md)
- [PLATFORM-REGISTRY.md](../05-microservices/PLATFORM-REGISTRY.md)

---

**Автор:** команда разработки · **Версия:** 0.1-spec
