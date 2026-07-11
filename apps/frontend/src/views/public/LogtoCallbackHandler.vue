<script setup lang="ts">
import { useHandleSignInCallback } from '@logto/vue';
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { consumePostAuthRedirect } from '@/services/authRedirect';
import { claimInviteAttribution, consumePendingInviterId, consumePendingInviteCodeId } from '@/services/invite';
import { formatAuthError } from '@/services/authError';
import { useSessionStore } from '@/stores/session';

const router = useRouter();
const route = useRoute();
const session = useSessionStore();
const localError = ref<string | null>(null);

async function afterSignIn() {
  localError.value = null;

  const inviterId = consumePendingInviterId();
  const inviteCodeId = consumePendingInviteCodeId();
  if (inviterId || inviteCodeId) {
    try {
      await claimInviteAttribution({
        inviterId: inviterId ?? undefined,
        inviteCodeId: inviteCodeId ?? undefined,
        userId: session.userId,
      });
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

const errorMessage = computed(() => {
  if (localError.value) return localError.value;
  if (error.value) return formatAuthError(error.value);
  return null;
});
</script>

<template>
  <div class="flex min-h-dvh items-center justify-center px-4">
    <p
      v-if="errorMessage"
      class="text-center text-error"
    >
      {{ errorMessage }}
    </p>
    <p
      v-else
      class="text-center text-text-muted"
    >
      {{ isLoading ? 'Вход через Logto…' : 'Перенаправление…' }}
    </p>
  </div>
</template>
