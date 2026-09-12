<script setup lang="ts">
import { ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { listTopics, type TopicSummary } from '@/services/forum';

const props = defineProps<{ userId: string }>();

const posts = ref<TopicSummary[]>([]);
const total = ref(0);
const loading = ref(false);
const error = ref<string | null>(null);
const page = ref(0);
const pageSize = 10;

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const res = await listTopics({
      authorId: props.userId,
      status: 'PUBLISHED',
      limit: pageSize,
      offset: page.value * pageSize,
    });
    posts.value = res.data;
    total.value = res.total;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить публикации';
  } finally {
    loading.value = false;
  }
}

watch(() => props.userId, load, { immediate: true });
</script>

<template>
  <div class="profile-posts">
    <p v-if="loading" class="profile-posts__status">
      Загрузка…
    </p>
    <p v-else-if="error" class="profile-posts__status profile-posts__status--error">
      {{ error }}
    </p>
    <p v-else-if="posts.length === 0" class="profile-posts__status">
      Публикаций пока нет
    </p>
    <template v-else>
      <ul class="profile-posts__list">
        <li v-for="post in posts" :key="post.id" class="profile-posts__item">
          <RouterLink
            :to="{ name: 'forum-topic', params: { id: post.id } }"
            class="profile-posts__link"
          >
            <span class="profile-posts__title">{{ post.title }}</span>
            <span class="profile-posts__meta">
              <span v-if="post.commentCount" class="profile-posts__comments">💬 {{ post.commentCount }}</span>
              <span class="profile-posts__date">{{ new Date(post.createdAt).toLocaleDateString('ru-RU') }}</span>
            </span>
          </RouterLink>
          <p v-if="post.excerpt" class="profile-posts__excerpt">
            {{ post.excerpt }}
          </p>
        </li>
      </ul>
      <div v-if="total > pageSize" class="profile-posts__pager">
        <button
          type="button"
          :disabled="page === 0"
          class="profile-posts__page-btn"
          @click="page--; load()"
        >
          ← Назад
        </button>
        <span class="profile-posts__page-info">{{ page + 1 }} / {{ Math.ceil(total / pageSize) }}</span>
        <button
          type="button"
          :disabled="(page + 1) * pageSize >= total"
          class="profile-posts__page-btn"
          @click="page++; load()"
        >
          Вперёд →
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.profile-posts__status {
  color: var(--color-text-muted, #999);
  font-size: 0.9rem;
  text-align: center;
  padding: 2rem 0;
}

.profile-posts__status--error {
  color: var(--color-error, #ef4444);
}

.profile-posts__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.profile-posts__item {
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-border, #333);
  border-radius: 0.5rem;
  background: var(--color-bg, #1a1a2e);
}

.profile-posts__link {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
  text-decoration: none;
}

.profile-posts__link:hover .profile-posts__title {
  color: var(--color-primary, #38bdf8);
}

.profile-posts__title {
  font-weight: 500;
  color: var(--color-text, #eee);
  transition: color 0.15s;
}

.profile-posts__meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.8rem;
  color: var(--color-text-muted, #999);
  white-space: nowrap;
}

.profile-posts__excerpt {
  margin: 0.4rem 0 0;
  font-size: 0.85rem;
  color: var(--color-text-muted, #999);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-posts__pager {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
}

.profile-posts__page-btn {
  border: 1px solid var(--color-border, #333);
  background: var(--color-surface, #222);
  color: var(--color-text, #eee);
  padding: 0.35rem 0.75rem;
  border-radius: 0.375rem;
  cursor: pointer;
  font: inherit;
  font-size: 0.85rem;
}

.profile-posts__page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.profile-posts__page-info {
  font-size: 0.85rem;
  color: var(--color-text-muted, #999);
}
</style>
