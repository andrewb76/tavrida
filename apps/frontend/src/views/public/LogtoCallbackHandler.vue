<script setup lang="ts">
import { useHandleSignInCallback } from '@logto/vue';
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { consumePostAuthRedirect } from '@/services/authRedirect';
import { claimInviteAttribution, consumePendingInviterId } from '@/services/invite';
import { useSessionStore } from '@/stores/session';

const router = useRouter();
const route = useRoute();
const session = useSessionStore();
const localError = ref<string | null>(null);

async function afterSignIn() {
  localError.value = null;

  const inviterId = consumePendingInviterId();
  if (inviterId) {
    try {
      await claimInviteAttribution(inviterId, session.userId);
    } catch {
      /* referral attribution is best-effort until BFF */
    }
  }

  const redirect =
    consumePostAuthRedirect() ??
    (typeof route.query.redirect === 'string' ? route.query.redirect : undefined);

  await router.replace(redirect ?? { name: 'member-home' });
}

const { isLoading, error } = useHandleSignInCallback(afterSignIn);
</script>

<template>
  <div class="flex min-h-dvh items-center justify-center px-4">
    <p v-if="localError || error" class="text-center text-error">
      {{ localError ?? error?.message }}
    </p>
    <p v-else class="text-center text-text-muted">
      {{ isLoading ? 'Вход через Logto…' : 'Перенаправление…' }}
    </p>
  </div>
</template>
