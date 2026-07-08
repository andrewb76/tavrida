# 🎨 Design tokens

> **Статус:** spec ready · **Версия:** 0.1 (seed)  
> **Реализация:** `@tavrida/ui` + Tailwind preset

Черновик визуальной системы Tavrida Lot. Финальные значения — после ревью с дизайном; код должен читать **токены**, не хардкод hex.

## 🎯 Принципы

- **Mobile-first** — основной сценарий: телефон на рынке / в поле
- **Читаемость** — контент (фото находок, текст форума) важнее декора
- **WCAG AA** — контраст текста и кнопок минимум 4.5:1
- **Крым / море / находка** — сдержанная палитра, без «crypto-neon»

## 🎨 Цвета

| Token | Light | Dark (optional v2) | Использование |
|-------|-------|-------------------|---------------|
| `--color-primary` | `#1B4D6E` | `#5B9BD5` | CTA, links, active nav |
| `--color-primary-hover` | `#153E58` | `#7AB3E0` | hover primary |
| `--color-accent` | `#C4A35A` | `#D4B96A` | badges «Pro», highlights |
| `--color-bg` | `#FAFAF8` | `#12141A` | page background |
| `--color-surface` | `#FFFFFF` | `#1E2229` | cards, modals |
| `--color-border` | `#E5E2DC` | `#2A3038` | dividers |
| `--color-text` | `#1A1A1A` | `#F0F0F0` | body |
| `--color-text-muted` | `#6B6560` | `#9CA3AF` | secondary |
| `--color-success` | `#2D6A4F` | `#52B788` | bid success, paid |
| `--color-warning` | `#B8860B` | `#F4D35E` | pending feedback |
| `--color-error` | `#B91C1C` | `#F87171` | errors, ban |

Semantic aliases: `text-primary`, `bg-surface`, `border-default` — в Tailwind theme.

## ✍️ Типографика

| Token | Font | Size / line | Use |
|-------|------|-------------|-----|
| `--font-sans` | **Inter**, system-ui | — | UI, forum body |
| `--font-display` | **Inter** (600) | — | headings (единый шрифт v1) |
| `--text-xs` | | 12px / 16px | meta, timestamps |
| `--text-sm` | | 14px / 20px | captions, labels |
| `--text-base` | | 16px / 24px | body |
| `--text-lg` | | 18px / 28px | lead |
| `--text-xl` | | 20px / 28px | h3 |
| `--text-2xl` | | 24px / 32px | h2 |
| `--text-3xl` | | 30px / 36px | h1 page title |

## 📐 Spacing & layout

| Token | Value |
|-------|-------|
| `--space-page-x` | 16px mobile, 24px tablet+ |
| `--space-section` | 32px |
| `--radius-sm` | 6px |
| `--radius-md` | 10px |
| `--radius-lg` | 16px |
| `--shadow-card` | `0 1px 3px rgb(0 0 0 / 0.08)` |
| `--max-width-content` | 720px (forum article) |
| `--max-width-catalog` | 1280px (auction grid) |

Grid: 1 col mobile → 2 col sm → 3–4 col lg для каталога лотов.

## 🧱 Компоненты (mapping → `@tavrida/ui`)

| Primitive | Variants |
|-----------|----------|
| `Button` | primary, secondary, ghost, danger; sm/md/lg |
| `Badge` | Free, Basic, Pro, Expert, Live auction |
| `Card` | lot, topic, service listing |
| `Avatar` | sm/md/lg + online dot optional |
| `Toast` | success, error, info |
| `Modal` | confirm, paywall (upgrade Pro) |
| `EmptyState` | icon + title + CTA |

Headless base: **Reka UI** ([14-frontend](../14-frontend/README.md)).

## 📋 Brandbook TODO

- [ ] Logo SVG + favicon
- [ ] Tone of Voice (RU copy guidelines)
- [ ] Figma library sync
- [ ] Email template tokens (Novu)

## 🔗 Связанные разделы

- [11-ux-ui/README.md](./README.md)
- [wireframes](./wireframes/README.md)
- [14-frontend](../14-frontend/README.md)

---

**Автор:** команда разработки · **Версия:** 0.1-seed
