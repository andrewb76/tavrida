<script setup lang="ts">
import PlaceholderPage from '@/components/PlaceholderPage.vue';
import { UiButton } from '@tavrida/ui';
import { RouterLink } from 'vue-router';
</script>

<template>
  <PlaceholderPage
    wireframe="W12"
    title="О клубе"
    description="Статическое описание миссии, как попасть в клуб."
  >
    <RouterLink to="/invite">
      <UiButton intent="primary">
        У меня есть инвайт
      </UiButton>
    </RouterLink>
  </PlaceholderPage>
</template>
