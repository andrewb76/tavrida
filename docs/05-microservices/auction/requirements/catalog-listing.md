# 📋 Каталог аукционов — фильтры и поиск

> **Статус:** draft · **Версия:** 0.1  
> **Экран:** [W02 — Каталог лотов](../../../11-ux-ui/wireframes/auctions.md) · **Сценарий:** [S-002](../../../01-goal/scenarios/frequent.md)  
> **Сервис:** [auction/README.md](../README.md) · **Лимиты:** [financial-features.md](./financial-features.md)

Спецификация блока **фильтров и поиска** на странице `/auctions` (каталог лотов). Сетка карточек, пагинация и FAB «+ Лот» — в wireframe W02; здесь — только панель фильтров, контракт query params и API.

---

## 🎯 Назначение

Member открывает `/auctions` и:

1. **Сужает выдачу** — категория, статус торгов, сортировка.
2. **Ищет по тексту** — глубина поиска зависит от тарифа (`auction.member.*search*`).
3. **Сохраняет состояние в URL** — можно поделиться ссылкой или вернуться «назад» с теми же фильтрами.

По умолчанию каталог показывает **активные** лоты, отсортированные так, чтобы **live** и **продвинутые** были заметнее.

---

## 🧩 UI: `AuctionFilterBar`

Компонент из [W02](../../../11-ux-ui/wireframes/auctions.md) — sticky под шапкой на мобиле, inline-строка на desktop.

### Зоны панели

