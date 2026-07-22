<script setup lang="ts">
import { UiButton, UiIcon } from '@tavrida/ui';
import { computed, onMounted, watch } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';
import ImpersonationBanner from '@/components/admin/ImpersonationBanner.vue';
import BrandLogo from '@/components/brand/BrandLogo.vue';
import { useAuth } from '@/composables/useAuth';
import { refreshSessionBalance } from '@/composables/useWalletBalance';
import { refreshPlatformRoles } from '@/services/roles';
import { formatMoney } from '@/services/wallet';
import { useChatsStore } from '@/stores/chats';
import { useSessionStore } from '@/stores/session';
import { useThemeStore } from '@/stores/theme';

const route = useRoute();
const session = useSessionStore();
const chatsStore = useChatsStore();
const auth = useAuth();
const theme = useThemeStore();

const unreadBadge = computed(() => {
  const { chatsWithUnread, totalUnreadMessages } = chatsStore.unread;
  if (chatsWithUnread <= 0 && totalUnreadMessages <= 0) return null;
  return `${chatsWithUnread}/${totalUnreadMessages}`;
});

const navItems = computed(() => {
  const items: Array<{ to: string; label: string; icon: string }> = [
    { to: '/app', label: 'Главная', icon: 'home' },
    { to: '/auctions', label: 'Аукционы', icon: 'auctions' },
    { to: '/forum', label: 'Форум', icon: 'forum' },
    { to: '/chats', label: 'Чаты', icon: 'chat' },
    { to: '/profile/me', label: 'Профиль', icon: 'profile' },
  ];
  if (session.isAdmin && !session.isImpersonating) {
    items.push({ to: '/admin/users', label: 'Админ', icon: 'admin' });
  }
  return items;
});

onMounted(() => {
  if (session.isMember) {
    void refreshPlatformRoles();
    void refreshSessionBalance();
    void chatsStore.refreshUnread();
  }
});

watch(
  () => session.isMember,
  (member) => {
    if (member) {
      void refreshSessionBalance();
      void chatsStore.refreshUnread();
    }
  },
);

function isActive(path: string) {
  if (path === '/app') return route.path === '/app';
  return route.path.startsWith(path);
}
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <ImpersonationBanner />
    <header
      class="sticky z-40 border-b border-border bg-surface"
      :class="session.isImpersonating ? 'top-7' : 'top-0'"
    >
      <div class="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
        <RouterLink
          to="/app"
          class="inline-flex min-w-0 shrink"
        >
          <BrandLogo
            variant="header"
            :theme="theme.mode === 'dark' ? 'dark' : 'light'"
          />
        </RouterLink>
        <div class="flex items-center gap-1 sm:gap-2">
          <RouterLink
            v-if="session.isAdmin && !session.isImpersonating"
            to="/admin/users"
            class="rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
            :class="route.path.startsWith('/admin') ? 'bg-primary/10' : ''"
          >
            Админ
          </RouterLink>
          <span
            class="hidden max-w-[8rem] truncate rounded-full bg-bg px-2 py-1 text-xs text-text-muted sm:inline"
            :title="session.isImpersonating ? session.actAsDisplayName : session.displayName"
          >
            {{ session.isImpersonating ? session.actAsDisplayName : session.displayName }}
          </span>
          <RouterLink
            v-if="session.isMember"
            to="/wallet"
            class="hidden items-center gap-1 rounded-full bg-bg px-2 py-1 text-xs tabular-nums text-text-muted hover:text-text sm:inline-flex"
            title="Кошелёк"
          >
            <UiIcon
              name="wallet"
              :size="14"
            />
            {{ formatMoney(session.balance, session.balanceCurrency) }}
          </RouterLink>
          <RouterLink
            v-if="session.isMember"
            to="/chats"
            class="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-text hover:bg-bg"
            :title="unreadBadge ? `Чаты · ${unreadBadge}` : 'Чаты'"
            :class="route.path.startsWith('/chats') ? 'bg-primary/10 text-primary' : ''"
          >
            <UiIcon
              name="chat"
              :size="18"
              label="Чаты"
            />
            <span
              v-if="unreadBadge"
              class="absolute -right-0.5 -top-0.5 max-w-[3.5rem] truncate rounded-full bg-primary px-1 text-[9px] font-semibold leading-4 text-primary-fg tabular-nums"
            >
              {{ unreadBadge }}
            </span>
          </RouterLink>
          <RouterLink
            v-if="session.isMember"
            to="/subscriptions"
            class="inline-flex h-9 w-9 items-center justify-center rounded-md text-text hover:bg-bg"
            title="Подписки"
            :class="route.path.startsWith('/subscriptions') ? 'bg-primary/10 text-primary' : ''"
          >
            <UiIcon
              name="notifications"
              :size="18"
              label="Подписки"
            />
          </RouterLink>
          <UiButton
            intent="ghost"
            size="sm"
            :title="theme.mode === 'light' ? 'Тёмная тема' : 'Светлая тема'"
            @click="theme.toggle()"
          >
            <UiIcon
              :name="theme.mode === 'light' ? 'moon' : 'sun'"
              :size="18"
              :label="theme.mode === 'light' ? 'Тёмная тема' : 'Светлая тема'"
            />
          </UiButton>
          <UiButton
            intent="ghost"
            size="sm"
            title="Выйти"
            @click="auth.signOut()"
          >
            <UiIcon
              name="logout"
              :size="18"
              label="Выйти"
            />
          </UiButton>
        </div>
      </div>
    </header>

    <main class="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24">
      <RouterView />
    </main>

    <nav
      class="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]"
      aria-label="Основная навигация"
    >
      <ul class="mx-auto flex max-w-5xl">
        <li
          v-for="item in navItems"
          :key="item.to"
          class="flex-1"
        >
          <RouterLink
            :to="item.to"
            class="flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs transition-colors"
            :class="
              isActive(item.to)
                ? 'text-primary font-medium'
                : 'text-text-muted hover:text-text'
            "
          >
            <span class="relative inline-flex">
              <UiIcon
                :name="item.icon"
                :size="22"
              />
              <span
                v-if="item.to === '/chats' && unreadBadge"
                class="absolute -right-2 -top-1 max-w-[2.75rem] truncate rounded-full bg-primary px-1 text-[8px] font-semibold leading-3 text-primary-fg tabular-nums"
              >
                {{ unreadBadge }}
              </span>
            </span>
            {{ item.label }}
          </RouterLink>
        </li>
      </ul>
    </nav>
  </div>
</template>
