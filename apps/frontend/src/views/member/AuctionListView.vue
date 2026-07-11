<script setup lang="ts">
import { apiGet, type MockAuction } from '@/api/auctions';
import { UiButton } from '@tavrida/ui';
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';

const auctions = ref<MockAuction[]>([]);
const loading = ref(true);

onMounted(async () => {
  auctions.value = await apiGet<MockAuction[]>('/auctions');
  loading.value = false;
});
</script>

<template>
  <section class="space-y-6">
    <div class="flex items-center justify-between gap-4">
      <div>
        <p class="text-xs font-medium uppercase text-accent">
          W02
        </p>
        <h1 class="text-2xl font-semibold">
          Каталог лотов
        </h1>
      </div>
      <RouterLink to="/auctions/new">
        <UiButton
          intent="primary"
          size="sm"
        >
          + Лот
        </UiButton>
      </RouterLink>
    </div>

    <p
      v-if="loading"
      class="text-text-muted"
    >
      Загрузка…
    </p>

    <ul
      v-else
      class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <li
        v-for="lot in auctions"
        :key="lot.id"
        class="overflow-hidden rounded-lg border border-border bg-surface shadow-card"
      >
        <div class="flex h-32 items-center justify-center bg-bg text-3xl">
          🏺
        </div>
        <div class="space-y-2 p-4">
          <RouterLink
            :to="`/auctions/${lot.id}`"
            class="font-medium text-primary"
          >
            {{ lot.title }}
          </RouterLink>
          <p class="text-sm text-text-muted">
            <span
              v-if="lot.live"
              class="mr-2 text-error"
            >● LIVE</span>
            {{ lot.currentPrice }} ₽
          </p>
        </div>
      </li>
    </ul>
  </section>
</template>
