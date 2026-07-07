# 🔒 Безопасность

## 🔑 Аутентификация

- Logto как IdP
- JWT в `Authorization` header

## 🛡️ Авторизация

- Ory Keto — [keto-schema.md](./keto-schema.md)
- Роли и матрица: [roles.md](../01-goal/roles.md)

## 🔐 Хранение секретов

- Bitwarden Secrets Manager
- Переменные окружения только для runtime
- **Реестр всех env:** [PLATFORM-SECRETS.md](../02-infrastructure/PLATFORM-SECRETS.md) · шаблон [`.env.example`](../../.env.example)

## 🔗 Связанные разделы

- [Keto schema](./keto-schema.md)
- [Роли](../01-goal/roles.md)
- [API](../06-api/README.md)
- [BFF](../05-microservices/bff/README.md)
