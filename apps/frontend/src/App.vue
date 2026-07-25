<script setup lang="ts">
import CookieConsentBanner from '@/components/legal/CookieConsentBanner.vue';
import { useAuthSync } from '@/composables/useAuthSync';
import { useClubAccessSync } from '@/composables/useClubAccessSync';
import { useRolesSync } from '@/composables/useRolesSync';
import { useCookieConsentStore } from '@/stores/cookieConsent';
import { RouterView } from 'vue-router';
import { Toaster } from 'vue-sonner';

useAuthSync();
useClubAccessSync();
useRolesSync();
useCookieConsentStore().init();
</script>

<template>
  <RouterView />
  <CookieConsentBanner />
  <Toaster
    position="top-center"
    rich-colors
  />
</template>
