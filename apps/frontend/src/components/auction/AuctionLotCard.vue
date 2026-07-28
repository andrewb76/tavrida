<script setup lang="ts">
import {
  auctionTypeShortLabel,
  formatMoney,
} from '@/services/auction-format';
import type { AuctionCard } from '@/services/auctions';
import ProxiedImg from '@/components/media/ProxiedImg.vue';
import { imageProxyPresets, proxiedMediaUrl } from '@/utils/imageProxy';
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

const props = defineProps<{
  lot: AuctionCard;
}>();

const isDutch = computed(() => props.lot.type === 'DUTCH');

const thumb = computed(() =>
  props.lot.thumbnailUrl
    ? proxiedMediaUrl(props.lot.thumbnailUrl, imageProxyPresets.auctionCatalogThumb)
    : null,
);

const priceHint = computed(() =>
  isDutch.value ? 'Текущая цена' : null,
);
</script>

<template>
  <li class="auction-lot-card overflow-hidden rounded-lg border border-border bg-surface shadow-card">
    <div class="auction-lot-card__media relative flex h-32 items-center justify-center bg-bg text-3xl">
      <ProxiedImg
        v-if="lot.thumbnailUrl"
        :src="thumb"
        :fallback-src="lot.thumbnailUrl"
        :alt="lot.title"
        class="h-full w-full object-cover"
        loading="eager"
      />
      <span v-else>🏺</span>
      <span
        v-if="isDutch"
        class="auction-lot-card__type"
      >{{ auctionTypeShortLabel(lot.type) }}</span>
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
        >● Идут торги</span>
        <span
          v-if="lot.isPromoted"
          class="mr-2 text-accent"
        >↑</span>
        <span
          v-if="lot.hasExpertAppraisal"
          class="mr-2"
          title="Есть экспертиза"
        >🎓</span>
      </p>
      <p class="tabular-nums text-sm text-text">
        <span
          v-if="priceHint"
          class="mr-1 text-xs text-text-muted"
        >{{ priceHint }}</span>
        {{ formatMoney(lot.currentPrice, lot.currency) }}
        <span
          v-if="!isDutch && lot.bidCount > 0"
          class="ml-1 text-text-muted"
        >· {{ lot.bidCount }} {{ lot.bidCount === 1 ? 'ставка' : 'ставок' }}</span>
        <span
          v-else-if="isDutch && lot.isLive"
          class="ml-1 text-xs text-text-muted"
        >· снижение по таймеру</span>
      </p>
    </div>
  </li>
</template>

<style scoped>
.auction-lot-card__type {
  position: absolute;
  left: 0.5rem;
  top: 0.5rem;
  border-radius: 0.25rem;
  background: color-mix(in srgb, var(--color-surface, #fff) 88%, transparent);
  padding: 0.15rem 0.45rem;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--color-text, #111);
  box-shadow: 0 1px 2px rgb(0 0 0 / 12%);
}
</style>
