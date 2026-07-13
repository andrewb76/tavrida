# Docker runtime configs

Единая папка конфигов для Compose (local) и Swarm (dev/prod).

```
config/
├── traefik/
│   ├── traefik.dev.yml   # static — entrypoints, ACME, Swarm provider
│   └── dynamic/          # file provider — middlewares, TLS options (optional)
├── keto/
│   ├── keto.yml
│   └── namespaces.ts
└── postgres/
    └── init/             # first-boot SQL (schemas)
```

| Путь | Где используется |
|------|------------------|
| `traefik/traefik.dev.yml` | `docker/swarm/stack-infra.dev.yml` (Swarm config) |
| `traefik/dynamic/` | bind-mount в Traefik (dev Swarm) |
| `keto/` | `keto.local.yml`, `stack-infra.dev.yml` |
| `postgres/init/` | `infra.local.yml`, `stack-infra.dev.yml` |

Swarm-деплой на VPS требует checkout репозитория на manager-ноде (bind-mount `traefik/dynamic`, `keto/namespaces.ts`, `postgres/init`).
