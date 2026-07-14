# ⏳ Сервис: periods

> **Статус:** implementing (v1 + Crimea seed) · **Версия:** 0.2 · **Schema:** `periods` · **Port:** 3014  
> **Код:** `services/periods` (`@tavrida/periods`)  
> **Продукт:** исторический справочник для атрибуции находок (Крым / Причерноморье) и виджет выбора интервала (d3, later)

## 🎯 Назначение

Иерархический **исторический справочник периодов** на временной шкале.

- Корневой период принадлежит **категории** (слой классификации).
- Вложенные периоды **наследуют категорию** и не могут её сменить.
- Дочерние периоды **разбивают** интервал родителя на непрерывный упорядоченный partition без дыр и пересечений.
- У категории — **схема метаданных**; у периодов — значения по этой схеме.

Публично: дерево / список с фильтрами (категория, интервал дат, метаданные, глубина).  
Админка: CRUD категорий + конструктор схемы + CRUD периодов + форма метаданных.

## 📖 Термины

| Термин | Описание |
|--------|----------|
| **Category** | Слой классификации (культуры, династии, …). Несёт `metadataSchema` |
| **Period** | Интервал `[startsOn, endsOn]` с названием и описаниями |
| **Root** | Период без родителя; задаёт `categoryId` для всего поддерева |
| **Partition** | Упорядоченный список детей: `C₁.start=P.start`, `Cᵢ.end=Cᵢ₊₁.start`, `Cₙ.end=P.end` |
| **Depth** | Уровень вложенности (`0` = root) |
| **Metadata** | jsonb по JSON Schema-полями из категории |

## 🗂️ Категории (исторические слои) — seed

Интересные для клуба находок / Крыма слои (можно расширять в админке):

| slug | Название | Зачем |
|------|----------|--------|
| `cultures` | Археологические культуры | Киммерийцы, скифы, тавры, сарматы, готы… |
| `epochs` | Эпохи / хронослои | Античность, средневековье, новое время |
| `polities` | Государства и колонии | Боспор, Херсонес, Генуя в Кафе, Крымское ханство… |
| `dynasties` | Царственные / правящие дома | Гиреи, Спартокиды, … |
| `houses` | Фамилии / роды | Внутри дома — ветви |
| `rulers` | Правители | Внутри фамилии — персоны на троне |
| `religions` | Конфессии и культы | Для атрибуции символики / обряда |
| `craft_traditions` | Ремесленные традиции | Керамика, чеканка, ювелирка |
| `trade_networks` | Торговые сети / пути | Шёлковый, генуэзский, работорговля Чёрного моря |

**Пример дерева:** категория `dynasties` → дом Гиреев (root) → фамильные ветви → правители.

## 🗄️ Сущности

### `PeriodCategory` (`periods.period_category`)

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID PK | — |
| `slug` | varchar unique | `cultures`, `dynasties`, … |
| `title` | varchar | UI |
| `description` | text | — |
| `sortOrder` | int | Порядок в админке |
| `metadataSchema` | jsonb | Схема полей (см. ниже) |
| `isActive` | boolean | — |
| `createdAt` / `updatedAt` | timestamptz | — |

### `metadataSchema` (JSON)

```json
{
  "fields": [
    {
      "key": "capital",
      "type": "string",
      "label": "Столица",
      "required": false
    },
    {
      "key": "peakYear",
      "type": "integer",
      "label": "Расцвет (год н.э.; отриц. = до н.э.)",
      "required": false
    },
    {
      "key": "faith",
      "type": "enum",
      "label": "Вера",
      "options": ["orthodox", "sunni", "judaism", "pagan", "other"],
      "required": false
    },
    {
      "key": "notes",
      "type": "text",
      "label": "Заметки",
      "required": false
    }
  ]
}
```

Типы полей v1: `string` | `text` | `integer` | `number` | `boolean` | `enum` | `string[]`.

### `Period` (`periods.period`)

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID PK | — |
| `categoryId` | UUID FK | Копия с root; **immutable** после create |
| `parentId` | UUID nullable FK | null = root |
| `rootId` | UUID | id корня (=id для root) |
| `depth` | int | 0…N |
| `sortIndex` | int | Порядок среди siblings |
| `startsOn` | date | Inclusive (PG date, BC ок) |
| `endsOn` | date | Inclusive |
| `title` | varchar | — |
| `summary` | text | Краткое описание |
| `body` | text | Полное описание (Markdown) |
| `metadata` | jsonb | Значения по схеме категории |
| `createdAt` / `updatedAt` | timestamptz | — |

**Индексы:** `(categoryId, startsOn, endsOn)`, `(parentId, sortIndex)`, `(rootId)`, GIN по `metadata` (later).

