import { useSessionStore } from '@/stores/session';
import { refreshPlatformRoles } from '@/services/roles';
import { BRAND_NAME } from '@/config/brand';
import { createRouter, createWebHistory } from 'vue-router';
import { routes } from './routes';

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

router.beforeEach(async (to) => {
  const session = useSessionStore();

  if (to.name === 'callback') {
    return true;
  }

  if (to.meta.requiresMember && !session.isMember) {
    return {
      name: 'landing',
      query: { redirect: to.fullPath },
    };
  }

  // Resolve hard-lock once per session before club UI / trap page.
  if (session.isMember && !session.hardLockResolved) {
    await refreshPlatformRoles();
  }

  if (session.isHardLocked) {
    if (to.meta.allowsHardLocked) return true;
    return { name: 'account-locked' };
  }

  if (to.name === 'account-locked') {
    return { name: 'member-home' };
  }

  if (to.meta.requiresAdmin) {
    await refreshPlatformRoles();
    if (session.isHardLocked) {
      return { name: 'account-locked' };
    }
    if (!session.isAdmin) {
      return { name: 'member-home' };
    }
  }

  if (to.name === 'landing' && session.isMember) {
    return { name: 'member-home' };
  }

  return true;
});

router.afterEach((to) => {
  const title = typeof to.meta.title === 'string' ? to.meta.title : BRAND_NAME;
  document.title = title === BRAND_NAME ? BRAND_NAME : `${title} · ${BRAND_NAME}`;
});

/** Stale tab after deploy: old chunk hashes 404 — reload once to pick new index.html. */
router.onError((error, to) => {
  const message = error instanceof Error ? error.message : String(error);
  const isChunkLoadError =
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('error loading dynamically imported module');

  if (!isChunkLoadError || typeof window === 'undefined') return;

  const key = `chunk-reload:${to.fullPath}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, '1');
  window.location.assign(to.fullPath);
});
