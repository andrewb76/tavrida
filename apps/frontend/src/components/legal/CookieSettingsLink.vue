<script setup lang="ts">
import { useCookieConsentStore } from '@/stores/cookieConsent';

const consent = useCookieConsentStore();

defineProps<{
  class?: string;
}>();
</script>

<template>
  <button
    type="button"
    class="cookie-settings-link"
    :class="$props.class"
    @click="consent.openPreferences()"
  >
    Настройки cookie
  </button>
</template>

<style scoped>
.cookie-settings-link {
  border: none;
  background: transparent;
  padding: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.cookie-settings-link:hover {
  opacity: 0.85;
}
</style>
