<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  body: string;
}>();

const parts = computed(() => {
  const pattern = /!\[([^\]]*)]\(([^)]+)\)/g;
  const segments: Array<{ type: 'text' | 'image'; value: string; alt?: string }> = [];
  let lastIndex = 0;
  for (const match of props.body.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push({ type: 'text', value: props.body.slice(lastIndex, index) });
    }
    segments.push({ type: 'image', alt: match[1] ?? '', value: match[2] ?? '' });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < props.body.length) {
    segments.push({ type: 'text', value: props.body.slice(lastIndex) });
  }
  return segments.length ? segments : [{ type: 'text' as const, value: props.body }];
});
</script>

<template>
  <div class="markdown-body">
    <template
      v-for="(part, idx) in parts"
      :key="idx"
    >
      <span
        v-if="part.type === 'text'"
        class="markdown-body__text"
      >{{ part.value }}</span>
      <figure
        v-else
        class="markdown-body__figure"
      >
        <img
          :src="part.value"
          :alt="part.alt"
          loading="lazy"
        >
      </figure>
    </template>
  </div>
</template>

<style scoped>
.markdown-body {
  display: grid;
  gap: 0.75rem;
}

.markdown-body__text {
  white-space: pre-wrap;
}

.markdown-body__figure {
  margin: 0;
}

.markdown-body__figure img {
  max-width: 100%;
  border-radius: 8px;
}
</style>
