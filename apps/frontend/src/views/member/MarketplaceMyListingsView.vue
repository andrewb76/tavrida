<script setup lang="ts">
import { UiButton } from '@tavrida/ui';
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { toast } from 'vue-sonner';
import {
  LISTING_CATEGORY_LABELS,
  createListing,
  deleteListing,
  listMyListings,
  updateListing,
  type ListingCategory,
  type ListingStatus,
  type MarketplaceListing,
} from '@/services/marketplace';

const loading = ref(true);
const error = ref('');
const items = ref<MarketplaceListing[]>([]);
const showForm = ref(false);
const form = ref({
  title: '',
  description: '',
  price: 1000,
  category: 'restoration' as ListingCategory,
  status: 'DRAFT' as ListingStatus,
});

const categories = Object.entries(LISTING_CATEGORY_LABELS) as [ListingCategory, string][];

async function load() {
  loading.value = true;
  error.value = '';
  try {
    items.value = await listMyListings();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка';
  } finally {
    loading.value = false;
  }
}

async function save() {
  try {
    await createListing({
      title: form.value.title,
      description: form.value.description,
      price: Number(form.value.price),
      category: form.value.category,
      status: form.value.status,
    });
    toast.success('Услуга создана');
    showForm.value = false;
    form.value = {
      title: '',
      description: '',
      price: 1000,
      category: 'restoration',
      status: 'DRAFT',
    };
    await load();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  }
}

async function setStatus(row: MarketplaceListing, status: ListingStatus) {
  try {
    await updateListing(row.id, { status });
    toast.success('Статус обновлён');
    await load();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка лимита/статуса');
  }
}

async function remove(row: MarketplaceListing) {
  if (!window.confirm(`Удалить «${row.title}»?`)) return;
  try {
    await deleteListing(row.id);
    toast.success('Удалено');
    await load();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  }
}

onMounted(load);
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">
          Мои услуги
        </h1>
        <p class="mt-1 text-sm text-text-muted">
          Free: 0 активных. Basic: до 3. Pro: без лимита.
        </p>
      </div>
      <div class="flex gap-2">
        <RouterLink to="/marketplace">
          <UiButton
            intent="secondary"
            size="sm"
            type="button"
          >
            Каталог
          </UiButton>
        </RouterLink>
        <UiButton
          size="sm"
          type="button"
          @click="showForm = true"
        >
          Новая услуга
        </UiButton>
      </div>
    </header>

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

    <ul
      v-else
      class="divide-y divide-border rounded-md border border-border"
    >
      <li
        v-for="row in items"
        :key="row.id"
        class="flex flex-wrap items-center justify-between gap-2 px-3 py-3"
      >
        <div>
          <RouterLink
            :to="`/marketplace/${row.id}`"
            class="font-medium text-primary"
          >
            {{ row.title }}
          </RouterLink>
          <div class="text-xs text-text-muted">
            {{ row.status }} ·
            {{ row.category ? LISTING_CATEGORY_LABELS[row.category] : '—' }} ·
            {{ row.price.toLocaleString('ru-RU') }} {{ row.currency }}
          </div>
        </div>
        <div class="flex flex-wrap gap-1">
          <UiButton
            v-if="row.status !== 'ACTIVE'"
            intent="secondary"
            size="sm"
            type="button"
            @click="setStatus(row, 'ACTIVE')"
          >
            Опубликовать
          </UiButton>
          <UiButton
            v-if="row.status === 'ACTIVE'"
            intent="ghost"
            size="sm"
            type="button"
            @click="setStatus(row, 'PAUSED')"
          >
            Пауза
          </UiButton>
          <UiButton
            intent="danger"
            size="sm"
            type="button"
            @click="remove(row)"
          >
            Удалить
          </UiButton>
        </div>
      </li>
      <li
        v-if="!items.length"
        class="px-3 py-4 text-sm text-text-muted"
      >
        Пока нет объявлений.
      </li>
    </ul>

    <form
      v-if="showForm"
      class="space-y-3 rounded-md border border-border p-4"
      @submit.prevent="save"
    >
      <h2 class="text-lg font-medium">
        Новая услуга
      </h2>
      <label class="grid gap-1 text-sm">
        Название
        <input
          v-model="form.title"
          class="rounded border border-border px-2 py-1"
          required
        >
      </label>
      <label class="grid gap-1 text-sm">
        Описание
        <textarea
          v-model="form.description"
          class="rounded border border-border px-2 py-1"
          rows="3"
        />
      </label>
      <div class="grid gap-3 md:grid-cols-3">
        <label class="grid gap-1 text-sm">
          Цена
          <input
            v-model.number="form.price"
            class="rounded border border-border px-2 py-1"
            type="number"
            min="0"
            required
          >
        </label>
        <label class="grid gap-1 text-sm">
          Категория
          <select
            v-model="form.category"
            class="rounded border border-border px-2 py-1"
          >
            <option
              v-for="[slug, label] in categories"
              :key="slug"
              :value="slug"
            >
              {{ label }}
            </option>
          </select>
        </label>
        <label class="grid gap-1 text-sm">
          Статус
          <select
            v-model="form.status"
            class="rounded border border-border px-2 py-1"
          >
            <option value="DRAFT">
              Черновик
            </option>
            <option value="ACTIVE">
              Активна
            </option>
          </select>
        </label>
      </div>
      <div class="flex gap-2">
        <UiButton
          type="submit"
          size="sm"
        >
          Создать
        </UiButton>
        <UiButton
          intent="secondary"
          size="sm"
          type="button"
          @click="showForm = false"
        >
          Отмена
        </UiButton>
      </div>
    </form>
  </div>
</template>
