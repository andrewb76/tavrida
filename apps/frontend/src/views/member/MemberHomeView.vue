<script setup lang="ts">
import { listAuctions, type AuctionCard } from '@/services/auctions';
import { listTopics, type TopicSummary } from '@/services/forum';
import { formatMoney } from '@/services/wallet';
import { useSessionStore } from '@/stores/session';
import { imageProxyPresets, proxiedMediaUrl } from '@/utils/imageProxy';
import { UiButton } from '@tavrida/ui';
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';

const session = useSessionStore();

const liveAuctions = ref<AuctionCard[]>([]);
const topics = ref<TopicSummary[]>([]);
const loadingLive = ref(true);
const loadingForum = ref(true);
const liveError = ref<string | null>(null);
const forumError = ref<string | null>(null);

const greetingName = computed(() => {
  const name = session.isImpersonating
    ? session.actAsDisplayName
    : session.displayName;
  return name?.trim() || 'коллега';
});

const hourLabel = computed(() => {
  const h = new Date().getHours();
  if (h < 6) return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
});

function money(amount: number, currency: string) {
  return formatMoney(amount, currency);
}

function thumb(url: string | null) {
  if (!url) return undefined;
  return proxiedMediaUrl(url, imageProxyPresets.auctionCatalogThumb);
}

function endsLabel(endsAt: string | null) {
  if (!endsAt) return null;
  const end = new Date(endsAt).getTime();
  const ms = end - Date.now();
  if (ms <= 0) return 'завершается';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 48) return `ещё ${Math.floor(h / 24)} д`;
  if (h >= 1) return `ещё ${h} ч ${m} мин`;
  return `ещё ${m} мин`;
}

async function loadLive() {
  loadingLive.value = true;
  liveError.value = null;
  try {
    const res = await listAuctions({
      status: 'ACTIVE',
      sort: 'ENDING_SOON',
      limit: 6,
    });
    liveAuctions.value = res.items.slice(0, 6);
  } catch (e) {
    liveError.value = e instanceof Error ? e.message : 'Не удалось загрузить лоты';
    liveAuctions.value = [];
  } finally {
    loadingLive.value = false;
  }
}

async function loadForum() {
  loadingForum.value = true;
  forumError.value = null;
  try {
    const list = await listTopics();
    topics.value = list.slice(0, 5);
  } catch (e) {
    forumError.value = e instanceof Error ? e.message : 'Не удалось загрузить форум';
    topics.value = [];
  } finally {
    loadingForum.value = false;
  }
}

onMounted(() => {
  void loadLive();
  void loadForum();
});
</script>

