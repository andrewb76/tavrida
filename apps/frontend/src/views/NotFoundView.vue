<script setup lang="ts">
import { UiButton } from '@tavrida/ui';
import { RouterLink } from 'vue-router';
</script>

<template>
  <section class="space-y-4 text-center">
    <h1 class="text-2xl font-semibold">404</h1>
    <p class="text-text-muted">Страница не найдена.</p>
    <RouterLink to="/">
      <UiButton intent="primary">На главную</UiButton>
    </RouterLink>
  </section>
</template>
