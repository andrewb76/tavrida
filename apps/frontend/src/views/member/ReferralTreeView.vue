<script setup lang="ts">
import { fetchPublicProfile, fetchReferralTree, publicProfileLabel, type ReferralUser, type PublicProfile } from '@/services/profile';
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

const route = useRoute();
const userId = computed(() => route.params.userId as string);

const profile = ref<PublicProfile | null>(null);
const referrals = ref<ReferralUser[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const l1 = computed(() => referrals.value.filter((r) => r.level === 1));
const l2 = computed(() => referrals.value.filter((r) => r.level === 2));

function referralLabel(r: ReferralUser): string {
  return publicProfileLabel(r);
}

onMounted(async () => {
  loading.value = true;
  error.value = null;
  try {
    const [p, tree] = await Promise.all([
      fetchPublicProfile(userId.value),
      fetchReferralTree(userId.value),
    ]);
    profile.value = p;
    referrals.value = tree;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section class="ref-tree">
    <header class="ref-tree__header">
      <RouterLink
        :to="{ name: 'profile-user', params: { userId } }"
        class="ref-tree__back"
      >
        ← Профиль
      </RouterLink>
    </header>

    <h1>Реферальное дерево</h1>
    <p
      v-if="profile"
      class="ref-tree__subtitle"
    >
      {{ referralLabel(profile) }}
    </p>

    <p
      v-if="loading"
      class="ref-tree__state"
    >
      Загрузка…
    </p>
    <p
      v-else-if="error"
      class="ref-tree__state ref-tree__state--error"
    >
      {{ error }}
    </p>

    <template v-else>
      <div class="ref-tree__section">
        <h2>Приглашённые ({{ l1.length }})</h2>
        <p
          v-if="!l1.length"
          class="ref-tree__empty"
        >
          Пока никого не пригласил.
        </p>
        <ul
          v-else
          class="ref-tree__list"
        >
          <li
            v-for="user in l1"
            :key="user.userId"
            class="ref-tree__item"
          >
            <RouterLink
              :to="{ name: 'profile-user', params: { userId: user.userId } }"
              class="ref-tree__link"
            >
              <img
                v-if="user.avatarUrl"
                :src="user.avatarUrl"
                :alt="referralLabel(user)"
                class="ref-tree__avatar"
              />
              <span
                v-else
                class="ref-tree__avatar ref-tree__avatar--placeholder"
              >{{ referralLabel(user)[0]?.toUpperCase() }}</span>
              <span class="ref-tree__name">{{ referralLabel(user) }}</span>
            </RouterLink>
          </li>
        </ul>
      </div>

      <div
        v-if="l2.length"
        class="ref-tree__section"
      >
        <h2>Приглашены приглашёнными ({{ l2.length }})</h2>
        <ul class="ref-tree__list">
          <li
            v-for="user in l2"
            :key="user.userId"
            class="ref-tree__item"
          >
            <RouterLink
              :to="{ name: 'profile-user', params: { userId: user.userId } }"
              class="ref-tree__link"
            >
              <img
                v-if="user.avatarUrl"
                :src="user.avatarUrl"
                :alt="referralLabel(user)"
                class="ref-tree__avatar"
              />
              <span
                v-else
                class="ref-tree__avatar ref-tree__avatar--placeholder"
              >{{ referralLabel(user)[0]?.toUpperCase() }}</span>
              <span class="ref-tree__name">{{ referralLabel(user) }}</span>
            </RouterLink>
          </li>
        </ul>
      </div>
    </template>
  </section>
</template>

<style scoped>
.ref-tree {
  display: grid;
  gap: 1rem;
  max-width: 720px;
}

.ref-tree__header {
  display: flex;
  align-items: center;
}

.ref-tree__back {
  color: var(--color-primary);
  text-decoration: none;
}

.ref-tree h1 {
  margin: 0;
  font-size: 1.5rem;
}

.ref-tree__subtitle {
  margin: 0;
  color: var(--color-text-muted);
}

.ref-tree__state {
  margin: 0;
  padding: 1.5rem 0;
  text-align: center;
  color: var(--color-text-muted);
}

.ref-tree__state--error {
  color: var(--color-error);
}

.ref-tree__section {
  display: grid;
  gap: 0.5rem;
}

.ref-tree__section h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.ref-tree__empty {
  margin: 0;
  color: var(--color-text-muted);
}

.ref-tree__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.35rem;
}

.ref-tree__item {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
}

.ref-tree__link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.85rem;
  text-decoration: none;
  color: inherit;
}

.ref-tree__link:hover {
  background: var(--color-bg);
}

.ref-tree__avatar {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 999px;
  object-fit: cover;
  flex-shrink: 0;
}

.ref-tree__avatar--placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary);
  color: var(--color-primary-fg);
  font-size: 0.8rem;
  font-weight: 600;
}

.ref-tree__name {
  font-weight: 500;
  color: var(--color-text);
}
</style>
