<script setup lang="ts">
import type { CatalogSort, CatalogStatus } from '@/services/auctions';
import { flattenCategories, listCategories, type CategoryNode } from '@/services/forum';
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';

const props = defineProps<{
  status: CatalogStatus;
  sort: CatalogSort;
  categoryId?: string;
  search: string;
  loading?: boolean;
  hasActiveFilters?: boolean;
  proFiltersEnabled?: boolean;
  minPrice?: number;
  maxPrice?: number;
  type?: string;
  hasExpertAppraisal?: boolean;
}>();

const emit = defineEmits<{
  'update:search': [value: string];
  searchSubmit: [];
  statusChange: [status: CatalogStatus];
  sortChange: [sort: CatalogSort];
  categoryChange: [categoryId: string | undefined];
  reset: [];
  proFiltersChange: [
    input: {
      minPrice?: number;
      maxPrice?: number;
      type?: 'ENGLISH' | 'DUTCH' | '';
      hasExpertAppraisal?: boolean;
    },
  ];
}>();

const categories = ref<CategoryNode[]>([]);
const showPro = ref(false);

const flatCategories = computed(() => flattenCategories(categories.value));

const statusOptions: Array<{ value: CatalogStatus; label: string }> = [
  { value: 'ACTIVE', label: 'Live' },
  { value: 'ENDING_SOON', label: 'Скоро' },
  { value: 'ENDED', label: 'Завершённые' },
  { value: 'ALL', label: 'Все' },
];

const sortOptions: Array<{ value: CatalogSort; label: string }> = [
  { value: 'ENDING_SOON', label: 'Скоро закончатся' },
  { value: 'NEWEST', label: 'Новые' },
  { value: 'PRICE_ASC', label: 'Цена ↑' },
  { value: 'PRICE_DESC', label: 'Цена ↓' },
  { value: 'PROMOTED', label: 'Продвинутые' },
  { value: 'RELEVANCE', label: 'По релевантности' },
];

const proMin = ref<number | undefined>(props.minPrice);
const proMax = ref<number | undefined>(props.maxPrice);
const proType = ref(props.type ?? '');
const proExpert = ref(props.hasExpertAppraisal ?? false);

onMounted(async () => {
  try {
    categories.value = await listCategories();
  } catch {
    categories.value = [];
  }
});

function onCategoryChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  emit('categoryChange', value || undefined);
}

function onSortChange(event: Event) {
  emit('sortChange', (event.target as HTMLSelectElement).value as CatalogSort);
}

function applyProFilters() {
  emit('proFiltersChange', {
    minPrice: proMin.value,
    maxPrice: proMax.value,
    type: proType.value as 'ENGLISH' | 'DUTCH' | '',
    hasExpertAppraisal: proExpert.value,
  });
  showPro.value = false;
}
</script>

