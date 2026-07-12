<script setup lang="ts">
import { formatFileSize, isImageAttachment, type MediaAttachment } from '@/services/media';

defineProps<{
  attachments: MediaAttachment[];
}>();
</script>

<template>
  <ul class="attachment-list">
    <li
      v-for="(file, idx) in attachments"
      :key="`${file.url}-${idx}`"
      class="attachment-list__item"
    >
      <a
        :href="file.url"
        target="_blank"
        rel="noopener noreferrer"
        class="attachment-list__link"
      >
        <img
          v-if="isImageAttachment(file)"
          :src="file.url"
          :alt="file.filename"
          class="attachment-list__thumb"
        >
        <span class="attachment-list__meta">
          <span>{{ file.filename }}</span>
          <small>{{ formatFileSize(file.sizeBytes) }}</small>
        </span>
      </a>
    </li>
  </ul>
</template>

<style scoped>
.attachment-list {
  list-style: none;
  margin: 0.5rem 0 0;
  padding: 0;
  display: grid;
  gap: 0.5rem;
}

.attachment-list__item {
  border: 1px solid var(--color-border, #ddd);
  border-radius: 8px;
  overflow: hidden;
}

.attachment-list__link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  color: inherit;
  text-decoration: none;
}

.attachment-list__thumb {
  width: 3rem;
  height: 3rem;
  object-fit: cover;
  border-radius: 4px;
}

.attachment-list__meta {
  display: grid;
  gap: 0.15rem;
}

.attachment-list__meta small {
  color: var(--color-text-muted, #666);
}
</style>
