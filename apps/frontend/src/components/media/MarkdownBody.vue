<script setup lang="ts">
import { computed } from 'vue';
import { renderForumMarkdown } from '@/utils/renderForumMarkdown';

const props = defineProps<{
  body: string;
}>();

const html = computed(() => renderForumMarkdown(props.body));
</script>

<template>
  <!-- HTML from renderForumMarkdown (sanitized). -->
  <!-- eslint-disable vue/no-v-html -->
  <div
    v-if="html"
    class="markdown-body prose prose-sm max-w-none"
    v-html="html"
  />
  <!-- eslint-enable vue/no-v-html -->
</template>

<style scoped>
.markdown-body :deep(p) {
  margin: 0.5rem 0;
}

.markdown-body :deep(p:first-child) {
  margin-top: 0;
}

.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(a) {
  color: var(--color-primary, #2563eb);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.markdown-body :deep(blockquote) {
  border-left: 3px solid color-mix(in srgb, var(--color-primary, #2563eb) 35%, transparent);
  padding-left: 0.75rem;
  color: var(--color-text-muted, #666);
}

.markdown-body :deep(code) {
  border-radius: 0.25rem;
  background: color-mix(in srgb, var(--color-text, #111) 6%, transparent);
  padding: 0.1rem 0.3rem;
  font-size: 0.875em;
}

.markdown-body :deep(pre) {
  overflow-x: auto;
  border-radius: 0.5rem;
  border: 1px solid var(--color-border, #ddd);
  background: var(--color-bg, #f8fafc);
  padding: 0.75rem;
}

.markdown-body :deep(pre code) {
  background: transparent;
  padding: 0;
}

.markdown-body :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
}

.markdown-body :deep(table) {
  display: block;
  overflow-x: auto;
  width: 100%;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid var(--color-border, #ddd);
  padding: 0.35rem 0.5rem;
}
</style>
