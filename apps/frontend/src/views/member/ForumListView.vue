<script setup lang="ts">
import UserAvatar from '@/components/user/UserAvatar.vue';
import MarkdownBody from '@/components/media/MarkdownBody.vue';
import ForumBreadcrumbs from '@/components/forum/ForumBreadcrumbs.vue';
import { imageProxyPresets } from '@/utils/imageProxy';
import {
  forumAuthorLabel,
  listCategories,
  listTopics,
  type CategoryNode,
  type TopicSummary,
} from '@/services/forum';
import { UiButton, UiIcon } from '@tavrida/ui';
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useSessionStore } from '@/stores/session';

const route = useRoute();
const session = useSessionStore();

const topics = ref<TopicSummary[]>([]);
const categories = ref<CategoryNode[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const total = ref(0);
const page = ref(0);
const PAGE_SIZE = 20;

const draftsOnly = computed(() => route.query.status === 'DRAFT');

const categoryId = computed(() => {
  const raw = route.query.categoryId;
  return typeof raw === 'string' && raw ? raw : undefined;
});

const searchQ = computed(() => {
  const raw = route.query.q;
  return typeof raw === 'string' && raw.trim() ? raw.trim().slice(0, 100) : undefined;
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

async function load(
  selectedCategoryId: string | undefined,
  drafts: boolean,
  q: string | undefined,
  pageNum: number,
) {
  const generation = ++loadGeneration;
  loading.value = true;
  error.value = null;
  topics.value = [];
  try {
    const offset = pageNum * PAGE_SIZE;
    const [topicResult, categoryTree] = await Promise.all([
      listTopics({
        categoryId: selectedCategoryId,
        status: drafts ? 'DRAFT' : undefined,
        q,
        limit: PAGE_SIZE,
        offset,
      }),
      categories.value.length ? Promise.resolve(categories.value) : listCategories(),
    ]);
    if (
      generation !== loadGeneration ||
      selectedCategoryId !== categoryId.value ||
      drafts !== draftsOnly.value ||
      q !== searchQ.value ||
      pageNum !== page.value
    ) {
      return;
    }
    topics.value = topicResult.data;
    total.value = topicResult.total;
    if (!categories.value.length) categories.value = categoryTree;
  } catch (e) {
    if (generation !== loadGeneration) return;
    error.value = e instanceof Error ? e.message : 'Ошибка загрузки';
  } finally {
    if (generation === loadGeneration) loading.value = false;
  }
}

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)));

watch(
  [categoryId, draftsOnly, searchQ],
  () => {
    page.value = 0;
    void load(categoryId.value, draftsOnly.value, searchQ.value, 0);
  },
  { immediate: true },
);

function goToPage(p: number) {
  page.value = Math.max(0, Math.min(p, totalPages.value - 1));
  void load(categoryId.value, draftsOnly.value, searchQ.value, page.value);
}

function listQuery(extra: Record<string, string> = {}) {
  const query: Record<string, string> = { ...extra };
  if (draftsOnly.value && !('status' in extra)) query.status = 'DRAFT';
  if (searchQ.value && !('q' in extra)) query.q = searchQ.value;
  return { name: 'forum-topics' as const, query };
}

function clearCategoryFilter() {
  const query: Record<string, string> = {};
  if (draftsOnly.value) query.status = 'DRAFT';
  if (searchQ.value) query.q = searchQ.value;
  return { name: 'forum-topics' as const, query };
}

