<script setup lang="ts">
import { useAuthSync } from '@/composables/useAuthSync';
import { RouterView } from 'vue-router';
import { Toaster } from 'vue-sonner';

useAuthSync();
</script>

<template>
  <RouterView />
  <Toaster position="top-center" rich-colors />
</template>
