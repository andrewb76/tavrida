<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { listCategories, type CategoryNode } from '@/services/forum';

const props = defineProps<{
  categoryId?: string;
  topicTitle?: string;
}>();

const categories = ref<CategoryNode[]>([]);

const categoryName = computed(() => {
  if (!props.categoryId) return null;
  const walk = (nodes: CategoryNode[]): string | null => {
    for (const node of nodes) {
      if (node.id === props.categoryId) return node.title;
      const found = walk(node.children);
      if (found) return found;
    }
    return null;
  };
  return walk(categories.value);
});

watch(
  () => props.categoryId,
  async (id) => {
    if (!id || categories.value.length) return;
    try {
      categories.value = await listCategories();
    } catch {
      /* silent */
    }
  },
  { immediate: true },
);
</script>

<template>
  <nav
    v-if="categoryId || topicTitle"
    class="forum-breadcrumbs"
    aria-label="Навигация по форуму"
  >
    <RouterLink
      to="/forum"
      class="forum-breadcrumbs__link"
    >
      Форум
    </RouterLink>
    <template v-if="categoryName">
      <span class="forum-breadcrumbs__sep">›</span>
      <RouterLink
        :to="{ name: 'forum-topics', query: { categoryId } }"
        class="forum-breadcrumbs__link"
      >
        {{ categoryName }}
      </RouterLink>
    </template>
    <template v-if="topicTitle">
      <span class="forum-breadcrumbs__sep">›</span>
      <span class="forum-breadcrumbs__current">{{ topicTitle }}</span>
    </template>
  </nav>
</template>

<style scoped>
.forum-breadcrumbs {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.25rem;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  margin-bottom: 0.75rem;
}

.forum-breadcrumbs__link {
  color: var(--color-primary);
  text-decoration: none;
}

.forum-breadcrumbs__link:hover {
  text-decoration: underline;
}

.forum-breadcrumbs__sep {
  margin: 0 0.15rem;
  opacity: 0.5;
}

.forum-breadcrumbs__current {
  color: var(--color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 40ch;
}
</style>