| Зона | Элемент | Поведение |
|------|---------|-----------|
| **Поиск** | `SearchInput` + иконка 🔍 | Debounce **300 ms**; min **2** символа для запроса; Enter — немедленный fetch |
| **Категория** | `CategorySelect` | Дерево категорий (общая таксономия с форумом / marketplace — TBD); «Все категории» = без фильтра |
| **Статус** | `StatusChips` | Один активный chip; см. [статусы](#статусы-торгов) |
| **Сортировка** | `SortSelect` | Dropdown; disabled при `sort=RELEVANCE` без `q` |
| **Расширенные** *(Pro)* | `AdvancedFiltersDrawer` | Цена, тип аукциона, «есть экспертиза»; см. [тарифы](#тарифы-поиска-и-фильтров) |

### ASCII (desktop)

```
┌──────────────────────────────────────────────────────────────────┐
│ 🔍 [ Поиск по лотам…          ]  Категория ▼  [●Live][Все][Заверш]│
│ Сортировка: Скоро закончатся ▼                    [Фильтры Pro ▾] │
└──────────────────────────────────────────────────────────────────┘
```

### Состояния панели

| State | UI |
|-------|-----|
| **initial** | Статус = `ACTIVE`, сортировка = `ENDING_SOON`, поиск пуст |
| **loading** | Skeleton chips; input disabled; кнопка «Сбросить» скрыта |
| **active filters** | Badge-счётчик на «Фильтры»; ссылка «Сбросить всё» |
| **paywall** | Pro-фильтры с lock-icon → `/plans` или tooltip «Доступно на Pro» |
| **empty results** | Панель остаётся; под сеткой — «Ничего не найдено» + «Сбросить фильтры» |

### Сброс

«Сбросить всё» → удалить из URL все query params кроме `limit`; вернуть дефолты (`status=ACTIVE`, `sort=ENDING_SOON`).

---

## 🔗 Синхронизация URL ↔ состояние

Все фильтры отражаются в **query string** роутера Vue (`/auctions?…`). При изменении фильтра — `router.replace` (без лишних history entries при debounce поиска).

| Query param | Тип | Default | Описание |
|-------------|-----|---------|----------|
| `q` | string | — | Поисковая строка (URL-encoded) |
| `categoryId` | UUID | — | Фильтр по категории |
| `status` | enum | `ACTIVE` | См. [статусы](#статусы-торгов) |
| `sort` | enum | `ENDING_SOON` | См. [сортировка](#сортировка) |
| `minPrice` | number | — | Мин. текущая цена (₽), **Pro** |
| `maxPrice` | number | — | Макс. текущая цена (₽), **Pro** |
| `type` | enum | — | `ENGLISH` \| `DUTCH`, **Pro** |
| `hasExpertAppraisal` | boolean | — | Только лоты с экспертизой, **Pro** |
| `cursor` | string | — | Курсор пагинации (opaque) |
| `limit` | number | `20` | Размер страницы (max **50**) |

**Правила:**

- Смена любого фильтра (кроме `cursor`) **сбрасывает** `cursor`.
- При непустом `q` клиент выставляет `sort=RELEVANCE`, если пользователь не выбрал сортировку вручную.
- Невалидный `status` / `sort` → fallback на default + toast (не 404).
- BFF **игнорирует** Pro-params для Free/Basic (не 403 на list — просто не применяет; UI скрывает контролы).

---

## 🏷️ Статусы торгов

| UI chip | `status` param | Включает лоты |
|---------|----------------|---------------|
| **Live** *(default)* | `ACTIVE` | `status=ACTIVE` и `now < endsAt` |
| **Скоро** | `ENDING_SOON` | `ACTIVE` и `endsAt - now < 24h` (порог — settings, draft) |
| **Запланированные** | `SCHEDULED` | `SCHEDULED` или `ACTIVE` с `startsAt > now` |
| **Завершённые** | `ENDED` | `ENDED` |
| **Все** | `ALL` | Все публичные статусы кроме `DRAFT`, `CANCELLED` |

> Модераторский `HIDDEN` не попадает в публичный каталог.

---

## ↕️ Сортировка

| `sort` | Label (RU) | Логика |
|--------|--------------|--------|
| `ENDING_SOON` | Скоро закончатся | `endsAt ASC` среди ACTIVE; promoted boost — см. ниже |
| `NEWEST` | Новые | `createdAt DESC` |
| `PRICE_ASC` | Цена ↑ | `currentPrice ASC` |
| `PRICE_DESC` | Цена ↓ | `currentPrice DESC` |
| `RELEVANCE` | По релевантности | Только при `q`; title/description match score |
| `PROMOTED` | Продвинутые | `promotedUntil DESC NULLS LAST`, затем `ENDING_SOON` |

### Ранжирование по умолчанию (без явного `sort`)

При `status=ACTIVE` сервис применяет **boost-слой** поверх `endsAt`:

1. `promotedUntil > now()` — в начале блока (внутри — по `endsAt`).
2. Лоты с `ExpertAppraisal` — множитель из scalar `auction.lot.expertAppraisalBoost` (default **1.2**).
3. Остальные — `endsAt ASC`.

---

## 🔍 Поиск

### MVP (PostgreSQL)

| Тариф | Scope (`auction.member.01search.scope`) | Поля |
|-------|----------------------------------------|------|
| **Free** | `TITLE` | `title ILIKE %q%` |
| **Basic** | `FULL_TEXT` | `title` + `description` |
| **Pro** | `FULL_TEXT,FILTERS` | как Basic + [расширенные фильтры](#расширенные-фильтры-pro) |

- Min длина `q`: **2** символа (клиент и BFF).
- Max длина `q`: **100** символов.
- Пустой `q` — поиск не применяется.

BFF перед проксированием в `auction`:

1. Резолвит план пользователя → `financial-policy GET /features/effective`.
2. Обрезает/отклоняет поля запроса вне scope (Pro-filters → strip для Free/Basic).

### Post-MVP

Кросс-доменный и fuzzy-поиск — [ADR-008](../../../03-architecture/adr/008-opensearch-full-text.md): индекс `auctions`, BFF `GET /api/v1/search?domains=auction`. До триггера ADR — только PG.

---

## 🎚️ Расширенные фильтры (Pro)

Доступны при `auction.member.02search.filtersEnabled = true` (Pro) **и** scope содержит `FILTERS`.

| Param | UI control | Валидация |
|-------|------------|-----------|
| `minPrice` / `maxPrice` | Range slider или два input | `minPrice <= maxPrice`; ≥ 0 |
| `type` | Checkbox group | Значения из `auction.bidder.03auctionTypes.allowed` плана **продавца не проверяем** — фильтр по типу лота |
| `hasExpertAppraisal` | Toggle | `EXISTS expert_appraisal` |

---

## 💳 Тарифы поиска и фильтров

> Единый источник значений: [PLATFORM-REGISTRY.md](../../PLATFORM-REGISTRY.md) (секция `auction`).

| Функция в UI | Free | Basic | Pro | Ключ plan-config |
|--------------|------|-------|-----|------------------|
| Поиск по названию | ✅ | ✅ | ✅ | `auction.member.01search.scope` |
| Поиск по описанию | ❌ | ✅ | ✅ | ↑ |
| Расширенные фильтры (цена, тип, экспертиза) | ❌ | ❌ | ✅ | `auction.member.02search.filtersEnabled` |

---

## 🔌 API

### `GET /api/v1/auctions`

Публичный list через BFF → `auction GET /internal/v1/auctions`.

**Query** — те же param, что [URL](#синхронизация-url--состояние).

**Response `200`:**

```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Монета 1787",
      "currentPrice": 1500,
      "currency": "RUB",
      "status": "ACTIVE",
      "type": "ENGLISH",
      "startsAt": "2026-07-10T10:00:00Z",
      "endsAt": "2026-07-12T10:00:00Z",
      "thumbnailUrl": "https://cdn…/thumb.jpg",
      "categoryId": "…",
      "categoryName": "Монеты",
      "bidCount": 12,
      "isLive": true,
      "isPromoted": true,
      "hasExpertAppraisal": false
    }
  ],
  "nextCursor": "eyJpZCI6Li4ufQ==",
  "meta": {
    "limit": 20,
    "searchScope": "TITLE",
    "appliedFilters": {
      "status": "ACTIVE",
      "sort": "ENDING_SOON"
    }
  }
}
```

**Пустая выдача:** `items: []`, `nextCursor: null` — **не** `404`.

**Ошибки:**

| Code | Когда |
|------|-------|
| `400` | `limit > 50`, `q` too long, invalid enum |
| `401` | Нет JWT (каталог только для member) |

### Internal (`auction`)

| Method | Path | Примечание |
|--------|------|------------|
| GET | `/internal/v1/auctions` | Те же query; service token или BFF m2m |
| — | Индексы PG | `(status, endsAt)`, `(categoryId, status)`, GIN/trigram на `title` (post-MVP tuning) |

---

## 🧪 Тесты (S-002)

| Уровень | Кейсы |
|---------|-------|
| **UNIT** | Построение SQL/QueryBuilder: status chips, boost ordering, scope strip |
| **INT** | `GET /auctions?status=ACTIVE&sort=ENDING_SOON`; pagination cursor stable |
| **E2E smoke** | Смена chip → URL обновился → карточки изменились; «Сбросить» |

---

## 📎 Связанные документы

- [W02 wireframe](../../../11-ux-ui/wireframes/auctions.md)
- [auction/README.md](../README.md) — сущность `Auction`, события
- [06-api — pagination](../../../06-api/README.md)
- [ADR-008 OpenSearch](../../../03-architecture/adr/008-opensearch-full-text.md)
- [platform-for-users — каталог](../../../01-goal/platform-for-users.md)

---

**Автор:** команда разработки · **Версия:** 0.1-draft
