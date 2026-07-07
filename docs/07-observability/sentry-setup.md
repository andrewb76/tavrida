# 🐛 Интеграция Sentry (бесплатный план)

## ⚙️ Backend (NestJS)

1. Создать проект в sentry.io.
2. Получить DSN.
3. Установить пакет: `npm install @sentry/node @sentry/tracing`.
4. Инициализировать Sentry в `main.ts`:

```ts
import * as Sentry from '@sentry/node';
import { SentryTracing } from '@sentry/tracing';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
  integrations: [new SentryTracing()],
});
```

5. Добавить переменные окружения: `SENTRY_DSN`.

## 🖥️ Frontend (Vue)

- Установить: `npm install @sentry/vue @sentry/tracing`.
- Инициализировать в `main.js/ts`.
- Настроить tracing и error boundaries.

## ✅ Проверка

- Вызвать ошибку в коде.
- Убедиться, что событие появилось в Sentry UI.

## 🔗 Связанные разделы

- [Observability](./README.md)
- [Grafana Cloud](./grafana-setup.md)
