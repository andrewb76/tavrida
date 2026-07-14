<script setup lang="ts">
import { UiButton } from '@tavrida/ui';
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { toast } from 'vue-sonner';
import MediaUploader from '@/components/media/MediaUploader.vue';
import { useMediaUpload } from '@/composables/useMediaUpload';
import {
  LISTING_CATEGORY_LABELS,
  addPortfolioItem,
  createListing,
  deleteListing,
  getMarketplaceListing,
  listMyListings,
  removePortfolioItem,
  updateListing,
  type ListingCategory,
  type ListingStatus,
  type MarketplaceListing,
  type PortfolioItem,
} from '@/services/marketplace';
import { proxiedMediaUrl, imageProxyPresets } from '@/utils/imageProxy';

const loading = ref(true);
const error = ref('');
const items = ref<MarketplaceListing[]>([]);
const showForm = ref(false);
const portfolioListingId = ref<string | null>(null);
const portfolioItems = ref<PortfolioItem[]>([]);
const portfolioLoading = ref(false);
const portfolioBusy = ref(false);

const form = ref({
  title: '',
  description: '',
  price: 1000,
  category: 'restoration' as ListingCategory,
  status: 'DRAFT' as ListingStatus,
});

const categories = Object.entries(LISTING_CATEGORY_LABELS) as [ListingCategory, string][];
const upload = useMediaUpload('marketplace');

const canAddPortfolio = computed(() => {
  if (!upload.limits.value) return false;
  return portfolioItems.value.length + upload.items.value.length < upload.limits.value.countMax;
});

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
    if (portfolioListingId.value === row.id) closePortfolio();
    toast.success('Удалено');
    await load();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  }
}

async function openPortfolio(row: MarketplaceListing) {
  portfolioListingId.value = row.id;
  portfolioLoading.value = true;
  upload.reset();
  try {
    const full = await getMarketplaceListing(row.id);
    portfolioItems.value = full.portfolio ?? [];
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Не удалось загрузить портфолио');
    closePortfolio();
  } finally {
    portfolioLoading.value = false;
  }
}

function closePortfolio() {
  portfolioListingId.value = null;
  portfolioItems.value = [];
  upload.reset();
}

async function attachReadyUploads() {
  const listingId = portfolioListingId.value;
  if (!listingId || portfolioBusy.value) return;

  const ready = upload.items.value.filter((i) => i.status === 'ready' && i.result);
  if (!ready.length) return;

  portfolioBusy.value = true;
  try {
    for (const item of ready) {
      const result = item.result!;
      await addPortfolioItem(listingId, {
        title: result.filename.replace(/\.[^.]+$/, '') || 'Фото',
        imageUrl: result.url,
      });
      upload.removeItem(item.id);
    }
    const full = await getMarketplaceListing(listingId);
    portfolioItems.value = full.portfolio ?? [];
    toast.success('Фото добавлены в портфолио');
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Не удалось сохранить портфолио');
  } finally {
    portfolioBusy.value = false;
  }
}

async function removePortfolio(item: PortfolioItem) {
  const listingId = portfolioListingId.value;
  if (!listingId) return;
  try {
    await removePortfolioItem(listingId, item.id);
    portfolioItems.value = portfolioItems.value.filter((p) => p.id !== item.id);
    toast.success('Удалено из портфолио');
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка удаления');
  }
}

function onSelectFiles(files: FileList) {
  if (!canAddPortfolio.value) {
    toast.error('Достигнут лимит портфолио для тарифа');
    return;
  }
  void upload.addFiles(files);
}

watch(
  () => upload.items.value.map((i) => `${i.id}:${i.status}`).join('|'),
  () => {
    void attachReadyUploads();
  },
);

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
            intent="ghost"
            size="sm"
            type="button"
            @click="openPortfolio(row)"
          >
            Портфолио
          </UiButton>
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

    <section
      v-if="portfolioListingId"
      class="space-y-3 rounded-md border border-border p-4"
    >
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-lg font-medium">
          Портфолио
        </h2>
        <UiButton
          intent="secondary"
          size="sm"
          type="button"
          @click="closePortfolio"
        >
          Закрыть
        </UiButton>
      </div>

      <p
        v-if="portfolioLoading"
        class="text-sm text-text-muted"
      >
        Загрузка…
      </p>
      <template v-else>
        <ul
          v-if="portfolioItems.length"
          class="grid gap-3 sm:grid-cols-3"
        >
          <li
            v-for="item in portfolioItems"
            :key="item.id"
            class="relative overflow-hidden rounded-md border border-border"
          >
            <img
              :src="proxiedMediaUrl(item.imageUrl, imageProxyPresets.attachmentThumb) ?? item.imageUrl"
              :alt="item.title"
              class="aspect-video w-full object-cover"
            >
            <div class="flex items-center justify-between gap-2 p-2">
              <span class="truncate text-xs">{{ item.title }}</span>
              <UiButton
                intent="danger"
                size="sm"
                type="button"
                @click="removePortfolio(item)"
              >
                ×
              </UiButton>
            </div>
          </li>
        </ul>
        <p
          v-else
          class="text-sm text-text-muted"
        >
          Пока нет фото. Загрузите примеры работ.
        </p>

        <MediaUploader
          :items="upload.items.value"
          :accept="upload.limits.value?.accept ?? 'image/*'"
          :can-add-more="canAddPortfolio && !portfolioBusy"
          :hint="
            upload.limits.value
              ? `До ${upload.limits.value.countMax} фото, до ${upload.limits.value.sizeMaxMb} MB`
              : undefined
          "
          @select="onSelectFiles"
          @remove="upload.removeItem"
        />
        <p
          v-if="upload.globalError.value"
          class="text-sm text-error"
        >
          {{ upload.globalError.value }}
        </p>
      </template>
    </section>

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
