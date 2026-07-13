<script setup lang="ts">
import { computed } from 'vue';
import { formatFileSize, isImageAttachment, type MediaAttachment } from '@/services/media';
import { imageProxyPresets, proxiedMediaUrl } from '@/utils/imageProxy';

const props = withDefaults(
  defineProps<{
    attachments: MediaAttachment[];
    variant?: 'compact' | 'forum';
  }>(),
  { variant: 'compact' },
);

const imageAttachments = computed(() => props.attachments.filter(isImageAttachment));
const fileAttachments = computed(() => props.attachments.filter((file) => !isImageAttachment(file)));

function thumbSrc(file: MediaAttachment): string {
  const preset =
    props.variant === 'forum'
      ? imageProxyPresets.forumAttachmentThumb
      : imageProxyPresets.attachmentThumb;
  return proxiedMediaUrl(file.url, preset) ?? file.url;
}

function inlineSrc(file: MediaAttachment): string {
  return proxiedMediaUrl(file.url, imageProxyPresets.forumAttachmentInline) ?? file.url;
}
</script>

<template>
  <div
    v-if="attachments.length"
    class="attachment-list"
    :class="{ 'attachment-list--forum': variant === 'forum' }"
  >
    <div
      v-if="variant === 'forum' && imageAttachments.length"
      class="attachment-list__gallery"
    >
      <a
        v-for="(file, idx) in imageAttachments"
        :key="`${file.url}-${idx}`"
        :href="file.url"
        target="_blank"
        rel="noopener noreferrer"
        class="attachment-list__gallery-link"
        :title="file.filename"
      >
        <img
          :src="inlineSrc(file)"
          :alt="file.filename"
          class="attachment-list__gallery-img"
          loading="lazy"
          decoding="async"
        >
      </a>
    </div>

    <ul
      v-if="variant === 'compact' ? attachments.length : fileAttachments.length"
      class="attachment-list__files"
    >
      <li
        v-for="(file, idx) in variant === 'compact' ? attachments : fileAttachments"
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
            v-if="variant === 'compact' && isImageAttachment(file)"
            :src="thumbSrc(file)"
            :alt="file.filename"
            class="attachment-list__thumb"
          >
          <span
            v-else
            class="attachment-list__file-icon"
            aria-hidden="true"
          >📄</span>
          <span class="attachment-list__meta">
            <span>{{ file.filename }}</span>
            <small>{{ formatFileSize(file.sizeBytes) }}</small>
          </span>
        </a>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.attachment-list {
  display: grid;
  gap: 0.75rem;
}

.attachment-list__gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
  gap: 0.5rem;
}

.attachment-list__gallery-link {
  display: block;
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid var(--color-border, #ddd);
  background: var(--color-bg, #f8fafc);
}

.attachment-list__gallery-img {
  display: block;
  width: 100%;
  max-height: 16rem;
  object-fit: cover;
}

.attachment-list__files {
  list-style: none;
  margin: 0;
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

.attachment-list__file-icon {
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  border-radius: 4px;
  background: var(--color-bg, #f8fafc);
  font-size: 1.25rem;
}

.attachment-list__meta {
  display: grid;
  gap: 0.15rem;
}

.attachment-list__meta small {
  color: var(--color-text-muted, #666);
}
</style>
