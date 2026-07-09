<script setup lang="ts">
import PlaceholderPage from '@/components/PlaceholderPage.vue';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const topicId = computed(() => route.params.id as string);
</script>

<template>
  <PlaceholderPage
    wireframe="W06"
    :title="`Тема ${topicId}`"
    description="Markdown, комментарии, реакции."
  />
</template>
