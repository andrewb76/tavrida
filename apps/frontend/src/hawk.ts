import HawkCatcher from '@hawk.so/browser';
import type { App } from 'vue';

type HawkWindow = Window & {
  HAWK_RELEASE?: string;
  __tavridaHawkSmoke?: () => void;
};

/**
 * Browser Hawk catcher. No-op without `VITE_HAWK_TOKEN` (Integration Token).
 * Pass Vue app so component errors reach Hawk (`connectVue`).
 */
export function initHawkVue(app: App): boolean {
  const token = import.meta.env.VITE_HAWK_TOKEN?.trim();
  if (!token) {
    console.warn('[hawk] disabled for frontend: VITE_HAWK_TOKEN missing (build-time)');
    return false;
  }
  if (/^https?:\/\//i.test(token)) {
    console.warn(
      '[hawk] VITE_HAWK_TOKEN looks like a DSN URL; use Hawk Integration Token (JWT), not Sentry DSN',
    );
    return false;
  }

  const environment =
    import.meta.env.VITE_HAWK_ENVIRONMENT?.trim() ||
    import.meta.env.MODE ||
    'development';
  const win = typeof window !== 'undefined' ? (window as HawkWindow) : undefined;
  const release =
    import.meta.env.VITE_HAWK_RELEASE?.trim() ||
    win?.HAWK_RELEASE ||
    undefined;

  const hawk = new HawkCatcher({
    token,
    release,
    context: {
      service: 'frontend',
      environment,
    },
  });

  // Vue 3 app instance — Hawk sets app.config.errorHandler
  hawk.connectVue(app);

  console.info(`[hawk] enabled for frontend env=${environment}` + (release ? ` release=${release}` : ''));

  if (win) {
    win.__tavridaHawkSmoke = () => {
      hawk.send(new Error('tavrida hawk smoke'));
    };
  }

  return true;
}
