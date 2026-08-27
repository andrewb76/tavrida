<script setup lang="ts">
import CookieConsentBanner from '@/components/legal/CookieConsentBanner.vue';
import { useAuthSync } from '@/composables/useAuthSync';
import { useClubAccessSync } from '@/composables/useClubAccessSync';
import { usePresenceSync } from '@/composables/usePresenceSync';
import { useRolesSync } from '@/composables/useRolesSync';
import { installBffAuthFetchInterceptor } from '@/services/bffFetchInterceptor';
import { useCookieConsentStore } from '@/stores/cookieConsent';
import { RouterView } from 'vue-router';
import { Toaster } from 'vue-sonner';

installBffAuthFetchInterceptor();
useAuthSync();
useClubAccessSync();
usePresenceSync();
useRolesSync();
useCookieConsentStore().init();
</script>

<template>
  <RouterView />
  <CookieConsentBanner />
  <Toaster
    position="top-center"
    rich-colors
    close-button
    :duration="8000"
    :offset="72"
  />
</template>
