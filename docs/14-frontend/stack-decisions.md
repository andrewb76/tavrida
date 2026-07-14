# 🧱 Frontend stack — решения (v1)

> **Статус:** accepted · **Версия:** 0.1  
> **Связано:** [README](./README.md) · [design-tokens](../11-ux-ui/design-tokens.md) · [screen-tree](../11-ux-ui/screen-tree.md)

Документ фиксирует выбор библиотек и слоёв UI **до** наполнения экранов. Цель: брендбук и темы меняются через **токены**, сложная графика — через **d3** точечно, без лишней реактивной «магии».

---

## 📊 Сводка решений

| Слой | Выбор v1 | Альтернативы (отклонены) |
|------|----------|-------------------------|
| UI primitives | **Reka UI** в `@tavrida/ui` | Element Plus, Naive UI, Vuetify — жёсткий visual language |
| Стили | **Tailwind CSS v4** + CSS variables | CSS Modules only, UnoCSS — хуже экосистема под Reka/shadcn-паттерн |
| Варианты компонентов | **CVA** + `cn()` (clsx + tailwind-merge) | ручные class strings |
| Графика / инфографика | **d3** (subpath imports) | Chart.js, ECharts — быстрее, но хуже для кастома |
| Server state | **TanStack Query** | RxJS store, plain fetch |
| Client state | **Pinia** | RxJS BehaviorSubject |
| Realtime | **Composable + WebSocket** | RxJS WebSocketSubject (v2 если усложнится) |
| **RxJS** | **Не используем в v1** | см. [§ RxJS](#-rxjs) |
| Уведомления UI | **vue-sonner** (toast) + Novu Inbox | свой Toast |
| Markdown (форум) | **markdown-it** + `@tailwindcss/typography` | MDX — overkill |
| Icons | **@iconify/vue** + Lucide subset (`@iconify-icons/lucide`) | inline SVG · emoji · full `@iconify-json/lucide` |

---

## 🎨 Иконки (`UiIcon`)

Источник: [Lucide](https://lucide.dev) через [@iconify/vue](https://docs.iconify.design/icon-components/vue/).  
Офлайн-subset регистрируется в `registerLucideIcons` (импорты `@iconify-icons/lucide/*` — tree-shake). Новый глиф → добавить import + ключ в `uiIcons`.

```vue
<script setup>
import { UiIcon } from '@tavrida/ui'
</script>
<template>
  <UiIcon name="home" :size="20" />
  <UiIcon name="lucide:gavel" label="Аукцион" />
</template>
```

| Правило | Деталь |
|---------|--------|
| Импорт | только `UiIcon` / `uiIcons` из `@tavrida/ui` — не тянуть `@iconify/vue` из views |
| Имена | семантические ключи (`home`, `auctions`, …) → см. `uiIcons` |
| a11y | декоративные без `label` (`aria-hidden`); кликабельные — с `label` или `title` на кнопке |
| Цвет | `currentColor` — наследует `text-*` родителя |

| i18n | **vue-i18n** | — |
| Тесты | Vitest + Playwright | — |

---

## 🎨 Слои UI (архитектура)

```
apps/frontend/src/
├── views/              # страницы (маршрут = wireframe Wxx)
├── features/           # фича-компоненты (BidModal, TopicComposer…)
├── components/         # локальные композиции app-level (AppHeader)
└── composables/        # useApi, useWs, useTheme…

packages/ui/            # design system (переиспользуется admin-ui)
├── styles/             # tokens.css, theme.css — источник правды для Tailwind
├── primitives/         # Button, Modal… (Reka + Tailwind)
├── patterns/           # EmptyState, PageShell, PaywallModal
└── viz/                # d3-обёртки: Heatmap, Sparkline (опционально)
```

**Правило импорта:** приложение **не** тянет `reka-ui` напрямую — только `@tavrida/ui`. Исключение: прототип в одном PR, потом перенос в ui-пакет.

---

## 🧩 Библиотека компонентов: Reka UI

### Почему Reka UI

- **Headless + a11y** (focus trap, aria, keyboard) — критично для modal ставки, paywall, форм.
- **Unstyled** — весь visual layer через Tailwind и токены брендбука.
- Преемник **Radix Vue** / shadcn-vue-экосистемы; активная разработка под Vue 3.
- Совпадает с уже принятым решением в [design-tokens](../11-ux-ui/design-tokens.md) и [14-frontend](./README.md).

### Почему не «полная» UI-библиотека

| Библиотека | Минус для Tavrida Lot |
|------------|----------------------|
| Element Plus / Naive | свой visual language, тяжело подогнать под брендбук Крым/море |
| Vuetify | Material Design, mobile auction UX не тот |
| Quasar | свой layout framework, дублирует решения |

### Паттерн реализации (как shadcn, но owned)

1. Примитив из **Reka** (`DialogRoot`, `DialogContent`…).
2. Стили через **CVA**-варианты + токены Tailwind (`bg-surface`, `text-primary`).
3. Экспорт из `@tavrida/ui` — одна публичная `Modal`, внутренности скрыты.

```vue
<!-- packages/ui/primitives/Modal/Modal.vue (sketch) -->
<script setup lang="ts">
import { DialogContent, DialogOverlay, DialogPortal, DialogRoot } from 'reka-ui'
import { cn } from '../../lib/cn'
</script>
```

---

## 🌓 Tailwind и темизация (брендбук-ready)

### Принцип: CSS variables → Tailwind → компоненты

1. **`packages/ui/styles/tokens.css`** — семантические переменные (`--color-primary`, …) для `[data-theme="light"]` и `[data-theme="dark"]`.
2. **`packages/ui/styles/theme.css`** — `@theme` Tailwind v4 мапит переменные на utility-классы.
3. **Компоненты** используют только semantic classes: `bg-surface`, `text-muted`, `border-default` — **не** `#1B4D6E`.

### Переключение темы

```html
<html data-theme="light">   <!-- или dark -->
```

Pinia store `useTheme()` + `localStorage` + `prefers-color-scheme` при первом визите. Novu/email — отдельные токены позже.

### Инструменты стилей

| Пакет | Назначение |
|-------|------------|
| `tailwindcss` v4 + `@tailwindcss/vite` | utility-first, `@theme` |
| `@tailwindcss/typography` | prose для Markdown форума |
| `tailwind-merge` | без конфликтов классов |
| `clsx` | условные классы |
| `class-variance-authority` | variants: `Button` size/intent |

### Расширение брендбука

Новый accent / сезонная кампания = правка **tokens.css** + snapshot в Storybook (post-MVP). Компоненты не трогаем.

---

## 📈 d3.js — графика и сложный custom UI

### Где нужен d3 в продукте

| Место | Wireframe | Тип viz |
|-------|-----------|---------|
| Профиль | W07 | Activity heatmap (календарь активности) |
| Профиль / рейтинг | W07 | Sparkline karma (опционально v1.1) |
| Лот / админ (post-MVP) | — | Timeline ставок (если не хватит таблицы) |
| Landing / about | W12 | Декоративная инфографика (optional) |

### Правила использования

1. **Subpath imports** — tree-shaking, не `import * as d3 from 'd3'`:
   ```ts
   import { scaleTime, scaleLinear } from 'd3-scale'
   import { line, area } from 'd3-shape'
   import { axisBottom } from 'd3-axis'
   ```
2. **Только SVG/canvas внутри Vue-компонента** — d3 не управляет DOM приложения (no `d3.select('body')`).
3. **Composable `useD3()`** — mount → render → `watch(data)` → `resizeObserver` → cleanup on unmount.
4. **Цвета из CSS variables** — `getComputedStyle(el).getPropertyValue('--color-primary')`, чтобы dark theme работала.
5. **Пакет `@tavrida/ui/viz`** — `ActivityHeatmap.vue`, `Sparkline.vue`; views импортируют их, не d3 напрямую.

### Почему не Chart.js / ECharts

- Heatmap и кастомная инфографика на ECharts возможны, но **vendor lock-in** стиля.
- d3 — максимальная гибкость под брендбук; learning curve оправдан для 2–3 viz-компонентов.

### a11y

Графики: `role="img"` + скрытая таблица данных или `aria-label` с summary для screen readers.

---

## ⚡ RxJS — позиция

### Вердикт v1: **не добавляем**

| Задача | Решение без RxJS |
|--------|------------------|
| REST + cache | TanStack Query |
| UI state, theme, drafts | Pinia |
| WS reconnect, subscribe | `useWs()` composable + refs |
| Debounce search | `@vueuse/core` `watchDebounced` |
| Merge WS + query cache | явный handler в composable |

### Почему не RxJS «на будущее»

- Дублирует модель реактивности Vue 3 + Query — два способа думать об async.
- Bundle (+~30 KB gzipped min) без выигрыша на MVP.
- Команда: выше порог входа, сложнее онбординг.

### Когда пересмотреть (v2)

- Multiplex **10+ WS каналов** с merge/throttle/backpressure.
- Live auction «tick stream» с агрегацией на клиенте.
- Тогда: `rxjs` **только** в `src/ws/stream-hub.ts`, наружу — refs/composables. Не в components/views.

### `@vueuse/rxjs`

Допустим как мост **если** RxJS уже появился в ws-слое; не использовать для REST.

---

## 🏗️ Компоненты верхнего уровня

### Tier 1 — Primitives (`@tavrida/ui/primitives`)

| Компонент | Reka base | Примечание |
|-----------|-----------|------------|
| `Button` | — | CVA: primary/secondary/ghost/danger, sm/md/lg |
| `Icon` (`UiIcon`) | Iconify | Lucide; см. [§ Иконки](#-иконки-uiicon) |
| `IconButton` | — | a11y label обязателен |
| `Input`, `Textarea` | — | validation states |
| `Select`, `Checkbox`, `Switch` | Reka | |
| `Badge`, `Chip` | — | Free/Basic/Pro/Live |
| `Avatar` | — | sm/md/lg |
| `Card` | — | slot-based |
| `Modal`, `Sheet` | Dialog | mobile: Sheet снизу |
| `DropdownMenu` | Menu | user menu |
| `Tabs` | Tabs | lot page tabs |
| `Toast` | — | vue-sonner wrapper |
| `Skeleton` | — | loading |
| `Tooltip` | Tooltip | |

### Tier 2 — Patterns (`@tavrida/ui/patterns`)

| Pattern | Wireframes | Описание |
|---------|------------|----------|
| `AppShell` | all member | header + main + bottom nav |
| `PageHeader` | — | back, title, actions |
| `EmptyState` | W02, W05 | illustration + CTA |
| `ErrorBanner` | — | RFC 7807 detail |
| `PaywallModal` | W16 | lock + link /plans |
| `LoadMore` | W02, W05 | cursor pagination |
| `BalanceChip` | W01 | header wallet |
| `LiveBadge` | W02, W03 | pulse dot |

### Tier 3 — Feature (`apps/frontend/features/`)

Специфичны для домена, **не** в ui-пакете (или позже, если нужен admin):

- `LotCard`, `BidModal`, `BidHistoryList`
- `TopicListItem`, `CommentThread`, `MarkdownBody`
- `PlanComparisonCards`, `DealFeedbackModal`
- `NotificationBell` (Novu wrapper)

### Tier 4 — Viz (`@tavrida/ui/viz`)

- `ActivityHeatmap` (d3)
- `Sparkline` (d3, optional)

---

## 📦 Зависимости (целевой `package.json`)

### `apps/frontend`

```json
{
  "dependencies": {
    "@tavrida/ui": "workspace:*",
    "@tavrida/shared": "workspace:*",
    "@logto/vue": "^3",
    "@tanstack/vue-query": "^5",
    "@vueuse/core": "^12",
    "ofetch": "^1",
    "pinia": "^2",
    "vue": "^3.5",
    "vue-i18n": "^10",
    "vue-router": "^4",
    "vue-sonner": "^1"
  }
}
```

### `packages/ui`

```json
{
  "dependencies": {
    "reka-ui": "^2",
    "class-variance-authority": "^0.7",
    "clsx": "^2",
    "tailwind-merge": "^2"
  },
  "peerDependencies": {
    "vue": "^3.5"
  },
  "optionalDependencies": {
    "d3-scale": "^4",
    "d3-shape": "^3",
    "d3-array": "^3"
  }
}
```

`d3-*` подключаем при первом viz-комponente, не в bootstrap PR.

---

## 🚀 План bootstrap (каркас)

| # | Задача | Результат |
|---|--------|-----------|
| 1 | Tailwind v4 + tokens в `@tavrida/ui` | тема light/dark переключается |
| 2 | `cn()`, первый `Button` | паттерн CVA работает |
| 3 | `main.ts`: router, pinia, query, i18n stub | app shell |
| 4 | `AppShell` + routes-заглушки | навигация по screen-tree |
| 5 | `ofetch` client + mock adapter | W02 без BFF |
| 6 | Vitest config | тест `cn()` / Button |

---

## ❓ Открытые вопросы (не блокируют старт)

- Storybook для `@tavrida/ui` — v1.1
- Figma → tokens sync — после брендбука
- Font: Inter self-host vs Google Fonts — privacy/perf
- Novu Inbox styling vs tokens

---

## 🔗 Связанные разделы

- [design-tokens](../11-ux-ui/design-tokens.md)
- [wireframes](../11-ux-ui/wireframes/README.md)
- [ADR-002 BFF REST+WS](../03-architecture/adr/002-bff-rest-wss.md)

---

**Автор:** команда разработки · **Версия:** 0.1-accepted
