<script setup lang="ts">
import type { UploadItem } from '@/composables/useMediaUpload';
import { formatFileSize } from '@/services/media';

defineProps<{
  items: UploadItem[];
  accept: string;
  canAddMore: boolean;
  hint?: string;
}>();

const emit = defineEmits<{
  select: [FileList];
  remove: [string];
}>();

function onSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files?.length) emit('select', input.files);
  input.value = '';
}
</script>

<template>
  <div class="media-uploader">
    <p
      v-if="hint"
      class="media-uploader__hint"
    >
      {{ hint }}
    </p>

    <div class="media-uploader__grid">
      <label
        v-if="canAddMore"
        class="media-uploader__add"
      >
        <span>+ Добавить</span>
        <input
          type="file"
          :accept="accept"
          multiple
          hidden
          @change="onSelect"
        >
      </label>

      <div
        v-for="item in items"
        :key="item.id"
        class="media-uploader__item"
      >
        <img
          v-if="item.previewUrl"
          :src="item.previewUrl"
          alt=""
          class="media-uploader__preview"
        >
        <div
          v-else
          class="media-uploader__file"
        >
          <span>{{ item.file.name }}</span>
          <small>{{ formatFileSize(item.file.size) }}</small>
        </div>

        <p
          v-if="item.status === 'uploading'"
          class="media-uploader__status"
        >
          Загрузка…
        </p>
        <p
          v-else-if="item.status === 'error'"
          class="media-uploader__error"
        >
          {{ item.error }}
        </p>

        <button
          type="button"
          class="media-uploader__remove"
          @click="emit('remove', item.id)"
        >
          ×
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.media-uploader {
  display: grid;
  gap: 0.5rem;
}

.media-uploader__hint {
  margin: 0;
  color: var(--color-text-muted, #666);
  font-size: 0.9rem;
}

.media-uploader__grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.media-uploader__add,
.media-uploader__item {
  width: 7rem;
  height: 7rem;
  border: 1px dashed var(--color-border, #ccc);
  border-radius: 8px;
  position: relative;
  overflow: hidden;
}

.media-uploader__add {
  display: grid;
  place-items: center;
  cursor: pointer;
  color: var(--color-text-muted, #666);
}

.media-uploader__preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-uploader__file {
  display: grid;
  place-content: center;
  gap: 0.25rem;
  padding: 0.5rem;
  text-align: center;
  font-size: 0.75rem;
  height: 100%;
}

.media-uploader__status,
.media-uploader__error {
  position: absolute;
  inset: auto 0 0;
  margin: 0;
  padding: 0.2rem 0.35rem;
  font-size: 0.7rem;
  background: rgba(255, 255, 255, 0.9);
}

.media-uploader__error {
  color: #b42318;
}

.media-uploader__remove {
  position: absolute;
  top: 0.2rem;
  right: 0.2rem;
  border: none;
  border-radius: 999px;
  width: 1.4rem;
  height: 1.4rem;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
}
</style>
