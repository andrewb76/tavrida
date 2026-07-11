# billing

NestJS service — лицевые счета и списания. Port **3001**, schema `billing`.

## Run

```bash
docker compose -f docker/compose/infra.local.yml up -d
pnpm exec turbo run dev --filter=@tavrida/billing
curl http://localhost:3001/health
curl "http://localhost:3001/internal/v1/wallets/balance?userId=dev-user"
```

## v1 scope

- `GET /internal/v1/wallets/balance`
- `GET /internal/v1/wallets/transactions`
- `POST /internal/v1/wallets/charge` (Idempotency-Key header)
- `POST /internal/v1/wallets/deposit` (dev / internal — без платёжного провайдера)
- BFF proxy: `GET/POST /api/v1/wallets/*`

Spec: [docs/05-microservices/billing/README.md](../../docs/05-microservices/billing/README.md)
