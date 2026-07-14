<script setup lang="ts">
import { UiButton } from '@tavrida/ui';
import { computed, ref } from 'vue';
import { toast } from 'vue-sonner';
import ProfileReputationLogModal from '@/components/profile/ProfileReputationLogModal.vue';
import {
  adjustProfileRating,
  formatKarma,
  formatRating,
  type ProfileRatingStats,
} from '@/services/profile';
import { useSessionStore } from '@/stores/session';

const props = defineProps<{
  rating: ProfileRatingStats;
}>();

const emit = defineEmits<{
  updated: [ProfileRatingStats];
}>();

const session = useSessionStore();
const adjusting = ref(false);
const logOpen = ref(false);
const logMetric = ref<'karma' | 'rating'>('karma');

const canAdjust = computed(() => session.isAdmin);

const ratingLabel = computed(() =>
  formatRating(props.rating.totalRating, props.rating.verifiedSales),
);

const karmaLabel = computed(() => formatKarma(props.rating.effectiveKarma));

const coverageLabel = computed(() => {
  if (props.rating.feedbackCoverage == null) return '—';
  return `${Math.round(props.rating.feedbackCoverage * 100)}%`;
});

function openLog(metric: 'karma' | 'rating') {
  logMetric.value = metric;
  logOpen.value = true;
}

async function applyDelta(patch: { karmaDelta?: number; ratingDelta?: number }) {
  adjusting.value = true;
  try {
    const updated = await adjustProfileRating(props.rating.userId, patch);
    emit('updated', updated);
    toast.success('Рейтинг обновлён');
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Не удалось обновить');
  } finally {
    adjusting.value = false;
  }
}
</script>

<template>
  <section class="profile-rating-stats">
    <div class="profile-rating-stats__grid">
      <div class="profile-rating-stats__item">
        <span class="profile-rating-stats__label">Рейтинг</span>
        <button
          type="button"
          class="profile-rating-stats__value-btn"
          title="История рейтинга"
          @click="openLog('rating')"
        >
          ★ {{ ratingLabel }}
        </button>
        <span class="profile-rating-stats__hint">
          {{ rating.verifiedSales }} сделок · покрытие {{ coverageLabel }}
        </span>
        <div
          v-if="canAdjust"
          class="profile-rating-stats__controls"
        >
          <UiButton
            intent="secondary"
            size="sm"
            :disabled="adjusting"
            @click="applyDelta({ ratingDelta: -0.1 })"
          >
            −
          </UiButton>
          <UiButton
            intent="secondary"
            size="sm"
            :disabled="adjusting"
            @click="applyDelta({ ratingDelta: 0.1 })"
          >
            +
          </UiButton>
        </div>
      </div>

      <div class="profile-rating-stats__item">
        <span class="profile-rating-stats__label">Карма</span>
        <button
          type="button"
          class="profile-rating-stats__value-btn"
          :class="rating.effectiveKarma >= 0 ? 'is-positive' : 'is-negative'"
          title="История кармы"
          @click="openLog('karma')"
        >
          {{ karmaLabel }}
        </button>
        <span
          v-if="rating.referralKarma !== 0"
          class="profile-rating-stats__hint"
        >
          рефералы {{ formatKarma(rating.referralKarma) }}
        </span>
        <div
          v-if="canAdjust"
          class="profile-rating-stats__controls"
        >
          <UiButton
            intent="secondary"
            size="sm"
            :disabled="adjusting"
            @click="applyDelta({ karmaDelta: -1 })"
          >
            −
          </UiButton>
          <UiButton
            intent="secondary"
            size="sm"
            :disabled="adjusting"
            @click="applyDelta({ karmaDelta: 1 })"
          >
            +
          </UiButton>
        </div>
      </div>
    </div>

    <ProfileReputationLogModal
      v-model:open="logOpen"
      :user-id="rating.userId"
      :metric="logMetric"
      :verified-sales="rating.verifiedSales"
    />
  </section>
</template>

<style scoped>
.profile-rating-stats {
  margin-bottom: 1.5rem;
}

.profile-rating-stats__grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
}

.profile-rating-stats__item {
  display: grid;
  gap: 0.2rem;
  padding: 0.875rem 1rem;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 0.5rem;
  background: var(--color-bg, #fff);
}

.profile-rating-stats__label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted, #666);
}

.profile-rating-stats__value-btn {
  justify-self: start;
  margin: 0;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text, #111);
  cursor: pointer;
  text-decoration: underline;
  text-decoration-color: transparent;
  text-underline-offset: 0.15em;
}

.profile-rating-stats__value-btn:hover,
.profile-rating-stats__value-btn:focus-visible {
  text-decoration-color: currentColor;
  outline: none;
}

.profile-rating-stats__value-btn.is-positive {
  color: #067647;
}

.profile-rating-stats__value-btn.is-negative {
  color: #b42318;
}

.profile-rating-stats__hint {
  font-size: 0.75rem;
  color: var(--color-text-muted, #666);
}

.profile-rating-stats__controls {
  display: flex;
  gap: 0.35rem;
  margin-top: 0.35rem;
}
</style>