<template>
  <div class="auction-filters">
    <div class="auction-filters__row">
      <label class="auction-filters__search">
        <span class="auction-filters__search-icon">🔍</span>
        <input
          :value="search"
          type="search"
          placeholder="Поиск по лотам…"
          :disabled="loading"
          @input="emit('update:search', ($event.target as HTMLInputElement).value)"
          @keydown.enter.prevent="emit('searchSubmit')"
        >
      </label>

      <select
        class="auction-filters__select"
        :value="categoryId ?? ''"
        :disabled="loading"
        @change="onCategoryChange"
      >
        <option value="">
          Все категории
        </option>
        <option
          v-for="cat in flatCategories"
          :key="cat.id"
          :value="cat.id"
        >
          {{ cat.title }}
        </option>
      </select>
    </div>

    <div class="auction-filters__row">
      <div
        class="auction-filters__chips"
        role="group"
        aria-label="Статус торгов"
      >
        <button
          v-for="chip in statusOptions"
          :key="chip.value"
          type="button"
          class="auction-filters__chip"
          :class="{ 'auction-filters__chip--active': status === chip.value }"
          :disabled="loading"
          @click="emit('statusChange', chip.value)"
        >
          <span
            v-if="chip.value === 'ACTIVE'"
            class="auction-filters__live-dot"
          >●</span>
          {{ chip.label }}
        </button>
      </div>

      <select
        class="auction-filters__select"
        :value="sort"
        :disabled="loading || (sort === 'RELEVANCE' && !search.trim())"
        @change="onSortChange"
      >
        <option
          v-for="opt in sortOptions"
          :key="opt.value"
          :value="opt.value"
          :disabled="opt.value === 'RELEVANCE' && search.trim().length < 2"
        >
          {{ opt.label }}
        </option>
      </select>

      <button
        v-if="proFiltersEnabled"
        type="button"
        class="auction-filters__pro"
        :disabled="loading"
        @click="showPro = !showPro"
      >
        Фильтры Pro
      </button>
      <RouterLink
        v-else
        to="/plans"
        class="auction-filters__pro auction-filters__pro--locked"
      >
        🔒 Pro
      </RouterLink>

      <button
        v-if="hasActiveFilters"
        type="button"
        class="auction-filters__reset"
        @click="emit('reset')"
      >
        Сбросить
      </button>
    </div>

    <div
      v-if="showPro && proFiltersEnabled"
      class="auction-filters__drawer"
    >
      <label>
        Цена от
        <input
          v-model.number="proMin"
          type="number"
          min="0"
        >
      </label>
      <label>
        до
        <input
          v-model.number="proMax"
          type="number"
          min="0"
        >
      </label>
      <label>
        Тип
        <select v-model="proType">
          <option value="">
            Любой
          </option>
          <option value="ENGLISH">
            English
          </option>
          <option value="DUTCH">
            Dutch
          </option>
        </select>
      </label>
      <label class="auction-filters__check">
        <input
          v-model="proExpert"
          type="checkbox"
        >
        Есть экспертиза
      </label>
      <button
        type="button"
        class="auction-filters__apply"
        @click="applyProFilters"
      >
        Применить
      </button>
    </div>
  </div>
</template>

<style scoped>
.auction-filters {
  display: grid;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 10px;
  background: var(--color-surface, #fff);
}

.auction-filters__row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.auction-filters__search {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex: 1 1 220px;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 8px;
  padding: 0.35rem 0.6rem;
}

.auction-filters__search input {
  border: 0;
  outline: none;
  width: 100%;
  background: transparent;
}

.auction-filters__select {
  min-width: 160px;
  padding: 0.45rem 0.6rem;
  border-radius: 8px;
  border: 1px solid var(--color-border, #ddd);
}

.auction-filters__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.auction-filters__chip {
  border: 1px solid var(--color-border, #ddd);
  background: transparent;
  border-radius: 999px;
  padding: 0.3rem 0.75rem;
  cursor: pointer;
}

.auction-filters__chip--active {
  border-color: var(--color-primary, #2563eb);
  color: var(--color-primary, #2563eb);
  background: rgba(37, 99, 235, 0.08);
}

.auction-filters__live-dot {
  color: #dc2626;
  margin-right: 0.15rem;
}

.auction-filters__pro,
.auction-filters__reset,
.auction-filters__apply {
  border: 1px solid var(--color-border, #ddd);
  background: transparent;
  border-radius: 8px;
  padding: 0.4rem 0.7rem;
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  font-size: 0.9rem;
}

.auction-filters__pro--locked {
  opacity: 0.75;
}

.auction-filters__drawer {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: end;
  padding-top: 0.25rem;
  border-top: 1px dashed var(--color-border, #ddd);
}

.auction-filters__drawer label {
  display: grid;
  gap: 0.25rem;
  font-size: 0.85rem;
}

.auction-filters__check {
  display: flex !important;
  align-items: center;
  gap: 0.35rem;
}
</style>
