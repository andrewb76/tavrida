<script setup lang="ts">
import { ref } from 'vue';

export type ProfileTab = 'overview' | 'posts' | 'comments' | 'activity';

defineProps<{
  counts?: { posts?: number; comments?: number };
}>();

const activeTab = ref<ProfileTab>('overview');

const tabs: Array<{ id: ProfileTab; label: string; key?: 'posts' | 'comments' }> = [
  { id: 'overview', label: 'Обзор' },
  { id: 'posts', label: 'Публикации', key: 'posts' },
  { id: 'comments', label: 'Комментарии', key: 'comments' },
  { id: 'activity', label: 'Активность' },
];

const emit = defineEmits<{ (e: 'update:tab', tab: ProfileTab): void }>();

function selectTab(tab: ProfileTab) {
  activeTab.value = tab;
  emit('update:tab', tab);
}
</script>

<template>
  <div class="profile-tabs">
    <div class="profile-tabs__nav" role="tablist">
      <button
        v-for="t in tabs"
        :key="t.id"
        type="button"
        role="tab"
        :aria-selected="activeTab === t.id"
        :class="['profile-tabs__btn', { 'profile-tabs__btn--active': activeTab === t.id }]"
        @click="selectTab(t.id)"
      >
        {{ t.label }}
        <span
          v-if="t.key && counts?.[t.key]"
          class="profile-tabs__badge"
        >{{ counts[t.key] }}</span>
      </button>
    </div>
    <div class="profile-tabs__content">
      <slot :name="activeTab" />
    </div>
  </div>
</template>

<style scoped>
.profile-tabs {
  width: 100%;
}

.profile-tabs__nav {
  display: flex;
  gap: 0.35rem;
  border-bottom: 1px solid var(--color-border, #333);
  overflow-x: auto;
}

.profile-tabs__btn {
  border: 0;
  background: transparent;
  padding: 0.65rem 1rem;
  cursor: pointer;
  color: var(--color-text-muted, #999);
  border-bottom: 2px solid transparent;
  font: inherit;
  font-size: 0.9rem;
  white-space: nowrap;
  transition: color 0.15s, border-color 0.15s;
}

.profile-tabs__btn:hover {
  color: var(--color-text, #eee);
}

.profile-tabs__btn--active {
  color: var(--color-primary, #38bdf8) !important;
  border-bottom-color: var(--color-primary, #38bdf8) !important;
  font-weight: 600;
}

.profile-tabs__badge {
  margin-left: 0.3rem;
  padding: 0.1rem 0.4rem;
  border-radius: 9999px;
  background: var(--color-primary, #38bdf8);
  color: var(--color-bg, #111);
  font-size: 0.7rem;
  font-weight: 600;
  line-height: 1;
}

.profile-tabs__content {
  padding-top: 1rem;
}
</style>
