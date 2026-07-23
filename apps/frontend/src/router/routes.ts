import type { RouteRecordRaw } from 'vue-router';
import MemberLayout from '@/layouts/MemberLayout.vue';
import PublicLayout from '@/layouts/PublicLayout.vue';

declare module 'vue-router' {
  interface RouteMeta {
    title?: string;
    requiresMember?: boolean;
    requiresAdmin?: boolean;
    public?: boolean;
  }
}

const memberChildren: RouteRecordRaw[] = [
  {
    path: 'app',
    name: 'member-home',
    component: () => import('@/views/member/MemberHomeView.vue'),
    meta: { title: 'Home', requiresMember: true },
  },
  {
    path: 'auctions',
    name: 'auctions',
    component: () => import('@/views/member/AuctionListView.vue'),
    meta: { title: 'Аукционы', requiresMember: true },
  },
  {
    path: 'auctions/new',
    name: 'auction-create',
    component: () => import('@/views/member/AuctionCreateView.vue'),
    meta: { title: 'Новый лот', requiresMember: true },
  },
  {
    path: 'auctions/:id',
    name: 'auction-detail',
    component: () => import('@/views/member/AuctionDetailView.vue'),
    meta: { title: 'Лот', requiresMember: true },
  },
  {
    path: 'forum',
    name: 'forum',
    component: () => import('@/views/member/ForumListView.vue'),
    meta: { title: 'Форум', requiresMember: true },
  },
  {
    path: 'forum/categories',
    name: 'forum-categories',
    component: () => import('@/views/member/ForumCategoriesView.vue'),
    meta: { title: 'Разделы форума', requiresMember: true },
  },
  {
    path: 'forum/new',
    name: 'forum-new',
    component: () => import('@/views/member/ForumNewView.vue'),
    meta: { title: 'Новая тема', requiresMember: true },
  },
  {
    path: 'forum/topics/:id',
    name: 'forum-topic',
    component: () => import('@/views/member/ForumTopicView.vue'),
    meta: { title: 'Тема', requiresMember: true },
  },
  {
    path: 'forum/tags/:slug',
    name: 'forum-tag',
    component: () => import('@/views/member/ForumTagView.vue'),
    meta: { title: 'Тег', requiresMember: true },
  },
  {
    path: 'profile/me',
    name: 'profile-me',
    component: () => import('@/views/member/ProfileView.vue'),
    meta: { title: 'Мой профиль', requiresMember: true },
  },
  {
    path: 'profile/:userId',
    name: 'profile-user',
    component: () => import('@/views/member/ProfileView.vue'),
    meta: { title: 'Профиль', requiresMember: true },
  },
  {
    path: 'invites',
    redirect: { name: 'profile-me' },
  },
  {
    path: 'wallet',
    name: 'wallet',
    component: () => import('@/views/member/WalletView.vue'),
    meta: { title: 'Кошелёк', requiresMember: true },
  },
  {
    path: 'subscriptions',
    name: 'subscriptions',
    component: () => import('@/views/member/SubscriptionsView.vue'),
    meta: { title: 'Подписки', requiresMember: true },
  },
  {
    path: 'chats',
    name: 'chats',
    component: () => import('@/views/member/ChatListView.vue'),
    meta: { title: 'Чаты', requiresMember: true },
  },
  {
    path: 'chats/:chatId',
    name: 'chat-room',
    component: () => import('@/views/member/ChatRoomView.vue'),
    meta: { title: 'Чат', requiresMember: true },
  },
  {
    path: 'plans',
    name: 'plans',
    component: () => import('@/views/member/PlansView.vue'),
    meta: { title: 'Тарифы', requiresMember: true },
  },
  {
    path: 'marketplace',
    name: 'marketplace',
    component: () => import('@/views/member/MarketplaceListView.vue'),
    meta: { title: 'Маркет', requiresMember: true },
  },
  {
    path: 'marketplace/my-listings',
    name: 'marketplace-my',
    component: () => import('@/views/member/MarketplaceMyListingsView.vue'),
    meta: { title: 'Мои услуги', requiresMember: true },
  },
  {
    path: 'marketplace/orders',
    name: 'marketplace-orders',
    component: () => import('@/views/member/MarketplaceOrdersView.vue'),
    meta: { title: 'Заказы', requiresMember: true },
  },
  {
    path: 'marketplace/:id',
    name: 'marketplace-detail',
    component: () => import('@/views/member/MarketplaceDetailView.vue'),
    meta: { title: 'Услуга', requiresMember: true },
  },
  {
    path: 'admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { title: 'Админ', requiresMember: true, requiresAdmin: true },
    children: [
      { path: '', redirect: { name: 'admin-users' } },
      {
        path: 'users',
        name: 'admin-users',
        component: () => import('@/views/admin/AdminUsersView.vue'),
        meta: { title: 'Пользователи', requiresMember: true, requiresAdmin: true },
      },
      {
        path: 'scalar-config',
        name: 'admin-scalar-config',
        component: () => import('@/views/admin/AdminScalarConfigView.vue'),
        meta: { title: 'Конфиг', requiresMember: true, requiresAdmin: true },
      },
      {
        path: 'plan-config',
        name: 'admin-plan-config',
        component: () => import('@/views/admin/AdminPlanConfigView.vue'),
        meta: { title: 'Тарифы', requiresMember: true, requiresAdmin: true },
      },
      {
        path: 'vanga',
        name: 'admin-vanga',
        component: () => import('@/views/admin/AdminVangaView.vue'),
        meta: { title: 'Ванга', requiresMember: true, requiresAdmin: true },
      },
      {
        path: 'periods',
        name: 'admin-periods',
        component: () => import('@/views/admin/AdminPeriodsView.vue'),
        meta: { title: 'Периоды', requiresMember: true, requiresAdmin: true },
      },
      {
        path: 'roles',
        name: 'admin-roles',
        component: () => import('@/views/admin/AdminRolesView.vue'),
        meta: { title: 'Роли', requiresMember: true, requiresAdmin: true },
      },
    ],
  },
];

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: PublicLayout,
    meta: { public: true },
    children: [
      {
        path: '',
        name: 'landing',
        component: () => import('@/views/public/LandingView.vue'),
        meta: { title: 'Таврида Лот', public: true },
      },
      {
        path: 'about',
        name: 'about',
        component: () => import('@/views/public/AboutView.vue'),
        meta: { title: 'О клубе', public: true },
      },
      {
        path: 'cookies',
        name: 'cookies',
        component: () => import('@/views/public/CookiePolicyView.vue'),
        meta: { title: 'Политика cookie', public: true },
      },
      {
        path: 'join',
        name: 'join',
        component: () => import('@/views/public/JoinView.vue'),
        meta: { title: 'Приглашение', public: true },
      },
      {
        path: 'invite',
        name: 'invite',
        component: () => import('@/views/public/InviteView.vue'),
        meta: { title: 'Инвайт', public: true },
      },
      {
        path: 'callback',
        name: 'callback',
        component: () => import('@/views/public/CallbackView.vue'),
        meta: { title: 'Auth', public: true },
      },
      {
        path: 'auth/unknown-session',
        name: 'auth-unknown-session',
        component: () => import('@/views/public/UnknownSessionView.vue'),
        meta: { title: 'Сессия входа', public: true },
      },
    ],
  },
  {
    path: '/',
    component: MemberLayout,
    children: memberChildren,
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: '404' },
  },
];
