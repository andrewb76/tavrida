<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { listTopics, type TopicSummary } from '@/services/forum';

const props = defineProps<{ userId: string }>();

const topics = ref<TopicSummary[]>([]);
const loading = ref(false);

const topByVotes = computed(() =>
  [...topics.value]
    .sort((a, b) => (b.votePlusCount ?? 0) - (a.votePlusCount ?? 0))
    .slice(0, 3),
);

const topByComments = computed(() =>
  [...topics.value]
    .sort((a, b) => (b.commentCount ?? 0) - (a.commentCount ?? 0))
    .slice(0, 3),
);

async function load() {
  loading.value = true;
  try {
    const res = await listTopics({
      authorId: props.userId,
      status: 'PUBLISHED',
      limit: 50,
    });
    topics.value = res.data;
  } catch {
    // silent
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="profile-top">
    <p v-if="loading" class="profile-top__status">
      Загрузка…
    </p>
    <template v-else-if="topics.length > 0">
      <div v-if="topByVotes.length" class="profile-top__section">
        <h4 class="profile-top__heading">
          По голосам
        </h4>
        <ul class="profile-top__list">
          <li v-for="t in topByVotes" :key="t.id" class="profile-top__item">
            <RouterLink :to="{ name: 'forum-topic', params: { id: t.id } }" class="profile-top__link">
              {{ t.title }}
            </RouterLink>
            <span class="profile-top__stat">👍 {{ t.votePlusCount ?? 0 }}</span>
          </li>
        </ul>
      </div>
      <div v-if="topByComments.length" class="profile-top__section">
        <h4 class="profile-top__heading">
          По комментариям
        </h4>
        <ul class="profile-top__list">
          <li v-for="t in topByComments" :key="t.id" class="profile-top__item">
            <RouterLink :to="{ name: 'forum-topic', params: { id: t.id } }" class="profile-top__link">
              {{ t.title }}
            </RouterLink>
            <span class="profile-top__stat">💬 {{ t.commentCount ?? 0 }}</span>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>

<style scoped>
.profile-top__status {
  color: var(--color-text-muted, #999);
  font-size: 0.9rem;
  text-align: center;
  padding: 2rem 0;
}

.profile-top__section {
  margin-bottom: 1rem;
}

.profile-top__heading {
  margin: 0 0 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text, #eee);
}

.profile-top__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.profile-top__item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.4rem 0.65rem;
  border-radius: 0.375rem;
  background: var(--color-bg, #1a1a2e);
}

.profile-top__link {
  font-size: 0.85rem;
  color: var(--color-text, #eee);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-top__link:hover {
  color: var(--color-primary, #38bdf8);
}

.profile-top__stat {
  font-size: 0.8rem;
  color: var(--color-text-muted, #999);
  white-space: nowrap;
}
</style>
