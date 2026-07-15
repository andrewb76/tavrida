<script setup lang="ts">
import { apiGet, type MockAuction } from '@/api/auctions';
import { mockForumTopics } from '@/api/mock/fixtures';
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';

const liveAuctions = ref<MockAuction[]>([]);

onMounted(async () => {
  const all = await apiGet<MockAuction[]>('/auctions');
  liveAuctions.value = all.filter((a) => a.live).slice(0, 3);
});
</script>

<template>
  <section class="space-y-8">
    <div>
      <p class="text-xs font-medium uppercase text-accent">
        W01
      </p>
      <h1 class="text-3xl font-semibold">
        Home
      </h1>
      <p class="mt-2 text-text-muted">
        Live-аукционы и teaser форума (mock)
      </p>
      <div class="mt-4 flex flex-wrap gap-2">
        <RouterLink
          to="/plans"
          class="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-medium text-primary shadow-card hover:bg-bg"
        >
          Тарифы →
        </RouterLink>
        <RouterLink
          to="/subscriptions"
          class="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-medium text-primary shadow-card hover:bg-bg"
        >
          Подписки на события →
        </RouterLink>
      </div>
    </div>

    <div>
      <h2 class="mb-3 text-lg font-medium">
        🔴 Live now
      </h2>
      <ul class="grid gap-3 sm:grid-cols-2">
        <li
          v-for="lot in liveAuctions"
          :key="lot.id"
          class="rounded-lg border border-border bg-surface p-4 shadow-card"
        >
          <RouterLink
            :to="`/auctions/${lot.id}`"
            class="font-medium text-primary"
          >
            {{ lot.title }}
          </RouterLink>
          <p class="mt-1 text-sm text-text-muted">
            {{ lot.currentPrice }} ₽
          </p>
        </li>
      </ul>
    </div>

    <div>
      <h2 class="mb-3 text-lg font-medium">
        Новые на форуме
      </h2>
      <ul class="space-y-2">
        <li
          v-for="topic in mockForumTopics"
          :key="topic.id"
        >
          <RouterLink
            :to="`/forum/topics/${topic.id}`"
            class="text-primary hover:underline"
          >
            {{ topic.title }}
          </RouterLink>
          <span class="ml-2 text-sm text-text-muted">{{ topic.comments }} комм.</span>
        </li>
      </ul>
    </div>
  </section>
</template>
