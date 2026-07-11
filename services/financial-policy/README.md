# financial-policy

NestJS service — тарифы Free/Basic/Pro, лимиты и подписки. Port **3002**, schema `financial_policy`.

## Run

```bash
docker compose -f docker/compose/infra.local.yml up -d
pnpm exec turbo run dev --filter=@tavrida/financial-policy
curl http://localhost:3002/health
curl http://localhost:3002/internal/v1/plans
```

Через BFF (JWT):

```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/plans
```

## v1 scope

- Seed plans + core parameters from PLATFORM-REGISTRY
- `POST /internal/v1/limits/check`, `POST /internal/v1/features/can-use`
- `GET /internal/v1/subscription`, `POST .../activate` (free only; paid → `billing_not_wired`)
- BFF: `GET/POST /api/v1/plans/*`

Spec: [docs/05-microservices/financial-policy/README.md](../../docs/05-microservices/financial-policy/README.md)
