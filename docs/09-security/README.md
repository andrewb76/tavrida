# 🔒 Безопасность

> **Статус:** spec ready · **Версия:** 0.2

## 🔑 Аутентификация

- **Logto** — OIDC, JWT в `Authorization: Bearer`
- BFF validates JWKS ([LOGTO_JWKS_URL](../02-infrastructure/PLATFORM-SECRETS.md))
- Internal service-to-service — service JWT or mTLS (**TODO ADR**)

## 🛡️ Авторизация

- **Ory Keto** — [keto-schema.md](./keto-schema.md) · bootstrap: [bootstrap-admin.md](./bootstrap-admin.md)
- Роли UX: [roles.md](../01-goal/roles.md)
- Модераторы: [moderator-mapping.md](./moderator-mapping.md)
- **Impersonation (admin):** [impersonation.md](./impersonation.md) · [ADR-018](../03-architecture/adr/018-admin-impersonation.md)

## 🔐 Секреты

- **Bitwarden Secrets Manager** — source of truth
- Реестр: [PLATFORM-SECRETS.md](../02-infrastructure/PLATFORM-SECRETS.md)
- Шаблон: [`.env.example`](../../.env.example)

## 🛡️ Operations

- Network zones, rotation, incidents: [security-ops.md](./security-ops.md)
- Admin tools — tinyauth: [dev-tools](../02-infrastructure/dev-tools.md)

## 🔗 Связанные разделы

- [Keto schema](./keto-schema.md)
- [Bootstrap admin](./bootstrap-admin.md)
- [API errors](../06-api/README.md)
- [BFF](../05-microservices/bff/README.md)

---

**Автор:** команда разработки · **Версия:** 0.2-spec
