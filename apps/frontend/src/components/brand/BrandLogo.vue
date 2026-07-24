<script setup lang="ts">
import { computed } from 'vue';
import {
  BRAND_LOGO_DARK_URL,
  BRAND_LOGO_LIGHT_URL,
  BRAND_MARK_DARK_URL,
  BRAND_MARK_LIGHT_URL,
  BRAND_NAME,
} from '@/config/brand';

const props = withDefaults(
  defineProps<{
    /** header — хедер; hero — landing; compact — подвал / about; mark — только монограмма */
    variant?: 'header' | 'hero' | 'compact' | 'mark';
    /** dark — chalk/sand на ink; light — ink/patina на chalk/surface */
    theme?: 'dark' | 'light';
  }>(),
  {
    variant: 'header',
    theme: 'light',
  },
);

const isDark = computed(() => props.theme === 'dark');

const src = computed(() => {
  if (props.variant === 'mark') {
    return isDark.value ? BRAND_MARK_DARK_URL : BRAND_MARK_LIGHT_URL;
  }
  return isDark.value ? BRAND_LOGO_DARK_URL : BRAND_LOGO_LIGHT_URL;
});
</script>

<template>
  <img
    :src="src"
    :alt="BRAND_NAME"
    class="brand-logo"
    :class="`brand-logo--${variant}`"
    decoding="async"
  >
</template>

<style scoped>
.brand-logo {
  display: block;
  width: auto;
  max-width: 100%;
  height: auto;
}

.brand-logo--header {
  height: 3.1rem;
}

.brand-logo--compact {
  height: 1.5rem;
}

.brand-logo--hero {
  height: clamp(2.75rem, 8vw, 4rem);
}

.brand-logo--mark {
  height: 2rem;
  width: 2rem;
}
</style>
