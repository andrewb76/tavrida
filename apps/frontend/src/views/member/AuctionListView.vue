<script setup lang="ts">
import AuctionFilterBar from '@/components/auction/AuctionFilterBar.vue';
import { useAuctionCatalogFilters } from '@/composables/useAuctionCatalogFilters';
import {
  listAuctions,
  type AuctionCard,
  type AuctionCatalogFilters,
} from '@/services/auctions';
import { imageProxyPresets, proxiedMediaUrl } from '@/utils/imageProxy';
import { UiButton } from '@tavrida/ui';
import { computed, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';

const {
  filters,
  searchDraft,
  hasActiveFilters,
  setStatus,
  setCategoryId,
  setSort,
  setSearchInput,
  flushSearch,
  resetFilters,
  setProFilters,
} = useAuctionCatalogFilters();

const items = ref<AuctionCard[]>([]);
const nextCursor = ref<string | null>(null);
const searchScope = ref('TITLE');
const loading = ref(true);
const loadingMore = ref(false);
const error = ref<string | null>(null);

const proFiltersEnabled = computed(() => searchScope.value.includes('FILTERS'));

let catalogGeneration = 0;

async function loadCatalog() {
  const generation = ++catalogGeneration;
  loading.value = true;
  loadingMore.value = false;
  error.value = null;
  items.value = [];
  nextCursor.value = null;

  const query: AuctionCatalogFilters = { ...filters.value };
  delete query.cursor;

  try {
    const res = await listAuctions(query);
    if (generation !== catalogGeneration) return;
    searchScope.value = res.meta.searchScope;
    nextCursor.value = res.nextCursor;
    items.value = res.items;
  } catch (e) {
    if (generation !== catalogGeneration) return;
    error.value = e instanceof Error ? e.message : 'Ошибка загрузки';
  } finally {
    if (generation === catalogGeneration) loading.value = false;
  }
}

watch(filters, () => void loadCatalog(), { deep: true, immediate: true });

function loadMore() {
  if (!nextCursor.value || loadingMore.value) return;
  const generation = catalogGeneration;
  const query = { ...filters.value, cursor: nextCursor.value };
  loadingMore.value = true;
  listAuctions(query)
    .then((res) => {
      if (generation !== catalogGeneration) return;
      nextCursor.value = res.nextCursor;
      items.value = [...items.value, ...res.items];
    })
    .catch((e) => {
      if (generation !== catalogGeneration) return;
      error.value = e instanceof Error ? e.message : 'Ошибка загрузки';
    })
    .finally(() => {
      if (generation === catalogGeneration) loadingMore.value = false;
    });
}
</script>

<template>
  <section class="auction-catalog space-y-6">
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

    <AuctionFilterBar
      :status="filters.status ?? 'ACTIVE'"
      :sort="filters.sort ?? 'ENDING_SOON'"
      :category-id="filters.categoryId"
      :search="searchDraft"
      :loading="loading"
      :has-active-filters="hasActiveFilters"
      :pro-filters-enabled="proFiltersEnabled"
      :min-price="filters.minPrice"
      :max-price="filters.maxPrice"
      :type="filters.type"
      :has-expert-appraisal="filters.hasExpertAppraisal"
      @update:search="setSearchInput"
      @search-submit="flushSearch"
      @status-change="setStatus"
      @sort-change="setSort"
      @category-change="setCategoryId"
      @reset="resetFilters"
      @pro-filters-change="setProFilters"
    />

    <p
      v-if="loading"
      class="text-text-muted"
    >
      Загрузка…
    </p>
    <p
      v-else-if="error"
      class="text-error"
    >
      {{ error }}
    </p>
    <p
      v-else-if="items.length === 0"
      class="text-text-muted"
    >
      Ничего не найдено.
      <button
        v-if="hasActiveFilters"
        type="button"
        class="auction-catalog__reset-inline"
        @click="resetFilters"
      >
        Сбросить фильтры
      </button>
    </p>

    <ul
      v-else
      class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <li
        v-for="lot in items"
        :key="lot.id"
        class="overflow-hidden rounded-lg border border-border bg-surface shadow-card"
      >
        <div class="flex h-32 items-center justify-center bg-bg text-3xl">
          <img
            v-if="lot.thumbnailUrl"
            :src="proxiedMediaUrl(lot.thumbnailUrl, imageProxyPresets.auctionCatalogThumb)"
            :alt="lot.title"
            class="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          >
          <span v-else>🏺</span>
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
              v-if="lot.isLive"
              class="mr-2 text-error"
            >● LIVE</span>
            <span
              v-if="lot.isPromoted"
              class="mr-2 text-accent"
            >↑</span>
            <span
              v-if="lot.hasExpertAppraisal"
              class="mr-2"
              title="Есть экспертиза"
            >🎓</span>
            {{ lot.currentPrice }} {{ lot.currency === 'RUB' ? '₽' : lot.currency }}
          </p>
        </div>
      </li>
    </ul>

    <div
      v-if="nextCursor && !loading"
      class="flex justify-center"
    >
      <UiButton
        intent="secondary"
        :disabled="loadingMore"
        @click="loadMore"
      >
        {{ loadingMore ? 'Загрузка…' : 'Ещё' }}
      </UiButton>
    </div>
  </section>
</template>

<style scoped>
.auction-catalog__reset-inline {
  margin-left: 0.35rem;
  border: 0;
  background: none;
  color: var(--color-primary, #2563eb);
  cursor: pointer;
  text-decoration: underline;
}
</style>
