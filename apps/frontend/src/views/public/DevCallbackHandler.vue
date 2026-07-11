<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { consumePostAuthRedirect } from '@/services/authRedirect';
import { claimInviteAttribution, consumePendingInviterId, consumePendingInviteCodeId } from '@/services/invite';
import { useSessionStore } from '@/stores/session';

const router = useRouter();
const route = useRoute();
const session = useSessionStore();

onMounted(async () => {
  const inviterId = consumePendingInviterId();
  const inviteCodeId = consumePendingInviteCodeId();
  if (inviterId || inviteCodeId) {
    await claimInviteAttribution({
      inviterId: inviterId ?? undefined,
      inviteCodeId: inviteCodeId ?? undefined,
    });
  }

  session.signInDev();

  const redirect =
    consumePostAuthRedirect() ??
    (typeof route.query.redirect === 'string' ? route.query.redirect : undefined);

  await router.replace(redirect ?? { name: 'member-home' });
});
</script>

<template>
  <div class="flex min-h-dvh items-center justify-center px-4">
    <p class="text-center text-text-muted">
      Dev callback — перенаправление…
    </p>
  </div>
</template>
