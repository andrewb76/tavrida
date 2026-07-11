import { useSessionStore } from '@/stores/session';
import { refreshPlatformRoles } from '@/services/roles';
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
  const title = typeof to.meta.title === 'string' ? to.meta.title : 'Tavrida Lot';
  document.title = `${title} · Tavrida Lot`;
});
