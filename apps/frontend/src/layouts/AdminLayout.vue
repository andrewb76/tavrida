<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from 'vue-router';

const route = useRoute();

const tabs = [
  { name: 'admin-users', to: '/admin/users', label: 'Пользователи' },
  { name: 'admin-scalar-config', to: '/admin/scalar-config', label: 'Конфиг' },
  { name: 'admin-plan-config', to: '/admin/plan-config', label: 'Тарифы' },
  { name: 'admin-oracle', to: '/admin/oracle', label: 'Oracle' },
  { name: 'admin-roles', to: '/admin/roles', label: 'Мои роли' },
];

function isActive(name: string) {
  return route.name === name;
}
</script>

<template>
  <div class="space-y-6">
    <header>
      <h1 class="text-2xl font-semibold">
        Администрирование
      </h1>
      <p class="mt-1 text-sm text-text-muted">
        Пользователи, роли, баланс и платформенные настройки.
      </p>
    </header>

    <nav
      class="flex flex-wrap gap-2 border-b border-border pb-3"
      aria-label="Разделы админки"
    >
      <RouterLink
        v-for="tab in tabs"
        :key="tab.name"
        :to="tab.to"
        class="rounded-md px-3 py-1.5 text-sm transition-colors"
        :class="
          isActive(tab.name)
            ? 'bg-primary/10 font-medium text-primary'
            : 'text-text-muted hover:bg-bg hover:text-text'
        "
      >
        {{ tab.label }}
      </RouterLink>
    </nav>

    <RouterView />
  </div>
</template>
