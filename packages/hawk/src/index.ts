import HawkCatcher from '@hawk.so/nodejs';

export type InitHawkNodeOptions = {
  /** Logical service name (context `service`) */
  service: string;
};

/**
 * Hawk Integration Token is a JWT-like string from project settings —
 * not a Sentry-compatible DSN (`https://…@k1.hawk.so/…`).
 */
/** Swarm placeholder when GH secret not set yet — Nest stays no-op, stack can still mount the secret. */
const UNSET_TOKEN = '__unset__';

function resolveToken(): string | undefined {
  const token = process.env.HAWK_TOKEN?.trim();
  if (!token || token === UNSET_TOKEN) return undefined;
  if (/^https?:\/\//i.test(token)) {
    // eslint-disable-next-line no-console -- bootstrap diagnostics before Nest Logger
    console.warn(
      '[hawk] HAWK_TOKEN looks like a DSN URL; native catchers need the Integration Token (JWT), not Sentry Integration DSN',
    );
    return undefined;
  }
  return token;
}

/**
 * Init `@hawk.so/nodejs` when `HAWK_TOKEN` is set (no-op otherwise).
 * Registers `uncaughtException` / `unhandledRejection` handlers.
 */
export function initHawkNode(options: InitHawkNodeOptions): boolean {
  const token = resolveToken();
  if (!token) {
    // eslint-disable-next-line no-console -- bootstrap diagnostics before Nest Logger
    console.warn(`[hawk] disabled for ${options.service}: HAWK_TOKEN missing or invalid`);
    return false;
  }

  const environment =
    process.env.HAWK_ENVIRONMENT?.trim() ||
    process.env.NODE_ENV?.trim() ||
    'development';
  const release =
    process.env.HAWK_RELEASE?.trim() ||
    process.env.GIT_SHA?.trim() ||
    undefined;

  HawkCatcher.init({
    token,
    release,
    context: {
      service: options.service,
      environment,
    },
  });

  // eslint-disable-next-line no-console -- bootstrap diagnostics before Nest Logger
  console.log(
    `[hawk] enabled for ${options.service} env=${environment}` +
      (release ? ` release=${release}` : ''),
  );

  return true;
}

type NestLikeApp = {
  getHttpAdapter: () => { getInstance: () => unknown };
};

type ExpressErrorMiddleware = (
  err: unknown,
  req: unknown,
  res: unknown,
  next: (err?: unknown) => void,
) => void;

/**
 * Hook Nest (Express) error pipeline so unhandled HTTP errors reach Hawk.
 * Call after `NestFactory.create`.
 */
export function attachHawkToNestApp(app: NestLikeApp): void {
  if (!resolveToken()) return;
  try {
    const instance = app.getHttpAdapter().getInstance() as {
      use: (middleware: ExpressErrorMiddleware) => void;
    };
    instance.use((err, _req, _res, next) => {
      if (err instanceof Error) {
        HawkCatcher.send(err);
      } else if (err != null) {
        HawkCatcher.send(new Error(typeof err === 'string' ? err : JSON.stringify(err)));
      }
      next(err);
    });
  } catch {
    // Non-Express adapter or Hawk not inited — ignore
  }
}

export { HawkCatcher };