<template>
  <div class="member-home space-y-10">
    <header class="member-home__hero">
      <p class="member-home__eyebrow">
        {{ hourLabel }}
      </p>
      <h1 class="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        {{ greetingName }}
      </h1>
      <p class="mt-2 max-w-xl text-text-muted">
        Живые торги, свежие темы и быстрый путь к кошельку — всё, что нужно сегодня в клубе.
      </p>

      <div class="member-home__shortcuts mt-5">
        <RouterLink
          to="/auctions"
          class="member-home__chip"
        >
          Аукционы
        </RouterLink>
        <RouterLink
          to="/forum"
          class="member-home__chip"
        >
          Форум
        </RouterLink>
        <RouterLink
          to="/marketplace"
          class="member-home__chip"
        >
          Маркет
        </RouterLink>
        <RouterLink
          to="/wallet"
          class="member-home__chip"
        >
          Кошелёк
        </RouterLink>
        <RouterLink
          to="/plans"
          class="member-home__chip member-home__chip--ghost"
        >
          Тарифы
        </RouterLink>
      </div>
    </header>

    <section
      class="space-y-4"
      aria-labelledby="live-heading"
    >
      <div class="flex items-end justify-between gap-3">
        <div>
          <p class="text-xs font-medium uppercase tracking-wider text-[color:var(--landing-patina,#1f7a6e)]">
            Сейчас
          </p>
          <h2
            id="live-heading"
            class="font-display text-xl font-semibold tracking-tight"
          >
            Живые лоты
          </h2>
        </div>
        <RouterLink
          to="/auctions"
          class="text-sm font-medium text-primary hover:underline"
        >
          Весь каталог
        </RouterLink>
      </div>

      <div
        v-if="loadingLive"
        class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        aria-busy="true"
      >
        <div
          v-for="n in 3"
          :key="n"
          class="member-home__skel h-36 rounded-lg bg-surface/80"
        />
      </div>

      <div
        v-else-if="liveError"
        class="rounded-lg border border-border bg-surface/90 px-4 py-3 text-sm text-text-muted"
      >
        <p>{{ liveError }}</p>
        <UiButton
          class="mt-3"
          intent="secondary"
          size="sm"
          @click="loadLive"
        >
          Повторить
        </UiButton>
      </div>

      <p
        v-else-if="!liveAuctions.length"
        class="rounded-lg border border-dashed border-border bg-surface/60 px-4 py-6 text-sm text-text-muted"
      >
        Пока тишина. Создай первый лот или загляни позже.
        <RouterLink
          to="/auctions/new"
          class="ml-1 font-medium text-primary hover:underline"
        >
          Выставить лот
        </RouterLink>
      </p>

      <ul
        v-else
        class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        <li
          v-for="lot in liveAuctions"
          :key="lot.id"
        >
          <RouterLink
            :to="`/auctions/${lot.id}`"
            class="member-home__lot group"
          >
            <div
              class="member-home__lot-media"
              :class="thumb(lot.thumbnailUrl) ? '' : 'member-home__lot-media--empty'"
            >
              <img
                v-if="thumb(lot.thumbnailUrl)"
                :src="thumb(lot.thumbnailUrl)!"
                :alt="lot.title"
                class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                loading="lazy"
                decoding="async"
              >
              <span
                v-if="lot.isLive"
                class="member-home__live"
              >Live</span>
            </div>
            <div class="p-3">
              <h3 class="line-clamp-2 text-sm font-semibold text-text group-hover:text-primary">
                {{ lot.title }}
              </h3>
              <p class="mt-1 tabular-nums text-sm text-text">
                {{ money(lot.currentPrice, lot.currency) }}
                <span
                  v-if="lot.bidCount"
                  class="ml-1 text-text-muted"
                >· {{ lot.bidCount }} ставки</span>
              </p>
              <p
                v-if="endsLabel(lot.endsAt)"
                class="mt-0.5 text-xs text-text-muted"
              >
                {{ endsLabel(lot.endsAt) }}
              </p>
            </div>
          </RouterLink>
        </li>
      </ul>
    </section>

    <section
      class="space-y-4"
      aria-labelledby="forum-heading"
    >
      <div class="flex items-end justify-between gap-3">
        <div>
          <p class="text-xs font-medium uppercase tracking-wider text-[color:var(--landing-patina,#1f7a6e)]">
            Форум
          </p>
          <h2
            id="forum-heading"
            class="font-display text-xl font-semibold tracking-tight"
          >
            Новые темы
          </h2>
        </div>
        <RouterLink
          to="/forum"
          class="text-sm font-medium text-primary hover:underline"
        >
          Весь форум
        </RouterLink>
      </div>

      <div
        v-if="loadingForum"
        class="space-y-2"
        aria-busy="true"
      >
        <div
          v-for="n in 3"
          :key="n"
          class="member-home__skel h-14 rounded-md bg-surface/80"
        />
      </div>

      <div
        v-else-if="forumError"
        class="rounded-lg border border-border bg-surface/90 px-4 py-3 text-sm text-text-muted"
      >
        <p>{{ forumError }}</p>
        <UiButton
          class="mt-3"
          intent="secondary"
          size="sm"
          @click="loadForum"
        >
          Повторить
        </UiButton>
      </div>

      <p
        v-else-if="!topics.length"
        class="rounded-lg border border-dashed border-border bg-surface/60 px-4 py-6 text-sm text-text-muted"
      >
        Тем пока нет.
        <RouterLink
          to="/forum/new"
          class="ml-1 font-medium text-primary hover:underline"
        >
          Начать обсуждение
        </RouterLink>
      </p>

      <ul
        v-else
        class="divide-y divide-border border-y border-border"
      >
        <li
          v-for="topic in topics"
          :key="topic.id"
        >
          <RouterLink
            :to="`/forum/topics/${topic.id}`"
            class="flex flex-col gap-0.5 py-3.5 transition-colors hover:bg-surface/50 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
          >
            <span class="font-medium text-text hover:text-primary">
              {{ topic.title }}
            </span>
            <span class="shrink-0 text-xs text-text-muted">
              {{
                topic.author?.displayName
                  || topic.author?.username
                  || 'участник'
              }}
            </span>
          </RouterLink>
        </li>
      </ul>

      <div class="pt-1">
        <RouterLink to="/forum/new">
          <UiButton
            intent="secondary"
            size="sm"
          >
            Новая тема
          </UiButton>
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.member-home__eyebrow {
  margin: 0 0 0.35rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #1f7a6e;
}

html[data-theme='dark'] .member-home__eyebrow {
  color: #3d9b8e;
}

.member-home__shortcuts {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.member-home__chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  border: 1px solid var(--token-border);
  background: color-mix(in srgb, var(--token-surface) 88%, transparent);
  padding: 0.65rem 1.15rem;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.25;
  color: var(--token-text);
  text-decoration: none;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    color 0.15s ease;
}

.member-home__chip:hover {
  border-color: color-mix(in srgb, var(--token-primary) 45%, var(--token-border));
  color: var(--token-primary);
}

.member-home__chip--ghost {
  background: transparent;
  color: var(--token-text-muted);
}

.member-home__lot {
  display: block;
  overflow: hidden;
  border-radius: 0.75rem;
  border: 1px solid var(--token-border);
  background: color-mix(in srgb, var(--token-surface) 92%, transparent);
  text-decoration: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.2s ease;
}

.member-home__lot:hover {
  border-color: color-mix(in srgb, var(--token-primary) 40%, var(--token-border));
  box-shadow: 0 8px 24px rgb(11 31 36 / 0.08);
}

.member-home__lot-media {
  position: relative;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  background: linear-gradient(145deg, #16333a, #0b1f24);
}

.member-home__lot-media--empty::after {
  content: 'Tavrida';
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-family: var(--token-font-display, Unbounded, system-ui, sans-serif);
  font-size: 0.85rem;
  letter-spacing: 0.04em;
  color: rgb(242 244 243 / 0.35);
}

.member-home__live {
  position: absolute;
  top: 0.55rem;
  left: 0.55rem;
  border-radius: 999px;
  background: #d94a2a;
  padding: 0.15rem 0.5rem;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #fff;
}

.member-home__skel {
  animation: member-home-pulse 1.2s ease-in-out infinite;
}

@keyframes member-home-pulse {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .member-home__skel {
    animation: none;
  }

  .member-home__lot img {
    transition: none;
  }
}
</style>
