<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';
import AppSidebar from '@/components/common/AppSidebar.vue';
</script>

<template>
  <div class="flex h-screen overflow-hidden">
    <AppSidebar />
    <main class="flex-1 overflow-y-auto p-6">
      <RouterView />
    </main>
  </div>
</template>
