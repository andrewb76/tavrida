<script setup lang="ts">
import ForumCategoryTreeNode from '@/components/forum/ForumCategoryTreeNode.vue';
import { useForumTreeCollapsed } from '@/composables/useForumTreeCollapsed';
import {
  flattenCategories,
  listCategories,
  type CategoryNode,
} from '@/services/forum';
import { useSessionStore } from '@/stores/session';
import { UiButton } from '@tavrida/ui';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';

const session = useSessionStore();
const router = useRouter();
const { collapsedIds, toggleCollapse } = useForumTreeCollapsed();

const tree = ref<CategoryNode[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const searchQ = ref('');
const filterCategoryId = ref('');

const flatCategories = computed(() => flattenCategories(tree.value));
const isAdmin = computed(() => session.isAdmin);

const POLL_MS = 30_000;
let pollTimer: ReturnType<typeof setInterval> | null = null;

async function loadTree(silent = false) {
  if (!silent) {
    loading.value = true;
    error.value = null;
  }
  try {
    tree.value = await listCategories();
  } catch (e) {
    if (!silent) {
      error.value = e instanceof Error ? e.message : 'Ошибка загрузки';
    }
  } finally {
    if (!silent) loading.value = false;
  }
}

function onVisibilityOrFocus() {
  if (document.visibilityState === 'visible') {
    void loadTree(true);
  }
}

function submitFilters() {
  const query: Record<string, string> = {};
  const q = searchQ.value.trim();
  if (q) query.q = q.slice(0, 100);
  if (filterCategoryId.value) query.categoryId = filterCategoryId.value;
  void router.push({ name: 'forum-topics', query });
}

onMounted(() => {
  void loadTree();
  document.addEventListener('visibilitychange', onVisibilityOrFocus);
  window.addEventListener('focus', onVisibilityOrFocus);
  pollTimer = setInterval(() => void loadTree(true), POLL_MS);
});

onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisibilityOrFocus);
  window.removeEventListener('focus', onVisibilityOrFocus);
  if (pollTimer) clearInterval(pollTimer);
});
</script>

<template>
  <section class="forum-home">
    <header class="forum-home__header">
      <div>
        <h1>Форум</h1>
        <p class="forum-home__lead">
          Разделы клуба — выберите категорию или найдите тему.
        </p>
      </div>
      <div class="forum-home__actions">
        <RouterLink
          v-if="session.isMember"
          :to="{ name: 'forum-topics', query: { status: 'DRAFT' } }"
          class="forum-home__link"
        >
          Мои черновики →
        </RouterLink>
        <RouterLink
          v-if="isAdmin"
          to="/forum/categories"
          class="forum-home__link"
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

    <form
      class="forum-home__filters"
      @submit.prevent="submitFilters"
    >
      <label class="forum-home__field">
        <span class="forum-home__label">Поиск</span>
        <input
          v-model="searchQ"
          type="search"
          maxlength="100"
          placeholder="Название или текст темы"
          class="forum-home__input"
        >
      </label>
      <label class="forum-home__field">
        <span class="forum-home__label">Раздел</span>
        <select
          v-model="filterCategoryId"
          class="forum-home__select"
        >
          <option value="">
            Все разделы
          </option>
          <option
            v-for="cat in flatCategories"
            :key="cat.id"
            :value="cat.id"
          >
            {{ cat.title }}
          </option>
        </select>
      </label>
      <UiButton
        intent="primary"
        type="submit"
      >
        Найти темы
      </UiButton>
    </form>

    <p
      v-if="loading"
      class="forum-home__status"
    >
      Загрузка…
    </p>
    <p
      v-else-if="error"
      class="forum-home__error"
    >
      {{ error }}
    </p>
    <p
      v-else-if="tree.length === 0"
      class="forum-home__status"
    >
      Разделов пока нет.
      <RouterLink
        v-if="isAdmin"
        to="/forum/categories"
      >
        Создать раздел
      </RouterLink>
    </p>
    <ul
      v-else
      class="forum-home__tree"
    >
      <ForumCategoryTreeNode
        v-for="node in tree"
        :key="node.id"
        :node="node"
        :depth="0"
        :is-admin="false"
        :collapsed-ids="collapsedIds"
        @toggle-collapse="toggleCollapse"
      />
    </ul>
  </section>
</template>

<style scoped>
.forum-home {
  display: grid;
  gap: 1.25rem;
}

.forum-home__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.forum-home__lead {
  margin: 0.25rem 0 0;
  color: var(--color-text-muted, #666);
}

.forum-home__actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

.forum-home__link {
  font-size: 0.9rem;
  color: var(--color-primary, #2563eb);
  text-decoration: none;
}

.forum-home__link:hover {
  text-decoration: underline;
}

.forum-home__filters {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 8px;
  background: var(--color-bg-subtle, #f9fafb);
}

.forum-home__field {
  display: grid;
  gap: 0.25rem;
  min-width: 12rem;
  flex: 1;
}

.forum-home__label {
  font-size: 0.8rem;
  color: var(--color-text-muted, #666);
}

.forum-home__input,
.forum-home__select {
  border: 1px solid var(--color-border, #ddd);
  border-radius: 6px;
  padding: 0.45rem 0.6rem;
  font: inherit;
  background: var(--color-bg, #fff);
}

.forum-home__status,
.forum-home__error {
  margin: 0;
}

.forum-home__error {
  color: #b42318;
}

.forum-home__tree {
  list-style: none;
  margin: 0;
  padding: 0;
}
</style>
