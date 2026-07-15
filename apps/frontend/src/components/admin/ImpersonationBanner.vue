<script setup lang="ts">
import { refreshSessionBalance } from '@/composables/useWalletBalance';
import { refreshPlatformRoles } from '@/services/roles';
import { useSessionStore } from '@/stores/session';
import { useRouter } from 'vue-router';

const session = useSessionStore();
const router = useRouter();

async function exit() {
  session.stopImpersonation();
  await refreshPlatformRoles();
  await refreshSessionBalance();
  if (router.currentRoute.value.path.startsWith('/admin')) {
    await router.push('/app');
  }
}
</script>

<template>
  <div
    v-if="session.isImpersonating"
    class="impersonation-banner"
    role="status"
  >
    <p class="impersonation-banner__text">
      <span class="impersonation-banner__label">Режим</span>
      {{ session.actorDisplayName || 'Админ' }}
      →
      <strong>{{ session.actAsDisplayName || session.actAsUserId }}</strong>
    </p>
    <button
      type="button"
      class="impersonation-banner__exit"
      @click="exit"
    >
      Выйти
    </button>
  </div>
</template>

<style scoped>
.impersonation-banner {
  position: sticky;
  top: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  min-height: 1.75rem;
  padding: 0.25rem 0.75rem;
  background: #f59e0b;
  color: #1c1917;
  font-size: 0.75rem;
  line-height: 1.2;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.12);
}

.impersonation-banner__text {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.impersonation-banner__label {
  margin-right: 0.35rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.impersonation-banner__exit {
  flex-shrink: 0;
  border: 1px solid #1c1917;
  border-radius: 0.25rem;
  background: #1c1917;
  color: #fbbf24;
  padding: 0.1rem 0.5rem;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
}

.impersonation-banner__exit:hover {
  background: #292524;
}
</style>
