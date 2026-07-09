<script setup lang="ts">
import PlaceholderPage from '@/components/PlaceholderPage.vue';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const id = computed(() => route.params.id as string);
</script>

<template>
  <PlaceholderPage wireframe="W09" :title="`Услуга ${id}`" description="Страница услуги v1.1." />
</template>