## 📏 Инварианты partition

Для родителя `P` и детей `C[0..n-1]` (по `sortIndex ASC`):

1. `n = 0` — ок (лист).
2. `C[0].startsOn = P.startsOn`
3. `C[i].endsOn = C[i+1].startsOn` (стык без зазора и overlap; граница принадлежит **концу** левого и **началу** правого одинакова — точка стыка «склеена»)
4. `C[n-1].endsOn = P.endsOn`
5. Для каждого `i`: `C[i].startsOn ≤ C[i].endsOn`
6. Каждый ребёнок: `categoryId === P.categoryId`, `depth === P.depth + 1`, `rootId === P.rootId`

При изменении дат / insert / delete — сервис **перепроверяет** siblings; при нарушении → `400` с деталями.

**Стык дат:** используем inclusive dates; соседние периоды делят день стыка как `endsOn(left) = startsOn(right)` (один день принадлежит обоим границ — виджет трактует как точку раздела). Альтернатива later: half-open `[start, end)`.

## 🔌 API

### Public (BFF `/api/v1/periods/*`) — member/guest read

| Method | Path | Описание |
|--------|------|----------|
| GET | `/periods/categories` | Активные категории |
| GET | `/periods` | Фильтрованный список / дерево |
| GET | `/periods/:id` | Один период (+ optional `?withChildren=`) |

**Query `GET /periods`:**

| Param | Описание |
|-------|----------|
| `categoryId` / `categorySlug` | Фильтр слоя |
| `from` / `to` | Пересечение с интервалом (ISO date) |
| `parentId` | Только прямые дети (или roots если omitted + `rootsOnly=true`) |
| `rootId` | Поддерево одного root |
| `maxDepth` | Ограничить глубину от запрошенного уровня |
| `metadata.KEY` / `metadata` JSON | Фильтр по метаданным (`@>` containment) |
| `view` | `flat` \| `tree` (default `tree` для roots) |

### Admin (BFF `/api/v1/admin/periods/*`) — admin JWT

| Method | Path | Описание |
|--------|------|----------|
| CRUD | `/admin/periods/categories` | Категории + schema |
| CRUD | `/admin/periods` | Периоды |
| PUT | `/admin/periods/:id/children` | Атомарно заменить partition детей |

### Internal (`services/periods`)

Mirror admin + public without JWT (`/internal/v1/periods/...`).

## ⚙️ Scalar / plan-config

Не применимо в v1 (справочник общий для клуба). Later: лимит глубины / числа root на план.

## 📨 События

| Direction | Event | Когда |
|-----------|-------|-------|
| produce | `period.updated` | later (кэш виджета) |

## 🔗 Взаимодействие

| Компонент | Роль |
|-----------|------|
| BFF | Public + admin proxy |
| Frontend admin | CRUD + schema builder + metadata form |
| Frontend member | d3 timeline widget (TODO) |
| auction / forum | later: привязка лота/темы к periodId |

## 🔒 Безопасность

- Public read — без PII
- Write — только admin (Keto / role)
- Internal — private network

## 🌍 Окружение

| Переменная | Обяз. | Default |
|------------|-------|---------|
| `PERIODS_PORT` | нет | `3014` |
| `PERIODS_URL` | нет (BFF) | `http://localhost:3014` |
| `DATABASE_URL` / `DB_*` | да | schema `periods` |

## 🌱 Seed (Crimea / Black Sea)

На пустой таблице `periods.period` (`PeriodsSeedService`):

- категории уже из `SEED_CATEGORIES` (`CategoriesService.onModuleInit`);
- деревья в `config/crimea-seed.ts`: epochs, cultures, polities (с partition у Кафы / ханства), dynasties (Гиреи), religions, craft_traditions, trade_networks;
- даты в **н.э.** (ISO); до н.э. — в title/summary (лексикографический compare ненадёжен для BC).

Повторный старт при `count > 0` seed пропускает.

## 📎 Связанные

- [MICROSERVICE-SPEC](../MICROSERVICE-SPEC.md)
- [platform-for-users.md](../../01-goal/platform-for-users.md) — находки и история
- [AGENT-TODO](../../../AGENT-TODO.todo) — d3 виджет

## 🗺️ Roadmap

| Фаза | Содержание |
|------|------------|
| **v1** | Docs + Nest CRUD + partition validation + BFF + admin UI |
| **v2** | ✔ Seed данных Крыма (`crimea-seed.ts`); GIN metadata later |
| **v3** | d3.js SVG timeline (ограничение / выбор периода) |
| **v4** | Привязка аукцион/форум → period |

---

**Автор:** команда разработки · **Версия:** 0.1-spec
