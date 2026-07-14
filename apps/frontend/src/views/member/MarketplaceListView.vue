<script setup lang="ts">
import { UiButton } from '@tavrida/ui';
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import {
  LISTING_CATEGORY_LABELS,
  listMarketplaceListings,
  type ListingCategory,
  type MarketplaceListing,
} from '@/services/marketplace';

const loading = ref(true);
const error = ref('');
const items = ref<MarketplaceListing[]>([]);
const category = ref<string>('');

const categories = Object.entries(LISTING_CATEGORY_LABELS) as [ListingCategory, string][];

async function load() {
  loading.value = true;
  error.value = '';
  try {
    items.value = await listMarketplaceListings({
      category: category.value || undefined,
    });
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка загрузки';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">
          Маркет услуг
        </h1>
        <p class="mt-1 text-sm text-text-muted">
          Реставрация, экспертиза, доставка и другие услуги участников клуба.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <RouterLink to="/marketplace/orders">
          <UiButton
            size="sm"
            intent="secondary"
            type="button"
          >
            Мои заказы
          </UiButton>
        </RouterLink>
        <RouterLink to="/marketplace/my-listings">
          <UiButton
            size="sm"
            type="button"
          >
            Мои услуги
          </UiButton>
        </RouterLink>
      </div>
    </header>

    <div class="flex flex-wrap gap-2">
      <UiButton
        :intent="!category ? 'primary' : 'secondary'"
        size="sm"
        type="button"
        @click="category = ''; load()"
      >
        Все
      </UiButton>
      <UiButton
        v-for="[slug, label] in categories"
        :key="slug"
        :intent="category === slug ? 'primary' : 'secondary'"
        size="sm"
        type="button"
        @click="category = slug; load()"
      >
        {{ label }}
      </UiButton>
    </div>

    <p
      v-if="loading"
      class="text-sm text-text-muted"
    >
      Загрузка…
    </p>
    <p
      v-else-if="error"
      class="text-sm text-error"
    >
      {{ error }}
    </p>
    <p
      v-else-if="!items.length"
      class="text-sm text-text-muted"
    >
      Пока нет активных услуг.
    </p>
    <ul
      v-else
      class="grid gap-3 md:grid-cols-2"
    >
      <li
        v-for="item in items"
        :key="item.id"
      >
        <RouterLink
          :to="`/marketplace/${item.id}`"
          class="block rounded-md border border-border p-4 transition-colors hover:bg-surface"
        >
          <div class="font-medium">
            {{ item.title }}
          </div>
          <div class="mt-1 text-sm text-text-muted">
            <span v-if="item.category">{{ LISTING_CATEGORY_LABELS[item.category] }} · </span>
            {{ item.price.toLocaleString('ru-RU') }} {{ item.currency }}
          </div>
          <p class="mt-2 line-clamp-2 text-sm">
            {{ item.description || 'Без описания' }}
          </p>
        </RouterLink>
      </li>
    </ul>
  </div>
</template>
