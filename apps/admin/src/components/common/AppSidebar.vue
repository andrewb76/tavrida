<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router';
import { computed } from 'vue';

const route = useRoute();

const navItems = [
  { path: '/', label: 'Обзор', icon: '📊' },
  { path: '/parameters', label: 'Параметры', icon: '🔧' },
  { path: '/plans', label: 'Тарифы', icon: '💳' },
  { path: '/users', label: 'Пользователи', icon: '👥' },
  { path: '/limits', label: 'Лимиты', icon: '📋' },
  { path: '/logs', label: 'Лог', icon: '📜' },
  { path: '/yaml', label: 'YAML', icon: '📦' },
];

const isActive = (path: string) => {
  if (path === '/') return route.path === '/';
  return route.path.startsWith(path);
};
</script>

<template>
  <aside class="w-64 bg-gray-900 text-gray-100 flex flex-col">
    <div class="p-4 border-b border-gray-700">
      <h1 class="text-lg font-semibold">⚙ Админ-панель</h1>
      <p class="text-xs text-gray-400 mt-1">Настройки и тарифы</p>
    </div>
    <nav class="flex-1 p-2">
      <RouterLink
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
        :class="isActive(item.path) ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'"
      >
        <span>{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>
  </aside>
</template>
