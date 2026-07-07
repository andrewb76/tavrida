# 🏗️ Инфраструктура

## 🌍 Окружения

| Окружение | Домены |
|-----------|--------|
| Local | `*.tavrida-lot.localhost` |
| Dev | `*.tl.dev.some.domain` |
| Prod | `*.tavrida-lot.ru` |

## 🐳 Оркестрация

- Docker Swarm
- Traefik v3 как edge-роутер и TLS

## 💾 Хранилища

| Компонент | Назначение |
|-----------|------------|
| PostgreSQL | Основная БД |
| Redis | Кэш, pub/sub |
| MinIO | Объектное хранилище |

## 🔌 Сторонние сервисы

| Сервис | Назначение |
|--------|------------|
| Logto | Аутентификация |
| Ory Keto | RBAC |
| Grafana Cloud | Метрики, логи, трейсы |
| Sentry | Ошибки фронта и бэка |
| Novu Cloud | Уведомления (email, push, in-app) — Free plan |

## 🔐 Переменные окружения и секреты

Единый реестр для Bitwarden / runtime: **[PLATFORM-SECRETS.md](./PLATFORM-SECRETS.md)**  
Шаблон: [`.env.example`](../../.env.example) в корне репозитория.

## 🔗 Связанные разделы

- [Деплой](../04-deployment/README.md)
- [Observability](../07-observability/README.md)
- [Безопасность](../09-security/README.md)
