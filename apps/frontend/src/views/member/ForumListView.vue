<script setup lang="ts">
import PlaceholderPage from '@/components/PlaceholderPage.vue';
import { UiButton } from '@tavrida/ui';
import { RouterLink } from 'vue-router';
</script>

<template>
  <PlaceholderPage wireframe="W05" title="Форум" description="Список тем, категории, FAB.">
    <RouterLink to="/forum/new">
      <UiButton intent="primary">+ Новая тема</UiButton>
    </RouterLink>
  </PlaceholderPage>
</template>
