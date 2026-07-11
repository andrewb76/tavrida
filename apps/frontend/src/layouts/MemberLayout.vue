<script setup lang="ts">
import { UiButton } from '@tavrida/ui';
import { computed, onMounted } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';
import { useAuth } from '@/composables/useAuth';
import { refreshPlatformRoles } from '@/services/roles';
import { useSessionStore } from '@/stores/session';
import { useThemeStore } from '@/stores/theme';

const route = useRoute();
const session = useSessionStore();
const auth = useAuth();
const theme = useThemeStore();

const navItems = computed(() => {
  const items = [
    { to: '/app', label: 'Home', icon: '🏠' },
    { to: '/auctions', label: 'Аукционы', icon: '🔨' },
    { to: '/forum', label: 'Форум', icon: '🗣️' },
    { to: '/profile/me', label: 'Профиль', icon: '👤' },
  ];
  if (session.isAdmin) {
    items.push({ to: '/admin/scalar-config', label: 'Админ', icon: '🛡️' });
  }
  return items;
});

onMounted(() => {
  if (session.isMember) {
    void refreshPlatformRoles();
  }
});

function isActive(path: string) {
  if (path === '/app') return route.path === '/app';
  return route.path.startsWith(path);
}
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-bg">
    <header class="sticky top-0 z-40 border-b border-border bg-surface">
      <div class="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
        <RouterLink to="/app" class="truncate text-lg font-semibold text-primary">
          Tavrida Lot
        </RouterLink>
        <div class="flex items-center gap-1 sm:gap-2">
          <RouterLink
            v-if="session.isAdmin"
            to="/admin/scalar-config"
            class="rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
            :class="route.path.startsWith('/admin') ? 'bg-primary/10' : ''"
          >
            Админ
          </RouterLink>
          <span
            class="hidden max-w-[8rem] truncate rounded-full bg-bg px-2 py-1 text-xs text-text-muted sm:inline"
            :title="session.displayName"
          >
            {{ session.displayName }}
          </span>
          <span
            class="hidden rounded-full bg-bg px-2 py-1 text-xs text-text-muted sm:inline"
            title="Mock balance"
          >
            {{ session.balance }} ₽
          </span>
          <UiButton intent="ghost" size="sm" title="Inbox (W15 stub)" @click="() => {}">
            🔔
          </UiButton>
          <UiButton intent="ghost" size="sm" @click="theme.toggle()">
            {{ theme.mode === 'light' ? '🌙' : '☀️' }}
          </UiButton>
          <UiButton intent="ghost" size="sm" title="Выйти" @click="auth.signOut()">
            ⎋
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
        <li v-for="item in navItems" :key="item.to" class="flex-1">
          <RouterLink
            :to="item.to"
            class="flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs transition-colors"
            :class="
              isActive(item.to)
                ? 'text-primary font-medium'
                : 'text-text-muted hover:text-text'
            "
          >
            <span class="text-lg" aria-hidden="true">{{ item.icon }}</span>
            {{ item.label }}
          </RouterLink>
        </li>
      </ul>
    </nav>
  </div>
</template>
