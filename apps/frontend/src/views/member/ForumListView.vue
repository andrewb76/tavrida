<script setup lang="ts">
import { listTopics, type TopicSummary } from '@/services/forum';
import { UiButton } from '@tavrida/ui';
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';

const topics = ref<TopicSummary[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    topics.value = await listTopics();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка загрузки';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section class="forum-list">
    <header class="forum-list__header">
      <div>
        <h1>Форум</h1>
        <p class="forum-list__lead">Обсуждения клуба — темы и комментарии.</p>
      </div>
      <RouterLink to="/forum/new">
        <UiButton intent="primary">+ Новая тема</UiButton>
      </RouterLink>
    </header>

    <p v-if="loading" class="forum-list__status">Загрузка…</p>
    <p v-else-if="error" class="forum-list__error">{{ error }}</p>
    <p v-else-if="topics.length === 0" class="forum-list__status">Пока нет тем — создайте первую.</p>

    <ul v-else class="forum-list__items">
      <li v-for="topic in topics" :key="topic.id">
        <RouterLink :to="`/forum/topics/${topic.id}`" class="forum-list__item">
          <strong>{{ topic.title }}</strong>
          <span v-if="topic.isPinned" class="forum-list__pin">📌</span>
          <p>{{ topic.excerpt }}</p>
          <small>{{ new Date(topic.createdAt).toLocaleString('ru-RU') }}</small>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.forum-list {
  display: grid;
  gap: 1.25rem;
}

.forum-list__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.forum-list__lead {
  margin: 0.25rem 0 0;
  color: var(--color-text-muted, #666);
}

.forum-list__status,
.forum-list__error {
  margin: 0;
}

.forum-list__error {
  color: #b42318;
}

.forum-list__items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.75rem;
}

.forum-list__item {
  display: block;
  padding: 1rem;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
}

.forum-list__item:hover {
  border-color: var(--color-primary, #2563eb);
}

.forum-list__item p {
  margin: 0.5rem 0;
  color: var(--color-text-muted, #666);
}

.forum-list__pin {
  margin-left: 0.5rem;
}
</style>