function clearSearchFilter() {
  const query: Record<string, string> = {};
  if (draftsOnly.value) query.status = 'DRAFT';
  if (categoryId.value) query.categoryId = categoryId.value;
  return { name: 'forum-topics' as const, query };
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
        <ForumBreadcrumbs :category-id="categoryId" />
        <h1>{{ draftsOnly ? 'Мои черновики' : 'Темы' }}</h1>
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
        <p
          v-if="searchQ"
          class="forum-list__filter"
        >
          Поиск:
          <strong>{{ searchQ }}</strong>
          <RouterLink
            :to="clearSearchFilter()"
            class="forum-list__filter-clear"
          >
            × сбросить
          </RouterLink>
        </p>
      </div>
      <div class="forum-list__actions">
        <RouterLink
          v-if="!draftsOnly && session.isMember"
          :to="listQuery({ status: 'DRAFT' })"
          class="forum-list__categories-link"
        >
          Мои черновики →
        </RouterLink>
        <RouterLink
          v-if="draftsOnly"
          to="/forum/topics"
          class="forum-list__categories-link"
        >
          ← К темам
        </RouterLink>
        <RouterLink
          v-if="session.isAdmin"
          to="/forum/categories"
          class="forum-list__categories-link"
        >
          Управление разделами →
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
      <template v-if="searchQ">
        По запросу ничего не найдено.
      </template>
      <template v-else-if="activeCategory">
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
            <UiIcon
              v-if="topic.isPinned"
              name="pin"
              :size="16"
              class="forum-list__pin-icon"
            />
            <strong>{{ topic.title }}</strong>
            <span
              v-if="topic.status === 'DRAFT'"
              class="forum-list__draft"
            >Черновик</span>
          </div>
          <div class="forum-list__excerpt">
            <MarkdownBody
              :body="topic.excerpt"
              :image-resize="imageProxyPresets.forumListThumb"
            />
          </div>
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
          <span
            v-if="topic.commentCount"
            class="forum-list__comments"
          >💬 {{ topic.commentCount }}</span>
        </RouterLink>
      </li>
    </ul>

    <div
      v-if="!loading && !error && topics.length > 0 && totalPages > 1"
      class="forum-list__pagination"
    >
      <UiButton
        intent="secondary"
        :disabled="page === 0"
        @click="goToPage(page - 1)"
      >
        ← Назад
      </UiButton>
      <span class="forum-list__page-info">
        {{ page + 1 }} / {{ totalPages }}
      </span>
      <UiButton
        intent="secondary"
        :disabled="page >= totalPages - 1"
        @click="goToPage(page + 1)"
      >
        Далее →
      </UiButton>
    </div>
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
  color: var(--color-primary);
  text-decoration: none;
}

.forum-list__categories-link:hover {
  text-decoration: underline;
}

.forum-list__lead {
  margin: 0.25rem 0 0;
  color: var(--color-text-muted);
}

.forum-list__filter {
  margin: 0.5rem 0 0;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.forum-list__filter-clear {
  margin-left: 0.5rem;
  color: var(--color-primary);
  text-decoration: none;
}

.forum-list__status,
.forum-list__error {
  margin: 0;
}

.forum-list__error {
  color: var(--color-error);
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
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.forum-list__card:hover {
  border-color: var(--color-primary);
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
  color: var(--color-text-muted);
}

.forum-list__author {
  font-weight: 600;
  color: var(--color-text);
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
  color: var(--color-text-muted);
}

.forum-list__excerpt {
  margin: 0.5rem 0 0;
  max-height: 5.5rem;
  overflow: hidden;
  color: var(--color-text-muted);
  font-size: 0.8125rem;
  line-height: 1.45;
}

.forum-list__excerpt :deep(.markdown-body) {
  margin: 0;
}

.forum-list__excerpt :deep(img) {
  max-width: 80px;
  max-height: 60px;
  border-radius: 4px;
  vertical-align: middle;
  margin: 0 0.25rem 0.15rem 0;
}

.forum-list__excerpt :deep(blockquote),
.forum-list__excerpt :deep(pre),
.forum-list__excerpt :deep(table) {
  display: none;
}

.forum-list__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  list-style: none;
  margin: 0.5rem 0 0;
  padding: 0;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.forum-list__pin-icon {
  flex: none;
  color: var(--color-text-muted);
}

.forum-list__draft {
  flex: none;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-warning);
  border: 1px solid color-mix(in srgb, var(--color-warning) 40%, transparent);
  border-radius: 4px;
  padding: 0.1rem 0.35rem;
}

.forum-list__comments {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.forum-list__pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding-top: 0.5rem;
}

.forum-list__page-info {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}
</style>
