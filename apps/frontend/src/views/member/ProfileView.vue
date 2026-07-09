<script setup lang="ts">
import PlaceholderPage from '@/components/PlaceholderPage.vue';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const isMe = computed(() => route.name === 'profile-me');
const userId = computed(() => route.params.userId as string | undefined);
</script>

<template>
  <PlaceholderPage
    wireframe="W07"
    :title="isMe ? 'Мой профиль' : `Профиль ${userId}`"
    description="Рейтинг, heatmap (d3), активность."
  />
</template>
