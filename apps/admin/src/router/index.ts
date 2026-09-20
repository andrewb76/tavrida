import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('@/layouts/AdminLayout.vue'),
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/pages/DashboardPage.vue'),
        },
        {
          path: 'parameters',
          name: 'parameters',
          component: () => import('@/pages/ParametersPage.vue'),
        },
        {
          path: 'plans',
          name: 'plans',
          component: () => import('@/pages/PlansPage.vue'),
        },
        {
          path: 'plans/:id',
          name: 'plan-detail',
          component: () => import('@/pages/PlanDetailPage.vue'),
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('@/pages/UsersPage.vue'),
        },
        {
          path: 'users/:userId',
          name: 'user-detail',
          component: () => import('@/pages/UserDetailPage.vue'),
        },
        {
          path: 'limits',
          name: 'limits',
          component: () => import('@/pages/LimitsPage.vue'),
        },
        {
          path: 'logs',
          name: 'logs',
          component: () => import('@/pages/UsageLogPage.vue'),
        },
        {
          path: 'yaml',
          name: 'yaml',
          component: () => import('@/pages/YamlPage.vue'),
        },
      ],
    },
  ],
});

export default router;
