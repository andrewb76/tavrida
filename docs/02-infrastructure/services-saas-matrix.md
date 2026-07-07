# 🧩 Таблица инфраструктурных сервисов + SaaS-замены

> Сервисы, необходимые для функционирования платформы на уровне инфраструктуры и платформенных интеграций.
> Внутренние бизнес-микросервисы (billing, auction, forum и т.д.) в этот список не входят.

| Предназначение и краткое описание | Наименование | SaaS (варианты замены для MVP или локальной разработки на SaaS с бесплатным тарифом) |
|---|---|---|
| Основная реляционная БД платформы (подход schema per service) | PostgreSQL | Neon (Free), Supabase Postgres (Free), Railway Postgres (Trial/Free), Render Postgres (Free) |
| Кэш, pub/sub, быстрые ephemeral-данные, relay для realtime-сценариев | Redis | Upstash Redis (Free), Redis Cloud (Free) |
| Брокер асинхронных событий между сервисами | RabbitMQ | CloudAMQP "Little Lemur" (Free) |
| S3-совместимое объектное хранилище для медиа и вложений | MinIO (S3-compatible) | Cloudflare R2 (Free tier), Backblaze B2 (Free tier), Supabase Storage (Free) |
| Аутентификация пользователей и OIDC/JWT-поток | Logto | Logto Cloud (Free), Clerk (Free), Auth0 (Free) |
| Авторизация (RBAC/ReBAC), проверка и хранение relation tuples | Ory Keto | Ory Network (Free dev), Auth0 FGA (Free), OpenFGA (self-host) |
| Сбор и визуализация метрик, логов и трейсов | Grafana Cloud | Grafana Cloud Free |
| Трекинг и алертинг ошибок фронтенда и бэкенда | Sentry | Sentry Developer (Free), GlitchTip (self-host) |
| Омниканальные уведомления (email, push, in-app) | Novu | Novu Cloud Free |
| Транзакционный email (SMTP/API) — доставка писем, провайдер для Novu | SMTP / transactional email | Brevo (300 писем/день Free), Resend (3 000/мес Free), SendGrid (100/день Free), Mailgun (Free trial), Amazon SES (pay-as-you-go) |

## 🔗 Связанные разделы

- [Инфраструктура](./README.md)
- [PLATFORM-SECRETS](./PLATFORM-SECRETS.md)
- [ADR-004 Notifications Adapter](../03-architecture/adr/004-notifications-adapter.md)

---

**v0.1** · последнее обновление: 2026-07-07
