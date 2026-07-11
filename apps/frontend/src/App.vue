<script setup lang="ts">
import { useAuthSync } from '@/composables/useAuthSync';
import { useClubAccessSync } from '@/composables/useClubAccessSync';
import { useRolesSync } from '@/composables/useRolesSync';
import { RouterView } from 'vue-router';
import { Toaster } from 'vue-sonner';

useAuthSync();
useClubAccessSync();
useRolesSync();
</script>

<template>
  <RouterView />
  <Toaster
    position="top-center"
    rich-colors
  />
</template>
