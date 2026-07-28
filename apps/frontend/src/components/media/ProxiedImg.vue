<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    src?: string | null;
    /** Direct MinIO/S3 URL used if imgproxy stalls or errors. */
    fallbackSrc?: string | null;
    alt?: string;
    /** ms before falling back when the proxy never completes (browser pending). */
    fallbackAfterMs?: number;
    loading?: 'lazy' | 'eager';
    decoding?: 'async' | 'sync' | 'auto';
  }>(),
  {
    alt: '',
    fallbackAfterMs: 4000,
    loading: 'lazy',
    decoding: 'async',
  },
);

const displaySrc = ref<string | undefined>(undefined);
const usedFallback = ref(false);
let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

function clearFallbackTimer() {
  if (fallbackTimer != null) {
    clearTimeout(fallbackTimer);
    fallbackTimer = null;
  }
}

function armFallbackTimer() {
  clearFallbackTimer();
  const proxy = props.src?.trim() || undefined;
  const fallback = props.fallbackSrc?.trim() || undefined;
  if (!proxy || !fallback || fallback === proxy || props.fallbackAfterMs <= 0) return;

  fallbackTimer = setTimeout(() => {
    if (!usedFallback.value && displaySrc.value === proxy) {
      usedFallback.value = true;
      displaySrc.value = fallback;
    }
  }, props.fallbackAfterMs);
}

function resetFromProps() {
  usedFallback.value = false;
  displaySrc.value = props.src?.trim() || props.fallbackSrc?.trim() || undefined;
  armFallbackTimer();
}

function onLoad() {
  clearFallbackTimer();
}

function onError() {
  clearFallbackTimer();
  const fallback = props.fallbackSrc?.trim() || undefined;
  if (!usedFallback.value && fallback && displaySrc.value !== fallback) {
    usedFallback.value = true;
    displaySrc.value = fallback;
  }
}

watch(
  () => [props.src, props.fallbackSrc, props.fallbackAfterMs] as const,
  () => resetFromProps(),
  { immediate: true },
);

onMounted(() => armFallbackTimer());
onBeforeUnmount(() => clearFallbackTimer());
</script>

<template>
  <img
    v-if="displaySrc"
    :src="displaySrc"
    :alt="alt"
    :loading="loading"
    :decoding="decoding"
    @load="onLoad"
    @error="onError"
  >
</template>
