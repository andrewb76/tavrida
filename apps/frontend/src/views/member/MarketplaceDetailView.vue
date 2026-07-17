<script setup lang="ts">
import { UiButton } from '@tavrida/ui';
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import {
  LISTING_CATEGORY_LABELS,
  createOrder,
  getMarketplaceListing,
  type MarketplaceListing,
} from '@/services/marketplace';
import { useSessionStore } from '@/stores/session';
import { imageProxyPresets, proxiedMediaUrl } from '@/utils/imageProxy';

const route = useRoute();
const router = useRouter();
const session = useSessionStore();
const id = computed(() => route.params.id as string);

const loading = ref(true);
const error = ref('');
const item = ref<MarketplaceListing | null>(null);
const ordering = ref(false);

let loadGeneration = 0;

async function load(listingId: string) {
  const generation = ++loadGeneration;
  loading.value = true;
  error.value = '';
  item.value = null;
  try {
    const listing = await getMarketplaceListing(listingId);
    if (generation !== loadGeneration || listingId !== id.value) return;
    item.value = listing;
  } catch (e) {
    if (generation !== loadGeneration) return;
    error.value = e instanceof Error ? e.message : 'Ошибка';
  } finally {
    if (generation === loadGeneration) loading.value = false;
  }
}

async function order() {
  if (!session.isMember) {
    await router.push('/join');
    return;
  }
  ordering.value = true;
  try {
    await createOrder(id.value);
    toast.success('Заказ создан', {
      action: {
        label: 'К заказам',
        onClick: () => router.push('/marketplace/orders'),
      },
    });
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Не удалось заказать');
  } finally {
    ordering.value = false;
  }
}

watch(id, (listingId) => void load(listingId), { immediate: true });
</script>

<template>
  <div class="space-y-6">
    <RouterLink
      to="/marketplace"
      class="text-sm text-primary"
    >
      ← К каталогу
    </RouterLink>

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
    <template v-else-if="item">
      <header class="space-y-2">
        <h1 class="text-2xl font-semibold">
          {{ item.title }}
        </h1>
        <p class="text-text-muted">
          <span v-if="item.category">{{ LISTING_CATEGORY_LABELS[item.category] }} · </span>
          {{ item.price.toLocaleString('ru-RU') }} {{ item.currency }}
        </p>
      </header>

      <p class="whitespace-pre-wrap">
        {{ item.description || 'Без описания' }}
      </p>

      <section
        v-if="item.portfolio?.length"
        class="space-y-3"
      >
        <h2 class="text-lg font-medium">
          Портфолио
        </h2>
        <ul class="grid gap-3 sm:grid-cols-2">
          <li
            v-for="p in item.portfolio"
            :key="p.id"
            class="rounded-md border border-border p-2"
          >
            <img
              :src="proxiedMediaUrl(p.imageUrl, imageProxyPresets.galleryMain) ?? p.imageUrl"
              :alt="p.title"
              class="mb-2 aspect-video w-full rounded object-cover"
            >
            <div class="text-sm font-medium">
              {{ p.title }}
            </div>
            <p
              v-if="p.description"
              class="text-xs text-text-muted"
            >
              {{ p.description }}
            </p>
          </li>
        </ul>
      </section>

      <UiButton
        v-if="session.userId !== item.providerId"
        type="button"
        :disabled="ordering"
        @click="order"
      >
        {{ ordering ? 'Отправка…' : 'Заказать' }}
      </UiButton>
    </template>
  </div>
</template>
