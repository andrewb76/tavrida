<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { useSessionStore } from '@/stores/session';
import { imageProxyPresets, proxiedMediaUrl } from '@/utils/imageProxy';

const props = withDefaults(
  defineProps<{
    avatarUrl?: string | null;
    label: string;
    size?: 'sm' | 'md' | 'lg';
    userId?: string;
  }>(),
  { size: 'md' },
);

const session = useSessionStore();
const failed = ref(false);

const resizePreset = computed(() => {
  if (props.size === 'sm') return imageProxyPresets.avatarSm;
  if (props.size === 'lg') return imageProxyPresets.avatarLg;
  return imageProxyPresets.avatarMd;
});

const displayUrl = computed(() => proxiedMediaUrl(props.avatarUrl, resizePreset.value));

const initial = computed(() => {
  const source = props.label.trim() || '?';
  return source.charAt(0).toUpperCase();
});

const profileTo = computed(() => {
  if (!props.userId) return undefined;
  if (session.userId === props.userId) {
    return { name: 'profile-me' as const };
  }
  return { name: 'profile-user' as const, params: { userId: props.userId } };
});

watch(
  () => props.avatarUrl,
  () => {
    failed.value = false;
  },
);
</script>

<template>
  <RouterLink
    v-if="profileTo"
    :to="profileTo"
    class="user-avatar-link"
    :title="`Профиль: ${label}`"
  >
    <div
      class="user-avatar"
      :class="[
      size === 'sm' ? 'user-avatar--sm' : size === 'lg' ? 'user-avatar--lg' : 'user-avatar--md',
    ]"
    >
      <span
        class="user-avatar__initial"
        aria-hidden="true"
      >{{ initial }}</span>
      <img
        v-if="displayUrl && !failed"
        :src="displayUrl"
        :alt="label"
        class="user-avatar__image"
        referrerpolicy="no-referrer"
        @error="failed = true"
      >
    </div>
  </RouterLink>
  <div
    v-else
    class="user-avatar"
    :class="[
      size === 'sm' ? 'user-avatar--sm' : size === 'lg' ? 'user-avatar--lg' : 'user-avatar--md',
    ]"
    :title="label"
  >
    <span
      class="user-avatar__initial"
      aria-hidden="true"
    >{{ initial }}</span>
    <img
      v-if="displayUrl && !failed"
      :src="displayUrl"
      :alt="label"
      class="user-avatar__image"
      referrerpolicy="no-referrer"
      @error="failed = true"
    >
  </div>
</template>

<style scoped>
.user-avatar-link {
  display: inline-flex;
  flex-shrink: 0;
  border-radius: 9999px;
  text-decoration: none;
  transition: box-shadow 0.15s ease, transform 0.15s ease;
}

.user-avatar-link:hover {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary, #2563eb) 35%, transparent);
}

.user-avatar-link:focus-visible {
  outline: 2px solid var(--color-primary, #2563eb);
  outline-offset: 2px;
}
.user-avatar {
  position: relative;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--color-primary, #2563eb) 15%, transparent);
  color: var(--color-primary, #2563eb);
  font-weight: 600;
}

.user-avatar--sm {
  width: 2rem;
  height: 2rem;
  font-size: 0.75rem;
}

.user-avatar--md {
  width: 2.5rem;
  height: 2.5rem;
  font-size: 0.875rem;
}

.user-avatar--lg {
  width: 4rem;
  height: 4rem;
  font-size: 1.25rem;
}

.user-avatar__initial {
  line-height: 1;
}

.user-avatar__image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
