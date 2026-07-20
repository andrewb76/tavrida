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

  if (to.meta.requiresAdmin) {
    await refreshPlatformRoles();
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
