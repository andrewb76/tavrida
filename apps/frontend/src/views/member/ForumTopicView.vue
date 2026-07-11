<script setup lang="ts">
import {
  createComment,
  getTopic,
  listComments,
  type ForumComment,
  type TopicDetail,
} from '@/services/forum';
import { UiButton } from '@tavrida/ui';
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const topicId = computed(() => route.params.id as string);

const topic = ref<TopicDetail | null>(null);
const comments = ref<ForumComment[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const commentBody = ref('');
const posting = ref(false);
const postError = ref<string | null>(null);

onMounted(load);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const [topicRow, commentRows] = await Promise.all([
      getTopic(topicId.value),
      listComments(topicId.value),
    ]);
    topic.value = topicRow;
    comments.value = commentRows;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка загрузки';
  } finally {
    loading.value = false;
  }
}

async function submitComment() {
  if (!commentBody.value.trim()) return;
  posting.value = true;
  postError.value = null;
  try {
    const created = await createComment(topicId.value, { body: commentBody.value.trim() });
    comments.value = [...comments.value, created];
    commentBody.value = '';
  } catch (e) {
    postError.value = e instanceof Error ? e.message : 'Не удалось отправить';
  } finally {
    posting.value = false;
  }
}
</script>

<template>
  <section class="forum-topic">
    <p v-if="loading" class="forum-topic__status">Загрузка…</p>
    <p v-else-if="error" class="forum-topic__error">{{ error }}</p>

    <template v-else-if="topic">
      <article class="forum-topic__head">
        <h1>{{ topic.title }}</h1>
        <p class="forum-topic__meta">
          {{ new Date(topic.createdAt).toLocaleString('ru-RU') }}
        </p>
        <div class="forum-topic__body">{{ topic.body }}</div>
      </article>

      <section class="forum-topic__comments">
        <h2>Комментарии ({{ comments.length }})</h2>
        <ul class="forum-topic__comment-list">
          <li v-for="comment in comments" :key="comment.id">
            <p>{{ comment.body }}</p>
            <small>{{ new Date(comment.createdAt).toLocaleString('ru-RU') }}</small>
          </li>
        </ul>

        <form class="forum-topic__form" @submit.prevent="submitComment">
          <label>
            Ваш комментарий
            <textarea v-model="commentBody" rows="4" required />
          </label>
          <p v-if="postError" class="forum-topic__error">{{ postError }}</p>
          <UiButton intent="primary" type="submit" :disabled="posting">
            {{ posting ? 'Отправка…' : 'Ответить' }}
          </UiButton>
        </form>
      </section>
    </template>
  </section>
</template>

<style scoped>
.forum-topic {
  display: grid;
  gap: 1.5rem;
}

.forum-topic__head,
.forum-topic__comments {
  border: 1px solid var(--color-border, #ddd);
  border-radius: 8px;
  padding: 1rem;
}

.forum-topic__meta {
  color: var(--color-text-muted, #666);
}

.forum-topic__body {
  white-space: pre-wrap;
}

.forum-topic__comment-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.75rem;
}

.forum-topic__form {
  display: grid;
  gap: 0.75rem;
  margin-top: 1rem;
}

.forum-topic__form textarea {
  width: 100%;
  margin-top: 0.25rem;
}

.forum-topic__error {
  color: #b42318;
}
</style>
