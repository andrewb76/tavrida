<script setup lang="ts">
import { onMounted } from 'vue';
import { refreshPlatformRoles } from '@/services/roles';
import { useSessionStore } from '@/stores/session';

const session = useSessionStore();

onMounted(() => {
  void refreshPlatformRoles();
});

const roleLabels: Record<string, string> = {
  member: 'Участник',
  admin: 'Администратор',
  moderator: 'Модератор',
  expert: 'Эксперт',
};
</script>

<template>
  <section class="space-y-4">
    <div>
      <h2 class="text-lg font-semibold">Мои роли</h2>
      <p class="text-sm text-text-muted">Источник: Keto (platform:tavrida-lot).</p>
    </div>

    <ul class="flex flex-wrap gap-2">
      <li
        v-for="role in session.platformRoles"
        :key="role"
        class="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
      >
        {{ roleLabels[role] ?? role }}
      </li>
    </ul>
    <p v-if="session.rolesLoading" class="text-xs text-text-muted">Обновление…</p>

    <p class="text-sm text-text-muted">
      Bootstrap первого admin:
      <code class="rounded bg-bg px-1 py-0.5 text-xs">pnpm grant:admin &lt;logto_sub&gt;</code>
    </p>
  </section>
</template>
