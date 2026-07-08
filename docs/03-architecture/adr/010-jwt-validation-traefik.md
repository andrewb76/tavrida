# ADR-010: Валидация JWT на edge (Traefik)

> **Статус:** proposed · **Дата:** 2026-07-09

## 🎯 Контекст

Сейчас BFF и сервисы валидируют JWT (Logto JWKS) самостоятельно. При росте трафика:
- дублирование JWKS fetch и crypto на каждом hop;
- поздний отсев невалидных запросов;
- сложнее единая политика rate-limit per `sub`.

## ✅ Решение (целевое)

### Разделение ответственности

| Слой | Что делает |
|------|------------|
| **Traefik** (ForwardAuth или JWT plugin) | Проверка подписи, `exp`, `iss`, `aud`; опционально inject headers |
| **BFF** | Authorization business rules (`requireMember`, Keto checks, plan) |
| **Internal services** | Service token / mTLS; **не** повторять user JWT на internal hop |

### Traefik inject headers (пример)

```http
X-User-Id: {sub}
X-Auth-Time: {iat}
```

BFF **доверяет** headers только от trusted internal network (Traefik → BFF, не от клиента). Strip incoming `X-User-Id` от public.

### Маршруты

| Path | Edge JWT |
|------|----------|
| `/api/v1/*` (кроме public landing config) | Required для mutate; optional для некоторых GET |
| `/ws/v1` | Token query param — validate at WS handshake middleware |
| `/` static landing | No JWT |

### JWKS cache

Traefik plugin или sidecar `oauth2-proxy` / custom ForwardAuth service с Redis JWKS cache (TTL 1h, kid rotation).

## 🔄 Альтернативы

| Вариант | Оценка |
|---------|--------|
| Только BFF validation | OK для MVP |
| API Gateway (Kong) | Дублирует Traefik в Swarm |
| mTLS client certs для users | Не для SPA |

## 📌 Последствия

- **MVP:** оставить валидацию в BFF; заложить header contract в [bff/README.md](../../05-microservices/bff/README.md).
- **Prod hardening:** Traefik ForwardAuth после стабилизации auth flow.
- Keto / member / invite checks **остаются в BFF** — edge не знает клубную модель.

---

**Связано:** [security-ops.md](../../09-security/security-ops.md) · [bff](../../05-microservices/bff/README.md)
