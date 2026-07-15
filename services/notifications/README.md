# @tavrida/notifications

Novu adapter — audit log + HTTP trigger. Spec: [docs/05-microservices/notifications/README.md](../../docs/05-microservices/notifications/README.md).

```bash
pnpm --filter @tavrida/notifications dev   # :3010
```

Without `NOVU_API_KEY` triggers run in **mock** mode (`transactionId: mock-…`, status `sent`) and still write `notification_log`.
