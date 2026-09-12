<script setup lang="ts">
import { computed } from 'vue';
import type { PublicProfile } from '@/services/profile';
import type { UserSubscription } from '@/services/plans';

const props = defineProps<{
  profile: PublicProfile;
  subscription: UserSubscription | null;
  isMe: boolean;
}>();

type CompletionField = { label: string; done: boolean; weight: number };

const fields = computed<CompletionField[]>(() => [
  { label: 'Аватар', done: Boolean(props.profile.avatarUrl), weight: 2 },
  { label: 'Имя отображения', done: Boolean(props.profile.displayName?.trim()), weight: 2 },
  { label: 'Username', done: Boolean(props.profile.username?.trim()), weight: 2 },
  { label: 'Подписка', done: Boolean(props.subscription), weight: 3 },
]);

const score = computed(() => {
  const total = fields.value.reduce((s, f) => s + f.weight, 0);
  const done = fields.value.filter((f) => f.done).reduce((s, f) => s + f.weight, 0);
  return total > 0 ? Math.round((done / total) * 100) : 0;
});
</script>

<template>
  <div class="profile-completion">
    <div class="profile-completion__header">
      <span class="profile-completion__title">Заполненность профиля</span>
      <span class="profile-completion__percent">{{ score }}%</span>
    </div>
    <div class="profile-completion__bar">
      <div
        class="profile-completion__fill"
        :style="{ width: `${score}%` }"
      />
    </div>
    <ul class="profile-completion__list">
      <li
        v-for="f in fields"
        :key="f.label"
        class="profile-completion__item"
        :class="{ 'profile-completion__item--done': f.done }"
      >
        <span class="profile-completion__check">{{ f.done ? '✓' : '○' }}</span>
        {{ f.label }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.profile-completion {
  padding: 0.85rem 1rem;
  border: 1px solid var(--color-border, #333);
  border-radius: 0.5rem;
  background: var(--color-bg, #1a1a2e);
}

.profile-completion__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.profile-completion__title {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text, #eee);
}

.profile-completion__percent {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-primary, #38bdf8);
}

.profile-completion__bar {
  height: 6px;
  border-radius: 3px;
  background: var(--color-surface, #333);
  overflow: hidden;
  margin-bottom: 0.65rem;
}

.profile-completion__fill {
  height: 100%;
  border-radius: 3px;
  background: var(--color-primary, #38bdf8);
  transition: width 0.3s ease;
}

.profile-completion__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 1rem;
}

.profile-completion__item {
  font-size: 0.8rem;
  color: var(--color-text-muted, #999);
}

.profile-completion__item--done {
  color: var(--color-success, #22c55e);
}

.profile-completion__check {
  margin-right: 0.25rem;
}
</style>
