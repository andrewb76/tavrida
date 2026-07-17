<script setup lang="ts">
import {
  forumAuthorLabel,
  getForumTag,
  getTopic,
  type TopicDetail,
} from '@/services/forum';
import { ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

const route = useRoute();
const loading = ref(true);
const error = ref<string | null>(null);
const tag = ref<Awaited<ReturnType<typeof getForumTag>> | null>(null);
const topics = ref<Array<Pick<TopicDetail, 'id' | 'title' | 'createdAt' | 'authorId' | 'author'>>>([]);

let loadGeneration = 0;

async function load(slug: string) {
  const generation = ++loadGeneration;
  loading.value = true;
  error.value = null;
  tag.value = null;
  topics.value = [];
  try {
    const row = await getForumTag(slug);
    if (generation !== loadGeneration) return;
    tag.value = row;
    const details = await Promise.all(
      row.topicIds.slice(0, 50).map(async (id) => {
        try {
          return await getTopic(id);
        } catch {
          return null;
        }
      }),
    );
    if (generation !== loadGeneration) return;
    topics.value = details.filter((t): t is TopicDetail => Boolean(t));
  } catch (e) {
    if (generation !== loadGeneration) return;
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить тег';
  } finally {
    if (generation === loadGeneration) loading.value = false;
  }
}

watch(
  () => String(route.params.slug ?? ''),
  (slug) => void load(slug),
  { immediate: true },
);
</script>

<template>
  <section class="tag-page">
    <header class="tag-page__header">
      <p class="tag-page__crumb">
        <RouterLink to="/forum">Форум</RouterLink>
        · тег
      </p>
      <h1 v-if="tag">#{{ tag.displayName }}</h1>
      <h1 v-else>Тег</h1>
      <p
        v-if="tag?.description"
        class="tag-page__desc"
      >
        {{ tag.description }}
      </p>
      <p
        v-else-if="tag"
        class="tag-page__muted"
      >
        Тем с этим тегом: {{ tag.topicIds.length }}
      </p>
    </header>

    <p
      v-if="loading"
      class="tag-page__muted"
    >
      Загрузка…
    </p>
    <p
      v-else-if="error"
      class="tag-page__error"
    >
      {{ error }}
    </p>
    <p
      v-else-if="!topics.length"
      class="tag-page__muted"
    >
      Пока нет тем с этим тегом.
    </p>
    <ul
      v-else
      class="tag-page__list"
    >
      <li
        v-for="topic in topics"
        :key="topic.id"
      >
        <RouterLink :to="`/forum/topics/${topic.id}`">
          {{ topic.title }}
        </RouterLink>
        <span class="tag-page__meta">
          {{ forumAuthorLabel(topic.author ?? { userId: topic.authorId, displayName: null, username: null, avatarUrl: null }) }}
          ·
          {{ new Date(topic.createdAt).toLocaleString('ru-RU') }}
        </span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.tag-page {
  display: grid;
  gap: 1.25rem;
}

.tag-page__header h1 {
  margin: 0.25rem 0 0;
}

.tag-page__crumb {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-muted, #667);
}

.tag-page__desc,
.tag-page__muted {
  margin: 0.5rem 0 0;
  color: var(--color-muted, #667);
}

.tag-page__error {
  color: var(--color-danger, #b00020);
}

.tag-page__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.75rem;
}

.tag-page__list a {
  font-weight: 600;
}

.tag-page__meta {
  display: block;
  margin-top: 0.2rem;
  font-size: 0.85rem;
  color: var(--color-muted, #667);
}
</style>
