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
/* Tailwind Typography defaults to light-gray body text; bind to theme tokens. */
.markdown-body {
  --tw-prose-body: var(--color-text);
  --tw-prose-headings: var(--color-text);
  --tw-prose-lead: var(--color-text-muted);
  --tw-prose-links: var(--color-primary);
  --tw-prose-bold: var(--color-text);
  --tw-prose-counters: var(--color-text-muted);
  --tw-prose-bullets: var(--color-text-muted);
  --tw-prose-hr: var(--color-border);
  --tw-prose-quotes: var(--color-text-muted);
  --tw-prose-quote-borders: color-mix(in srgb, var(--color-primary) 35%, transparent);
  --tw-prose-captions: var(--color-text-muted);
  --tw-prose-code: var(--color-text);
  --tw-prose-pre-code: var(--color-text);
  --tw-prose-pre-bg: var(--color-surface);
  --tw-prose-th-borders: var(--color-border);
  --tw-prose-td-borders: var(--color-border);
  color: var(--color-text);
}

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

:global(html[data-theme='dark']) .markdown-body :deep(blockquote) {
  color: color-mix(in srgb, var(--color-text) 82%, var(--color-text-muted));
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
  background: var(--color-surface, #f8fafc);
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
