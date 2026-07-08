# ⚙️ GitHub Actions

> **Статус:** spec ready · **Версия:** 0.1  
> **Статический сайт:** `@tavrida/docs-site` (VitePress) · **Источник:** `docs/`

## 🎯 Обзор

| Workflow | Файл | Триггер | Назначение |
|----------|------|---------|------------|
| **CI** | [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) | PR + push `master` | lint, сборка docs, turbo build |
| **Docs Pages** | [`.github/workflows/docs-pages.yml`](../../.github/workflows/docs-pages.yml) | push `master`, manual | Публикация на **GitHub Pages** |

```mermaid
flowchart LR
    PR[PR / push] --> CI[ci.yml]
    CI --> Lint[pnpm lint]
    CI --> Docs[pnpm docs:build]
    CI --> Build[turbo build]
    PushMaster[push master] --> Pages[docs-pages.yml]
    Pages --> GHP[GitHub Pages]
```

## 📚 Статический сайт документации

| | |
|---|---|
| **Опубликовано** | **[https://andrewb76.github.io/tavrida/](https://andrewb76.github.io/tavrida/)** |
| Репозиторий | [andrewb76/tavrida](https://github.com/andrewb76/tavrida) |
| Пакет | `apps/docs-site` (`@tavrida/docs-site`) |
| Движок | [VitePress](https://vitepress.dev/) 1.x |
| Источник MD | `docs/` → копия в `apps/docs-site/content` (`prebuild` sync) |
| Выход | `apps/docs-site/.vitepress/dist` |

Перед `dev` / `build` скрипт [`sync-docs.mjs`](../../apps/docs-site/scripts/sync-docs.mjs) копирует `docs/` в `content/` (VitePress требует src внутри пакета).

### Локально

```bash
pnpm install
pnpm docs:dev      # http://localhost:5173
pnpm docs:build    # production build
pnpm docs:preview  # preview dist
```

### Base path

Для GitHub Pages **project site** этого репозитория:

| | |
|---|---|
| URL | [https://andrewb76.github.io/tavrida/](https://andrewb76.github.io/tavrida/) |
| `VITEPRESS_BASE` | `/tavrida/` |

```bash
VITEPRESS_BASE=/tavrida/ pnpm docs:build
```

В CI переменная `VITEPRESS_BASE` выставляется из `github.event.repository.name` (в workflow — `/tavrida/`).

Для custom domain — `VITEPRESS_BASE=/`.

## 🚀 Включение GitHub Pages

1. Откройте **[Settings → Pages](https://github.com/andrewb76/tavrida/settings/pages)**
2. **Build and deployment → Source:** выберите **GitHub Actions** (не «Deploy from a branch»)
3. **Actions** → workflow **Docs (GitHub Pages)** → **Re-run all jobs** (или новый push в `master`)

После успешного deploy: [https://andrewb76.github.io/tavrida/](https://andrewb76.github.io/tavrida/)

### Troubleshooting: 404 / `Failed to create deployment (status: 404)`

| Симптом | Причина | Решение |
|---------|---------|---------|
| Deploy job: `Ensure GitHub Pages has been enabled` | Pages не включён | Шаги 1–2 выше |
| Build зелёный, deploy красный | То же | Re-run после включения |
| Сайт 404 после зелёного deploy | Кэш / ещё не прошёл DNS | Подождать 1–2 мин, hard refresh |

> `gh` не обязателен — достаточно UI в Settings.

## 🔐 Секреты (будущие стадии CI)

См. [PLATFORM-SECRETS](../02-infrastructure/PLATFORM-SECRETS.md). На текущем этапе workflows **не требуют** секретов.

Планируется:

| Stage | Secrets |
|-------|---------|
| Docker push | `REGISTRY_*` |
| Deploy dev/prod | `SWARM_*`, Bitwarden OIDC |

## 📋 Roadmap pipelines

| Стадия | Статус |
|--------|--------|
| Lint + docs build | ✅ workflow |
| GitHub Pages | ✅ workflow |
| `pnpm test` в CI | TODO |
| Docker matrix build | TODO ([README](./README.md)) |
| Deploy Swarm dev on merge | TODO |

## 🔗 Связанные разделы

- [README](./README.md) — общий CI/CD
- [12-dev-process](../12-dev-process/README.md)
- [AGENTS.md](../../AGENTS.md)

---

**Автор:** команда разработки · **Версия:** 0.1-spec
