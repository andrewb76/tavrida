# settings

Scalar platform settings registry (schema `settings`). Spec: [docs/05-microservices/settings/README.md](../../docs/05-microservices/settings/README.md).

```bash
pnpm exec turbo run dev --filter=@tavrida/settings
```

Port **3008** (`SETTINGS_PORT`).

Internal API: `GET/POST /internal/v1/settings/*`
