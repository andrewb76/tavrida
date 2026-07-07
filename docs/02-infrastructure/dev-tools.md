# 🛠️ Admin/UI-инструменты и отладка кластера

> Набор веб-инструментов (UI) для работы с инфраструктурой платформы и упрощения отладки/запуска.
> Все панели вынесены под единый родительский поддомен `*.tools.<env>` и закрыты авторизацией через [tinyauth](https://tinyauth.app).

## 🗄️ UI для хранилищ данных

| Компонент | Инструмент (UI) | Назначение | Примечание |
|---|---|---|---|
| PostgreSQL | Adminer | Лёгкий одно-контейнерный SQL-клиент | Минимум ресурсов, удобен для быстрого доступа |
| PostgreSQL | pgAdmin 4 | Полноценная админка (мониторинг, планы запросов) | Тяжелее Adminer, богаче функционалом |
| PostgreSQL | CloudBeaver | Web-версия DBeaver, мультибазовость | Если нужен единый клиент на несколько БД |
| Redis | RedisInsight | Официальный UI: ключи, профилирование, slowlog | Рекомендую как основной |
| Redis | redis-commander | Простой веб-браузер ключей | Легковесная альтернатива |
| MinIO (S3) | MinIO Console | Встроенная консоль: бакеты, объекты, политики | Идёт в комплекте с MinIO |
| RabbitMQ | RabbitMQ Management | Очереди, обменники, сообщения, соединения | Плагин `rabbitmq_management`, включить в образе |

## 🔍 Инструменты отладки и эксплуатации

| Инструмент | Назначение | Почему полезен для платформы |
|---|---|---|
| Portainer | UI управления Docker Swarm (стеки, сервисы, тома, секреты) | Обзор и рестарт сервисов без CLI |
| Dozzle | Просмотр логов контейнеров в реальном времени | Быстрая отладка без `docker logs`, live-tail по всем сервисам |
| Mailpit | Перехват исходящего SMTP + веб-inbox | Тест email-уведомлений (Novu/SMTP) в dev без реальной отправки |
| Jaeger | Просмотр распределённых трейсов (OTLP) | Локальная альтернатива Grafana Tempo для отладки трейсинга |
| Traefik Dashboard | Маршруты, middlewares, health роутера | Диагностика edge-роутинга и TLS |
| Ory Keto (keto CLI / Ory Console) | Проверка и правка relation tuples | Отладка прав доступа (RBAC/ReBAC) |

## 🌐 Схема доменов

Все дашборды инструментов размещаются под одним родительским поддоменом `tools`:

| Env | Шаблон | Примеры |
|---|---|---|
| local | `*.tools.localhost` | `traefik.tools.localhost`, `pgadmin.tools.localhost`, `redis.tools.localhost` |
| dev | `*.tools.tl.dev.*` | `minio.tools.tl.dev.*`, `rabbitmq.tools.tl.dev.*` |
| prod | `*.tools.tavrida-lot.ru` | `portainer.tools.tavrida-lot.ru` |

Каждый инструмент — отдельный роутер Traefik по имени `<tool>.tools.<env>`; все они шарят одну middleware-защиту.

## 🔐 Доступ через tinyauth

Единая точка авторизации перед всеми инструментами — [tinyauth](https://tinyauth.app): лёгкий self-hosted forward-auth сервер для Traefik (user/password, TOTP, а также OAuth/OIDC).

- **Middleware Traefik** объявляется на контейнере tinyauth и применяется ко всем роутерам `*.tools.<env>`:

```yaml
# на контейнере tinyauth
traefik.http.middlewares.tinyauth.forwardauth.address: http://tinyauth:3000/api/auth/traefik

# на каждом роутере инструмента
traefik.http.routers.<tool>.middlewares: tinyauth
```

- **OIDC через Logto:** tinyauth настраивается как generic OAuth/OIDC клиент к нашему Logto (`TINYAUTH_OAUTH_PROVIDERS_*`), чтобы вход в инструменты шёл под платформенными учётками. Для локальной разработки достаточно user/password + TOTP.
- `TINYAUTH_APPURL` = публичный URL tinyauth (напр. `https://auth.tools.localhost`).
- **Никогда** не публиковать admin-панели без tinyauth; в prod желателен дополнительный IP-allowlist.
- Секреты tinyauth и учётки инструментов — в Bitwarden, см. [PLATFORM-SECRETS](./PLATFORM-SECRETS.md).

## 🧭 Страница-каталог инструментов в админке (план)

В admin-ui планируется страница «Инструменты» — единая точка входа со ссылками/кнопками на все дашборды:

- Карточки/кнопки на каждый инструмент, ведущие на соответствующий `<tool>.tools.<env>`.
- Список формируется из конфигурации окружения (какие инструменты подняты в текущем кластере), чтобы не показывать мёртвые ссылки.
- Доступ к странице — только роль **Admin** (см. [roles](../01-goal/roles.md)); переход в сам инструмент дополнительно проходит tinyauth.
- Группировка по назначению: «Хранилища данных» (Postgres/Redis/MinIO/RabbitMQ) и «Отладка и эксплуатация» (Portainer/Dozzle/Jaeger/Mailpit/Traefik).

> admin-ui как приложение пока не описан ([PROJECT-CONTEXT](../00-meta/PROJECT-CONTEXT.md)); эта страница — часть его будущего скоупа.

## 🔗 Связанные разделы

- [Инфраструктура](./README.md)
- [Таблица инфраструктурных сервисов](./services-saas-matrix.md)
- [Observability](../07-observability/README.md)
- [PLATFORM-SECRETS](./PLATFORM-SECRETS.md)

---

**v0.1** · последнее обновление: 2026-07-07
