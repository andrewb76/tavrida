# 🎨 Design tokens — справочник

> **Статус:** spec ready · **Версия:** 0.2  
> **Канон значений:** [brandbook.md](./brandbook.md) §5–7  
> **Как применять в UI:** [design-system.md](./design-system.md)

Краткий справочник имён токенов для `@tavrida/ui` и Tailwind.  
**Не дублирует** брендбук по смыслу — только имена и маппинг в код.

---

## Источник истины

```
brandbook (значения, роли)
    → design-system (семантика UI, компоненты)
        → packages/ui/styles/tokens.css (--token-*)
            → packages/ui/styles/theme.css (@theme inline → Tailwind)
```

---

## Цвета (target — brandbook)

| `--token-*` | HEX | Tailwind utility | Роль |
|-------------|-----|------------------|------|
| `--token-ink` | `#0B1F24` | `text-ink`, `bg-ink` | Текст, inverse surfaces |
| `--token-ink-soft` | `#16333A` | `bg-ink-soft` | Панели, hero |
| `--token-chalk` | `#F2F4F3` | `bg-chalk` | Page background |
| `--token-mist` | `#E4EAE8` | `bg-mist` | Secondary bg |
| `--token-foam` | `#FAFBFA` | `bg-foam` | Cards, inputs |
| `--token-patina` | `#1F7A6E` | `bg-patina`, `text-patina` | Primary action |
| `--token-patina-deep` | `#155E55` | `bg-patina-deep` | Hover primary |
| `--token-copper` | `#C47A3A` | `bg-copper` | Bid / hot |
| `--token-copper-deep` | `#A35F28` | `bg-copper-deep` | Hover bid |
| `--token-sand` | `#C9B89A` | `bg-sand` | Warm accent |
| `--token-muted` | `#5C6B70` | `text-muted` | Secondary text |
| `--token-line` | `#CDD6D4` | `border-line` | Borders |
| `--token-live` | `#D94A2A` | `text-live` | Live auction |
| `--token-success` | `#2F7D4A` | `text-success` | Success |
| `--token-warning` | `#C4922A` | `text-warning` | Warning |
| `--token-danger` | `#B42318` | `text-danger` | Error |
| `--token-info` | `#2B6B8C` | `text-info` | Info |

### Legacy alias (до миграции кода)

| Legacy в `tokens.css` | Заменить на |
|-----------------------|-------------|
| `--token-primary` | `--token-patina` |
| `--token-primary-hover` | `--token-patina-deep` |
| `--token-accent` | `--token-copper` |
| `--token-bg` | `--token-chalk` |
| `--token-surface` | `--token-foam` |
| `--token-border` | `--token-line` |
| `--token-text` | `--token-ink` |
| `--token-text-muted` | `--token-muted` |
| `--token-error` | `--token-danger` |

---

## Типографика

| `--token-*` | Значение |
|-------------|----------|
| `--token-font-display` | `'Unbounded', system-ui, sans-serif` |
| `--token-font-sans` | `'Onest', system-ui, sans-serif` |
| `--token-font-mono` | `'JetBrains Mono', ui-monospace, monospace` |

Размеры — semantic classes в [design-system §3.3](./design-system.md#33-типографика).

---

## Radius & shadow

| `--token-*` | Value |
|-------------|-------|
| `--token-radius-sm` | `6px` |
| `--token-radius-md` | `10px` |
| `--token-radius-lg` | `16px` |
| `--token-shadow-sm` | `0 1px 2px rgb(11 31 36 / 0.06)` |
| `--token-shadow-md` | `0 8px 24px rgb(11 31 36 / 0.10)` |
| `--token-shadow-lg` | `0 16px 40px rgb(11 31 36 / 0.14)` |

---

## Layout

| `--token-*` | Value |
|-------------|-------|
| `--token-max-width-catalog` | `1200px` |
| `--token-max-width-prose` | `720px` |
| `--token-space-page-x` | `16px` (mobile), `24px` (md+) |

---

## 🔗 Связанные разделы

- [design-system.md](./design-system.md)
- [brandbook.md](./brandbook.md)
- [11-ux-ui/README.md](./README.md)

---

**Автор:** команда разработки · **Версия:** 0.2-spec
