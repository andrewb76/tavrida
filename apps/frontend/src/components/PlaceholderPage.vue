<script setup lang="ts">
export type PlaceholderPageProps = {
  title: string;
  wireframe?: string;
  description?: string;
};

defineProps<PlaceholderPageProps>();
</script>

<template>
  <section class="space-y-3">
    <p
      v-if="wireframe"
      class="text-xs font-medium uppercase tracking-wide text-accent"
    >
      {{ wireframe }}
    </p>
    <h1 class="text-2xl font-semibold">
      {{ title }}
    </h1>
    <p
      v-if="description"
      class="max-w-2xl text-text-muted"
    >
      {{ description }}
    </p>
    <div
      class="mt-4 rounded-lg border border-dashed border-border bg-surface p-6 text-sm text-text-muted"
    >
      <slot />
    </div>
  </section>
</template>
