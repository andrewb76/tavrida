<script setup lang="ts">
import UserAvatar from '@/components/user/UserAvatar.vue';
import {
  forumAuthorLabel,
  listCategories,
  listTopics,
  type CategoryNode,
  type TopicSummary,
} from '@/services/forum';
import { UiButton } from '@tavrida/ui';
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useSessionStore } from '@/stores/session';

const route = useRoute();
const session = useSessionStore();

const topics = ref<TopicSummary[]>([]);
const categories = ref<CategoryNode[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const draftsOnly = computed(() => route.query.status === 'DRAFT');

const categoryId = computed(() => {
  const raw = route.query.categoryId;
  return typeof raw === 'string' && raw ? raw : undefined;
});

const activeCategory = computed(() => {
  if (!categoryId.value) return null;
  const walk = (nodes: CategoryNode[]): CategoryNode | null => {
    for (const node of nodes) {
      if (node.id === categoryId.value) return node;
      const found = walk(node.children);
      if (found) return found;
    }
    return null;
  };
  return walk(categories.value);
});

let loadGeneration = 0;

async function load(selectedCategoryId: string | undefined, drafts: boolean) {
  const generation = ++loadGeneration;
  loading.value = true;
  error.value = null;
  topics.value = [];
  try {
    const [topicList, categoryTree] = await Promise.all([
      listTopics({
        categoryId: selectedCategoryId,
        status: drafts ? 'DRAFT' : undefined,
      }),
      categories.value.length ? Promise.resolve(categories.value) : listCategories(),
    ]);
    if (
      generation !== loadGeneration ||
      selectedCategoryId !== categoryId.value ||
      drafts !== draftsOnly.value
    ) {
      return;
    }
    topics.value = topicList;
    if (!categories.value.length) categories.value = categoryTree;
  } catch (e) {
    if (generation !== loadGeneration) return;
    error.value = e instanceof Error ? e.message : 'Ошибка загрузки';
  } finally {
    if (generation === loadGeneration) loading.value = false;
  }
}

watch(
  [categoryId, draftsOnly],
  ([id, drafts]) => void load(id, drafts),
  { immediate: true },
);

function clearCategoryFilter() {
  return draftsOnly.value ? { path: '/forum', query: { status: 'DRAFT' } } : { path: '/forum' };
}

function authorOf(topic: TopicSummary) {
  return (
    topic.author ?? {
      userId: topic.authorId,
      displayName: null,
      username: null,
      avatarUrl: null,
    }
  );
}
</script>

<template>
  <section class="forum-list">
    <header class="forum-list__header">
      <div>
        <h1>{{ draftsOnly ? 'Мои черновики' : 'Форум' }}</h1>
        <p class="forum-list__lead">
          <template v-if="draftsOnly">
            Черновики видны только вам. Опубликуйте тему, когда будете готовы.
          </template>
          <template v-else>
            Обсуждения клуба — темы и комментарии.
          </template>
        </p>
        <p
          v-if="activeCategory"
          class="forum-list__filter"
        >
          Раздел:
          <strong>{{ activeCategory.title }}</strong>
          <RouterLink
            :to="clearCategoryFilter()"
            class="forum-list__filter-clear"
          >
            × сбросить
          </RouterLink>
        </p>
      </div>
      <div class="forum-list__actions">
        <RouterLink
          v-if="!draftsOnly && session.isMember"
          :to="{ path: '/forum', query: { status: 'DRAFT' } }"
          class="forum-list__categories-link"
        >
          Мои черновики →
        </RouterLink>
        <RouterLink
          v-if="draftsOnly"
          to="/forum"
          class="forum-list__categories-link"
        >
          ← К форуму
        </RouterLink>
        <RouterLink
          to="/forum/categories"
          class="forum-list__categories-link"
        >
          Разделы →
        </RouterLink>
        <RouterLink to="/forum/new">
          <UiButton intent="primary">
            + Новая тема
          </UiButton>
        </RouterLink>
      </div>
    </header>

    <p
      v-if="loading"
      class="forum-list__status"
    >
      Загрузка…
    </p>
    <p
      v-else-if="error"
      class="forum-list__error"
    >
      {{ error }}
    </p>
    <p
      v-else-if="topics.length === 0"
      class="forum-list__status"
    >
      <template v-if="activeCategory">
        В этом разделе пока нет тем.
      </template>
      <template v-else-if="draftsOnly">
        Черновиков нет — сохраните тему как черновик при создании.
      </template>
      <template v-else>
        Пока нет тем — создайте первую.
      </template>
    </p>

    <ul
      v-else
      class="forum-list__items"
    >
      <li
        v-for="topic in topics"
        :key="topic.id"
        class="forum-list__card"
      >
        <div class="forum-list__item-head">
          <UserAvatar
            class="forum-list__avatar"
            :avatar-url="authorOf(topic).avatarUrl"
            :label="forumAuthorLabel(authorOf(topic))"
            :user-id="authorOf(topic).userId"
            size="sm"
          />
          <div class="forum-list__item-meta">
            <span class="forum-list__author">{{ forumAuthorLabel(authorOf(topic)) }}</span>
            <time>{{ new Date(topic.createdAt).toLocaleString('ru-RU') }}</time>
          </div>
        </div>
        <RouterLink
          :to="`/forum/topics/${topic.id}`"
          class="forum-list__item-body"
        >
          <div class="forum-list__title-row">
            <strong>{{ topic.title }}</strong>
            <span
              v-if="topic.status === 'DRAFT'"
              class="forum-list__draft"
            >Черновик</span>
            <span
              v-if="topic.isPinned"
              class="forum-list__pin"
            >📌</span>
          </div>
          <p>{{ topic.excerpt }}</p>
          <ul
            v-if="topic.tags?.length"
            class="forum-list__tags"
          >
            <li
              v-for="tag in topic.tags"
              :key="tag"
            >
              #{{ tag }}
            </li>
          </ul>
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

.forum-list__actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

.forum-list__categories-link {
  font-size: 0.9rem;
  color: var(--color-primary, #2563eb);
  text-decoration: none;
}

.forum-list__categories-link:hover {
  text-decoration: underline;
}

.forum-list__lead {
  margin: 0.25rem 0 0;
  color: var(--color-text-muted, #666);
}

.forum-list__filter {
  margin: 0.5rem 0 0;
  font-size: 0.9rem;
  color: var(--color-text-muted, #666);
}

.forum-list__filter-clear {
  margin-left: 0.5rem;
  color: var(--color-primary, #2563eb);
  text-decoration: none;
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

.forum-list__card {
  padding: 1rem;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 8px;
}

.forum-list__card:hover {
  border-color: var(--color-primary, #2563eb);
}

.forum-list__item-head {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-bottom: 0.5rem;
}

.forum-list__avatar {
  flex: none;
}

.forum-list__item-meta {
  display: grid;
  gap: 0.1rem;
  min-width: 0;
  font-size: 0.8125rem;
  color: var(--color-text-muted, #666);
}

.forum-list__author {
  font-weight: 600;
  color: var(--color-text, #111);
}

.forum-list__item-body {
  display: block;
  text-decoration: none;
  color: inherit;
}

.forum-list__title-row {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
}

.forum-list__item-body p {
  margin: 0.5rem 0 0;
  color: var(--color-text-muted, #666);
}

.forum-list__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  list-style: none;
  margin: 0.5rem 0 0;
  padding: 0;
  font-size: 0.75rem;
  color: var(--color-text-muted, #777);
}

.forum-list__pin {
  flex: none;
}

.forum-list__draft {
  flex: none;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-warning, #b8860b);
  border: 1px solid color-mix(in srgb, var(--color-warning, #b8860b) 40%, transparent);
  border-radius: 4px;
  padding: 0.1rem 0.35rem;
}
</style>
