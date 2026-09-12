<script setup lang="ts">
import { fetchReferralTree, publicProfileLabel, type ReferralUser } from '@/services/profile';
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';

const props = defineProps<{ userId: string }>();

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
    referrals.value = await fetchReferralTree(props.userId);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="profile-referral">
    <p
      v-if="loading"
      class="profile-referral__state"
    >
      Загрузка…
    </p>
    <p
      v-else-if="error"
      class="profile-referral__state profile-referral__state--error"
    >
      {{ error }}
    </p>

    <template v-else>
      <div class="profile-referral__section">
        <h3 class="profile-referral__heading">
          Приглашённые ({{ l1.length }})
        </h3>
        <p
          v-if="!l1.length"
          class="profile-referral__empty"
        >
          Пока никого не пригласил.
        </p>
        <ul
          v-else
          class="profile-referral__list"
        >
          <li
            v-for="user in l1"
            :key="user.userId"
            class="profile-referral__item"
          >
            <RouterLink
              :to="{ name: 'profile-user', params: { userId: user.userId } }"
              class="profile-referral__link"
            >
              <img
                v-if="user.avatarUrl"
                :src="user.avatarUrl"
                :alt="referralLabel(user)"
                class="profile-referral__avatar"
              >
              <span
                v-else
                class="profile-referral__avatar profile-referral__avatar--placeholder"
              >{{ referralLabel(user)[0]?.toUpperCase() }}</span>
              <span class="profile-referral__name">{{ referralLabel(user) }}</span>
            </RouterLink>
          </li>
        </ul>
      </div>

      <div
        v-if="l2.length"
        class="profile-referral__section"
      >
        <h3 class="profile-referral__heading">
          Приглашены приглашёнными ({{ l2.length }})
        </h3>
        <ul class="profile-referral__list">
          <li
            v-for="user in l2"
            :key="user.userId"
            class="profile-referral__item"
          >
            <RouterLink
              :to="{ name: 'profile-user', params: { userId: user.userId } }"
              class="profile-referral__link"
            >
              <img
                v-if="user.avatarUrl"
                :src="user.avatarUrl"
                :alt="referralLabel(user)"
                class="profile-referral__avatar"
              >
              <span
                v-else
                class="profile-referral__avatar profile-referral__avatar--placeholder"
              >{{ referralLabel(user)[0]?.toUpperCase() }}</span>
              <span class="profile-referral__name">{{ referralLabel(user) }}</span>
            </RouterLink>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>

<style scoped>
.profile-referral {
  display: grid;
  gap: 1rem;
}

.profile-referral__state {
  margin: 0;
  padding: 1.5rem 0;
  text-align: center;
  color: var(--color-text-muted, #999);
}

.profile-referral__state--error {
  color: var(--color-error, #ef4444);
}

.profile-referral__section {
  display: grid;
  gap: 0.5rem;
}

.profile-referral__heading {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text, #eee);
}

.profile-referral__empty {
  margin: 0;
  color: var(--color-text-muted, #999);
}

.profile-referral__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.35rem;
}

.profile-referral__item {
  border: 1px solid var(--color-border, #333);
  border-radius: 10px;
  background: var(--color-surface, #1a1a2e);
}

.profile-referral__link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.85rem;
  text-decoration: none;
  color: inherit;
}

.profile-referral__link:hover {
  background: var(--color-bg, #111);
}

.profile-referral__avatar {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 999px;
  object-fit: cover;
  flex-shrink: 0;
}

.profile-referral__avatar--placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary, #38bdf8);
  color: var(--color-primary-fg, #111);
  font-size: 0.8rem;
  font-weight: 600;
}

.profile-referral__name {
  font-weight: 500;
  color: var(--color-text, #eee);
}
</style>
