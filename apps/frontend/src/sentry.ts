import * as Sentry from '@sentry/vue';
import type { App } from 'vue';
import type { Router } from 'vue-router';

/**
 * Browser Sentry (Hawk DSN compatible). No-op without `VITE_SENTRY_DSN`.
 */
export function initSentryVue(app: App, router: Router): boolean {
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();
  if (!dsn) {
    console.warn('[sentry] disabled for frontend: VITE_SENTRY_DSN missing (build-time)');
    return false;
  }

  const environment =
    import.meta.env.VITE_SENTRY_ENVIRONMENT?.trim() ||
    import.meta.env.MODE ||
    'development';
  const release = import.meta.env.VITE_SENTRY_RELEASE?.trim() || undefined;

  let host = 'unknown';
  try {
    host = new URL(dsn).hostname;
  } catch {
    /* ignore */
  }

  Sentry.init({
    app,
    dsn,
    environment,
    release,
    integrations: [Sentry.browserTracingIntegration({ router })],
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1,
    initialScope: {
      tags: { service: 'frontend' },
    },
  });

  console.info(`[sentry] enabled for frontend → ${host} env=${environment}`);
  return true;
}
