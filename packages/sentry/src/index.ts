import * as Sentry from '@sentry/node';

export type InitSentryNodeOptions = {
  /** Logical service name (tag `service`) */
  service: string;
};

function sampleRate(): number {
  const raw = process.env.SENTRY_TRACES_SAMPLE_RATE?.trim();
  if (raw !== undefined && raw !== '') {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0 && n <= 1) return n;
  }
  return process.env.NODE_ENV === 'production' ? 0.2 : 1;
}

/**
 * Init `@sentry/node` when `SENTRY_DSN` is set (no-op otherwise).
 * Hawk.so accepts official Sentry SDK DSN from project Integrations.
 */
export function initSentryNode(options: InitSentryNodeOptions): boolean {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn || !/^https?:\/\//i.test(dsn)) {
    // eslint-disable-next-line no-console -- bootstrap diagnostics before Nest Logger
    console.warn(`[sentry] disabled for ${options.service}: SENTRY_DSN missing or invalid`);
    return false;
  }

  const environment =
    process.env.SENTRY_ENVIRONMENT?.trim() ||
    process.env.NODE_ENV?.trim() ||
    'development';
  const release =
    process.env.SENTRY_RELEASE?.trim() ||
    process.env.GIT_SHA?.trim() ||
    undefined;

  let host = 'unknown';
  try {
    host = new URL(dsn).hostname;
  } catch {
    /* ignore */
  }

  Sentry.init({
    dsn,
    environment,
    release,
    serverName: options.service,
    tracesSampleRate: sampleRate(),
    debug: process.env.SENTRY_DEBUG === '1' || process.env.SENTRY_DEBUG === 'true',
    initialScope: {
      tags: { service: options.service },
    },
  });

  // eslint-disable-next-line no-console -- bootstrap diagnostics before Nest Logger
  console.log(
    `[sentry] enabled for ${options.service} → ${host} env=${environment}` +
      (release ? ` release=${release}` : ''),
  );

  return true;
}

type NestLikeApp = {
  getHttpAdapter: () => { getInstance: () => unknown };
};

/**
 * Hook Nest (Express) error pipeline so unhandled HTTP errors reach Sentry.
 * Call after `NestFactory.create`.
 */
export function attachSentryToNestApp(app: NestLikeApp): void {
  if (!process.env.SENTRY_DSN?.trim()) return;
  try {
    const instance = app.getHttpAdapter().getInstance();
    Sentry.setupExpressErrorHandler(instance as Parameters<typeof Sentry.setupExpressErrorHandler>[0]);
  } catch {
    // Non-Express adapter or Sentry not inited — ignore
  }
}

export { Sentry };
