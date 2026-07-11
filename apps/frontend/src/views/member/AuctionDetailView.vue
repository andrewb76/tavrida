<script setup lang="ts">
import { useCountdown } from '@/composables/useCountdown';
import {
  auctionStatusLabel,
  auctionTypeLabel,
  formatCountdown,
  formatMoney,
  sellerDisplayName,
} from '@/services/auction-format';
import {
  flattenCategories,
  listCategories,
  type CategoryNode,
} from '@/services/forum';
import {
  getAuction,
  listAuctionBids,
  listExpertAppraisals,
  type AuctionBid,
  type AuctionDetail,
  type ExpertAppraisal,
} from '@/services/auctions';
import { UiButton, UiModal } from '@tavrida/ui';
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

const route = useRoute();
const auctionId = computed(() => route.params.id as string);

const lot = ref<AuctionDetail | null>(null);
const bids = ref<AuctionBid[]>([]);
const appraisals = ref<ExpertAppraisal[]>([]);
const categories = ref<CategoryNode[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const activeTab = ref<'description' | 'bids' | 'expert'>('description');
const bidOpen = ref(false);
const bidAmount = ref<number | null>(null);

const { remainingMs, start: startCountdown } = useCountdown(() => lot.value?.endsAt);

const categoryTitle = computed(() => {
  if (!lot.value?.categoryId) return null;
  const flat = flattenCategories(categories.value);
  return flat.find((c) => c.id === lot.value?.categoryId)?.title ?? null;
});

const endingSoon = computed(() => {
  if (!lot.value?.isLive) return false;
  return remainingMs.value > 0 && remainingMs.value <= 24 * 60 * 60 * 1000;
});

const canBid = computed(() => Boolean(lot.value?.isLive));

const gallerySlides = computed(() => {
  if (!lot.value) return [];
  if (lot.value.images.length) return lot.value.images;
  return ['placeholder'];
});

const activeGallery = ref(0);

watch(
  () => lot.value?.minNextBid,
  (value) => {
    if (value != null) bidAmount.value = value;
  },
  { immediate: true },
);

onMounted(load);

async function load() {
  loading.value = true;
  error.value = null;
  activeGallery.value = 0;
  try {
    const [detail, bidRows, expertRows, categoryTree] = await Promise.all([
      getAuction(auctionId.value),
      listAuctionBids(auctionId.value),
      listExpertAppraisals(auctionId.value),
      categories.value.length ? Promise.resolve(categories.value) : listCategories(),
    ]);
    lot.value = detail;
    bids.value = bidRows;
    appraisals.value = expertRows;
    if (!categories.value.length) categories.value = categoryTree;
    if (detail.isLive) startCountdown();
    if (detail.hasExpertAppraisal && expertRows.length) activeTab.value = 'description';
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка загрузки';
    lot.value = null;
  } finally {
    loading.value = false;
  }
}

function addBidStep(step: number) {
  if (!lot.value || bidAmount.value == null) return;
  bidAmount.value = Math.max(lot.value.minNextBid, bidAmount.value + step);
}

function confirmBidMock() {
  bidOpen.value = false;
}
</script>

<template>
  <section class="lot-page">
    <header class="lot-page__top">
      <RouterLink
        to="/auctions"
        class="lot-page__back"
      >
        ← Каталог
      </RouterLink>
      <span
        v-if="lot"
        class="lot-page__wireframe"
      >W03</span>
    </header>

    <p
      v-if="loading"
      class="lot-page__status"
    >
      Загрузка…
    </p>
    <p
      v-else-if="error"
      class="lot-page__error"
    >
      {{ error }}
    </p>

    <template v-else-if="lot">
      <div class="lot-page__gallery">
        <div class="lot-page__gallery-main">
          <img
            v-if="gallerySlides[activeGallery] !== 'placeholder'"
            :src="gallerySlides[activeGallery]"
            :alt="lot.title"
            class="lot-page__gallery-img"
          >
          <span
            v-else
            class="lot-page__gallery-placeholder"
          >🏺</span>
        </div>
        <div
          v-if="gallerySlides.length > 1"
          class="lot-page__gallery-dots"
        >
          <button
            v-for="(_, idx) in gallerySlides"
            :key="idx"
            type="button"
            class="lot-page__dot"
            :class="{ 'lot-page__dot--active': idx === activeGallery }"
            @click="activeGallery = idx"
          />
        </div>
      </div>

      <div class="lot-page__head">
        <h1>{{ lot.title }}</h1>
        <div class="lot-page__meta">
          <span class="lot-page__seller">👤 {{ sellerDisplayName(lot.sellerId) }}</span>
          <span
            v-if="categoryTitle"
            class="lot-page__category"
          >{{ categoryTitle }}</span>
          <span class="lot-page__type">{{ auctionTypeLabel(lot.type) }}</span>
        </div>
      </div>

      <div
        class="lot-page__status-bar"
        :class="{ 'lot-page__status-bar--ending': endingSoon }"
      >
        <div class="lot-page__status-left">
          <span
            v-if="lot.isLive"
            class="lot-page__live"
          >● LIVE</span>
          <span
            v-if="lot.isPromoted"
            class="lot-page__promoted"
          >↑ Продвижение</span>
          <span class="lot-page__phase">{{ auctionStatusLabel(lot) }}</span>
        </div>
        <div class="lot-page__status-right">
          <span
            v-if="lot.isLive && lot.endsAt"
            class="lot-page__timer"
          >⏱ {{ formatCountdown(remainingMs) }}</span>
          <strong class="lot-page__price">{{ formatMoney(lot.currentPrice, lot.currency) }}</strong>
          <span class="lot-page__bids">{{ lot.bidCount }} ставок</span>
        </div>
      </div>

      <dl class="lot-page__facts">
        <div>
          <dt>Стартовая цена</dt>
          <dd>{{ formatMoney(lot.startingPrice, lot.currency) }}</dd>
        </div>
        <div>
          <dt>Шаг ставки</dt>
          <dd>{{ formatMoney(lot.bidIncrement, lot.currency) }}</dd>
        </div>
        <div>
          <dt>Мин. следующая</dt>
          <dd>{{ formatMoney(lot.minNextBid, lot.currency) }}</dd>
        </div>
        <div v-if="lot.reservePrice != null">
          <dt>Резерв</dt>
          <dd>{{ formatMoney(lot.reservePrice, lot.currency) }}</dd>
        </div>
        <div v-if="lot.startsAt">
          <dt>Начало</dt>
          <dd>{{ new Date(lot.startsAt).toLocaleString('ru-RU') }}</dd>
        </div>
        <div v-if="lot.endsAt">
          <dt>Окончание</dt>
          <dd>{{ new Date(lot.endsAt).toLocaleString('ru-RU') }}</dd>
        </div>
      </dl>

      <div
        class="lot-page__tabs"
        role="tablist"
      >
        <button
          type="button"
          role="tab"
          :aria-selected="activeTab === 'description'"
          :class="{ 'lot-page__tab--active': activeTab === 'description' }"
          @click="activeTab = 'description'"
        >
          Описание
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="activeTab === 'bids'"
          :class="{ 'lot-page__tab--active': activeTab === 'bids' }"
          @click="activeTab = 'bids'"
        >
          Ставки ({{ bids.length }})
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="activeTab === 'expert'"
          :class="{ 'lot-page__tab--active': activeTab === 'expert' }"
          @click="activeTab = 'expert'"
        >
          Экспертиза
          <span
            v-if="lot.hasExpertAppraisal"
            class="lot-page__tab-badge"
          >✓</span>
        </button>
      </div>

      <div class="lot-page__panel">
        <div
          v-if="activeTab === 'description'"
          class="lot-page__description"
        >
          {{ lot.description }}
        </div>

        <ul
          v-else-if="activeTab === 'bids'"
          class="lot-page__bid-list"
        >
          <li
            v-for="bid in bids"
            :key="bid.id"
            class="lot-page__bid-item"
            :class="{ 'lot-page__bid-item--winning': bid.isWinning }"
          >
            <div>
              <strong>{{ formatMoney(bid.amount, bid.currency) }}</strong>
              <span
                v-if="bid.isWinning"
                class="lot-page__winning"
              >лидирует</span>
            </div>
            <small>
              {{ new Date(bid.placedAt).toLocaleString('ru-RU') }}
              · участник {{ bid.bidderId }}
            </small>
          </li>
          <li
            v-if="bids.length === 0"
            class="lot-page__empty"
          >
            Ставок пока нет.
          </li>
        </ul>

        <div
          v-else
          class="lot-page__expert"
        >
          <article
            v-for="item in appraisals"
            :key="item.id"
            class="lot-page__expert-card"
          >
            <p class="lot-page__expert-summary">
              {{ item.summary }}
            </p>
            <p
              v-if="item.estimatedValueMin != null && item.estimatedValueMax != null"
              class="lot-page__expert-range"
            >
              Оценка:
              {{ formatMoney(item.estimatedValueMin, item.currency) }}
              –
              {{ formatMoney(item.estimatedValueMax, item.currency) }}
            </p>
            <small>
              Эксперт {{ item.expertId }}
              · {{ new Date(item.createdAt).toLocaleDateString('ru-RU') }}
            </small>
          </article>
          <p
            v-if="appraisals.length === 0"
            class="lot-page__empty"
          >
            <template v-if="lot.hasExpertAppraisal">
              Экспертиза ожидается.
            </template>
            <template v-else>
              Для этого лота экспертиза не проводилась.
            </template>
          </p>
        </div>
      </div>

      <div
        v-if="canBid"
        class="lot-page__sticky"
      >
        <UiButton
          intent="primary"
          class="lot-page__bid-cta"
          @click="bidOpen = true"
        >
          Сделать ставку · {{ formatMoney(lot.minNextBid, lot.currency) }}
        </UiButton>
      </div>

      <UiModal
        v-model:open="bidOpen"
        title="Ставка на лот"
        :description="lot.title"
      >
        <p class="lot-page__modal-meta">
          Текущая: {{ formatMoney(lot.currentPrice, lot.currency) }}
          · мин.: {{ formatMoney(lot.minNextBid, lot.currency) }}
        </p>
        <label class="lot-page__modal-input">
          Сумма
          <input
            v-model.number="bidAmount"
            type="number"
            :min="lot.minNextBid"
            :step="lot.bidIncrement"
          >
        </label>
        <div class="lot-page__chips">
          <button
            type="button"
            @click="addBidStep(lot.bidIncrement)"
          >
            +{{ lot.bidIncrement }}
          </button>
          <button
            type="button"
            @click="addBidStep(lot.bidIncrement * 2)"
          >
            +{{ lot.bidIncrement * 2 }}
          </button>
          <button
            type="button"
            @click="addBidStep(lot.bidIncrement * 5)"
          >
            +{{ lot.bidIncrement * 5 }}
          </button>
        </div>
        <UiButton
          intent="primary"
          class="w-full"
          @click="confirmBidMock"
        >
          Подтвердить (mock)
        </UiButton>
      </UiModal>
    </template>
  </section>
</template>

<style scoped>
.lot-page {
  display: grid;
  gap: 1rem;
  padding-bottom: 5rem;
}

.lot-page__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.lot-page__back {
  color: var(--color-primary, #2563eb);
  text-decoration: none;
  font-size: 0.95rem;
}

.lot-page__wireframe {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--color-text-muted, #666);
}

.lot-page__gallery {
  border: 1px solid var(--color-border, #ddd);
  border-radius: 12px;
  overflow: hidden;
  background: var(--color-bg, #f8fafc);
}

.lot-page__gallery-main {
  display: grid;
  place-items: center;
  min-height: 220px;
}

.lot-page__gallery-img {
  width: 100%;
  max-height: 320px;
  object-fit: cover;
}

.lot-page__gallery-placeholder {
  font-size: 4rem;
}

.lot-page__gallery-dots {
  display: flex;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.6rem;
}

.lot-page__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 0;
  background: #cbd5e1;
  cursor: pointer;
}

.lot-page__dot--active {
  background: var(--color-primary, #2563eb);
}

.lot-page__head h1 {
  margin: 0 0 0.5rem;
  font-size: 1.5rem;
}

.lot-page__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  color: var(--color-text-muted, #666);
  font-size: 0.9rem;
}

.lot-page__status-bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border-radius: 10px;
  border: 1px solid var(--color-border, #ddd);
  background: var(--color-surface, #fff);
}

.lot-page__status-bar--ending {
  border-color: #f59e0b;
  background: #fffbeb;
}

.lot-page__status-left,
.lot-page__status-right {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
}

.lot-page__live {
  color: #dc2626;
  font-weight: 600;
}

.lot-page__promoted {
  color: var(--color-primary, #2563eb);
}

.lot-page__price {
  font-size: 1.2rem;
}

.lot-page__facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
  margin: 0;
  padding: 0.85rem 1rem;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 10px;
}

.lot-page__facts div {
  display: grid;
  gap: 0.15rem;
}

.lot-page__facts dt {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--color-text-muted, #666);
}

.lot-page__facts dd {
  margin: 0;
  font-weight: 600;
}

.lot-page__tabs {
  display: flex;
  gap: 0.35rem;
  border-bottom: 1px solid var(--color-border, #ddd);
}

.lot-page__tabs button {
  border: 0;
  background: transparent;
  padding: 0.6rem 0.9rem;
  cursor: pointer;
  color: var(--color-text-muted, #666);
  border-bottom: 2px solid transparent;
}

.lot-page__tab--active {
  color: var(--color-primary, #2563eb) !important;
  border-bottom-color: var(--color-primary, #2563eb) !important;
  font-weight: 600;
}

.lot-page__tab-badge {
  margin-left: 0.25rem;
  color: #16a34a;
}

.lot-page__panel {
  border: 1px solid var(--color-border, #ddd);
  border-radius: 10px;
  padding: 1rem;
  min-height: 120px;
}

.lot-page__description {
  white-space: pre-wrap;
  line-height: 1.55;
}

.lot-page__bid-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.6rem;
}

.lot-page__bid-item {
  padding: 0.65rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--color-border, #ddd);
}

.lot-page__bid-item--winning {
  border-color: #86efac;
  background: #f0fdf4;
}

.lot-page__winning {
  margin-left: 0.5rem;
  font-size: 0.8rem;
  color: #16a34a;
}

.lot-page__expert-card {
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--color-border, #ddd);
  background: #f8fafc;
}

.lot-page__expert-summary {
  margin: 0 0 0.5rem;
  line-height: 1.5;
}

.lot-page__expert-range {
  margin: 0 0 0.35rem;
  font-weight: 600;
}

.lot-page__empty,
.lot-page__status {
  color: var(--color-text-muted, #666);
}

.lot-page__error {
  color: #b42318;
}

.lot-page__sticky {
  position: sticky;
  bottom: 0.75rem;
  z-index: 2;
}

.lot-page__bid-cta {
  width: 100%;
}

.lot-page__modal-meta {
  margin: 0 0 0.75rem;
  font-size: 0.9rem;
  color: var(--color-text-muted, #666);
}

.lot-page__modal-input {
  display: grid;
  gap: 0.25rem;
  margin-bottom: 0.75rem;
}

.lot-page__modal-input input {
  padding: 0.5rem 0.65rem;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 8px;
}

.lot-page__chips {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.lot-page__chips button {
  border: 1px solid var(--color-border, #ddd);
  background: #f8fafc;
  border-radius: 999px;
  padding: 0.25rem 0.65rem;
  cursor: pointer;
}
</style>
