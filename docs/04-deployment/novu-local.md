# 📬 Novu self-host — local ops checklist

> **Статус:** deferred · compose готов (`pnpm novu:up`), **onboarding / API key / workflows — позже**  
> Решение: [ADR-019](../03-architecture/adr/019-novu-self-host.md) · Compose: `docker/compose/novu.local.yml`

Пока notifications без `NOVU_API_KEY` работает в **mock** — код fan-out не блокируется.

Когда вернёмся: дописать этот чеклист по реальному Dashboard CE 3.18 (где API Keys, как создать trigger `tag-content`) и только потом прописать `.env.local`.

## 1. Stack (уже есть)

```bash
pnpm novu:up
curl -sf http://localhost:3020/v1/health-check   # status ok
pnpm novu:down                                   # если не нужен RAM
```

| URL | Назначение |
|-----|------------|
| http://localhost:4000 | Dashboard |
| http://localhost:3020 | API (для adapter); `/` → 404 — нормально |
| http://localhost:3022 | WS (Inbox) |

## 2. API key → `.env.local` (TODO)

`NOVU_SECRET_KEY` в `novu.local.env` — **не** `Authorization: ApiKey`.

1. Dashboard → найти **API Keys** / Application Identifier (путь в CE UI уточнить при настройке).
2. В `.env.local`:

```bash
NOVU_API_URL=http://localhost:3020
NOVU_API_KEY=<из Dashboard>
NOVU_APPLICATION_IDENTIFIER=<из Dashboard>
```

3. Перезапуск `@tavrida/notifications`.

## 3. Workflow `tag-content` (TODO)

Trigger identifier строго **`tag-content`** (allowlist в `services/notifications`).

## 4. Smoke (после п.2–3)

Дописать curl-smoke при реальной настройке.

## 5. Дальше (после local OK)

- [ ] Email SMTP в Dashboard
- [ ] Merge в `infra.local.yml`
- [ ] Swarm stack

## 🔗

- [notifications README](../05-microservices/notifications/README.md)
- [PLATFORM-SECRETS](../02-infrastructure/PLATFORM-SECRETS.md)
- [local-dev](./local-dev.md)
