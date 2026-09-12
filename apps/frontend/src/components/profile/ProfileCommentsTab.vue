<script setup lang="ts">
import { ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { listCommentsByAuthor, type ForumComment } from '@/services/forum';

const props = defineProps<{ userId: string }>();

const comments = ref<ForumComment[]>([]);
const total = ref(0);
const loading = ref(false);
const error = ref<string | null>(null);
const page = ref(0);
const pageSize = 20;

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const res = await listCommentsByAuthor(props.userId, {
      limit: pageSize,
      offset: page.value * pageSize,
    });
    comments.value = res.data;
    total.value = res.total;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить комментарии';
  } finally {
    loading.value = false;
  }
}

watch(() => props.userId, load, { immediate: true });
</script>

<template>
  <div class="profile-comments">
    <p v-if="loading" class="profile-comments__status">
      Загрузка…
    </p>
    <p v-else-if="error" class="profile-comments__status profile-comments__status--error">
      {{ error }}
    </p>
    <p v-else-if="comments.length === 0" class="profile-comments__status">
      Комментариев пока нет
    </p>
    <template v-else>
      <ul class="profile-comments__list">
        <li v-for="c in comments" :key="c.id" class="profile-comments__item">
          <RouterLink
            :to="{ name: 'forum-topic', params: { id: c.topicId } }"
            class="profile-comments__topic-link"
          >
            Тема #{{ c.topicId.slice(0, 8) }}
          </RouterLink>
          <p class="profile-comments__body">
            {{ c.body }}
          </p>
          <div class="profile-comments__meta">
            <span v-if="c.votePlusCount || c.voteMinusCount" class="profile-comments__votes">
              ▲ {{ c.votePlusCount }} ▼ {{ c.voteMinusCount }}
            </span>
            <span class="profile-comments__date">{{ new Date(c.createdAt).toLocaleString('ru-RU') }}</span>
          </div>
        </li>
      </ul>
      <div v-if="total > pageSize" class="profile-comments__pager">
        <button
          type="button"
          :disabled="page === 0"
          class="profile-comments__page-btn"
          @click="page--; load()"
        >
          ← Назад
        </button>
        <span class="profile-comments__page-info">{{ page + 1 }} / {{ Math.ceil(total / pageSize) }}</span>
        <button
          type="button"
          :disabled="(page + 1) * pageSize >= total"
          class="profile-comments__page-btn"
          @click="page++; load()"
        >
          Вперёд →
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.profile-comments__status {
  color: var(--color-text-muted, #999);
  font-size: 0.9rem;
  text-align: center;
  padding: 2rem 0;
}

.profile-comments__status--error {
  color: var(--color-error, #ef4444);
}

.profile-comments__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.profile-comments__item {
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-border, #333);
  border-radius: 0.5rem;
  background: var(--color-bg, #1a1a2e);
}

.profile-comments__topic-link {
  font-size: 0.8rem;
  color: var(--color-primary, #38bdf8);
  text-decoration: none;
}

.profile-comments__topic-link:hover {
  text-decoration: underline;
}

.profile-comments__body {
  margin: 0.4rem 0 0;
  font-size: 0.9rem;
  color: var(--color-text, #eee);
  white-space: pre-wrap;
  word-break: break-word;
}

.profile-comments__meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.4rem;
  font-size: 0.8rem;
  color: var(--color-text-muted, #999);
}

.profile-comments__votes {
  font-size: 0.75rem;
}

.profile-comments__pager {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
}

.profile-comments__page-btn {
  border: 1px solid var(--color-border, #333);
  background: var(--color-surface, #222);
  color: var(--color-text, #eee);
  padding: 0.35rem 0.75rem;
  border-radius: 0.375rem;
  cursor: pointer;
  font: inherit;
  font-size: 0.85rem;
}

.profile-comments__page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.profile-comments__page-info {
  font-size: 0.85rem;
  color: var(--color-text-muted, #999);
}
</style>
