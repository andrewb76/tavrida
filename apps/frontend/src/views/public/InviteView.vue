<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

/** Legacy URL — redirect to /join preserving query. */
const route = useRoute();
const router = useRouter();

onMounted(() => {
  void router.replace({ name: 'join', query: route.query });
});
</script>

<template>
  <p class="text-center text-sm text-text-muted">Перенаправление…</p>
</template>
