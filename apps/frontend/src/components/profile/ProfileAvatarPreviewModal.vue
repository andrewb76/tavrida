<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';

const props = defineProps<{
  avatarUrl: string;
  label: string;
}>();

const open = defineModel<boolean>('open', { required: true });

const failed = ref(false);

const initial = computed(() => {
  const source = props.label.trim() || '?';
  return source.charAt(0).toUpperCase();
});

function close() {
  open.value = false;
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    close();
  }
}

watch(open, (isOpen) => {
  if (typeof document === 'undefined') return;

  if (isOpen) {
    document.addEventListener('keydown', onKeydown);
    document.body.style.overflow = 'hidden';
  } else {
    document.removeEventListener('keydown', onKeydown);
    document.body.style.overflow = '';
  }
});

watch(
  () => props.avatarUrl,
  () => {
    failed.value = false;
  },
);

onUnmounted(() => {
  if (typeof document === 'undefined') return;
  document.removeEventListener('keydown', onKeydown);
  document.body.style.overflow = '';
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open && avatarUrl"
      class="profile-avatar-preview-overlay"
      role="dialog"
      aria-modal="true"
      :aria-label="`Аватар ${label}`"
    >
      <button
        type="button"
        class="profile-avatar-preview-overlay__backdrop"
        aria-label="Закрыть"
        @click="close"
      />

      <div
        class="profile-avatar-preview-overlay__panel"
        @click.stop
      >
        <button
          type="button"
          class="profile-avatar-preview-overlay__close"
          aria-label="Закрыть"
          @click="close"
        >
          ✕
        </button>

        <p class="profile-avatar-preview-overlay__title">
          {{ label }}
        </p>

        <div class="profile-avatar-preview">
          <div class="profile-avatar-preview__frame">
            <span
              class="profile-avatar-preview__initial"
              aria-hidden="true"
            >{{ initial }}</span>
            <img
              v-if="!failed"
              :src="avatarUrl"
              :alt="label"
              class="profile-avatar-preview__image"
              referrerpolicy="no-referrer"
              @error="failed = true"
            >
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.profile-avatar-preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.profile-avatar-preview-overlay__backdrop {
  position: absolute;
  inset: 0;
  border: none;
  background: rgb(0 0 0 / 50%);
  cursor: pointer;
}

.profile-avatar-preview-overlay__panel {
  position: relative;
  z-index: 1;
  width: min(100%, 24rem);
  border-radius: 0.5rem;
  border: 1px solid var(--color-border, #ddd);
  background: var(--color-surface, #fff);
  padding: 1.5rem;
  box-shadow: 0 10px 40px rgb(0 0 0 / 20%);
}

.profile-avatar-preview-overlay__close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  color: var(--color-text-muted, #666);
  padding: 0.25rem 0.5rem;
  cursor: pointer;
}

.profile-avatar-preview-overlay__close:hover {
  background: var(--color-bg, #f5f5f5);
  color: var(--color-text, #111);
}

.profile-avatar-preview-overlay__title {
  margin: 0 2rem 1rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text, #111);
}

.profile-avatar-preview {
  display: flex;
  justify-content: center;
}

.profile-avatar-preview__frame {
  position: relative;
  display: flex;
  width: min(16rem, 100%);
  aspect-ratio: 1;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--color-primary, #2563eb) 15%, transparent);
  color: var(--color-primary, #2563eb);
  font-size: 4rem;
  font-weight: 600;
}

.profile-avatar-preview__initial {
  line-height: 1;
}

.profile-avatar-preview__image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
