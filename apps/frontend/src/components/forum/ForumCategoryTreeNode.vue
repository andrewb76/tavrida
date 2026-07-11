<script setup lang="ts">
import type { CategoryNode } from '@/services/forum';
import ForumCategoryTreeNode from '@/components/forum/ForumCategoryTreeNode.vue';
import { RouterLink } from 'vue-router';

defineProps<{
  node: CategoryNode;
  depth: number;
  isAdmin: boolean;
}>();

const emit = defineEmits<{
  edit: [node: CategoryNode];
  addChild: [parent: CategoryNode];
  delete: [node: CategoryNode];
}>();
</script>

<template>
  <li class="forum-category-node">
    <div
      class="forum-category-node__row"
      :style="{ paddingLeft: `${depth * 1.25}rem` }"
    >
      <div class="forum-category-node__main">
        <RouterLink
          :to="`/forum?categoryId=${node.id}`"
          class="forum-category-node__link"
        >
          <strong>{{ node.title }}</strong>
          <span class="forum-category-node__slug">/{{ node.slug }}</span>
        </RouterLink>
        <p
          v-if="node.description"
          class="forum-category-node__desc"
        >
          {{ node.description }}
        </p>
      </div>

      <div
        v-if="isAdmin"
        class="forum-category-node__actions"
      >
        <button
          type="button"
          class="forum-category-node__btn"
          @click="emit('addChild', node)"
        >
          + Подраздел
        </button>
        <button
          type="button"
          class="forum-category-node__btn"
          @click="emit('edit', node)"
        >
          Изменить
        </button>
        <button
          type="button"
          class="forum-category-node__btn forum-category-node__btn--danger"
          @click="emit('delete', node)"
        >
          Удалить
        </button>
      </div>
    </div>

    <ul
      v-if="node.children.length"
      class="forum-category-node__children"
    >
      <ForumCategoryTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        :is-admin="isAdmin"
        @edit="emit('edit', $event)"
        @add-child="emit('addChild', $event)"
        @delete="emit('delete', $event)"
      />
    </ul>
  </li>
</template>

<style scoped>
.forum-category-node {
  list-style: none;
}

.forum-category-node__children {
  list-style: none;
  margin: 0;
  padding: 0;
}

.forum-category-node__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
}

.forum-category-node__main {
  min-width: 0;
}

.forum-category-node__link {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.35rem;
  text-decoration: none;
  color: inherit;
}

.forum-category-node__link:hover strong {
  color: var(--color-primary, #2563eb);
}

.forum-category-node__slug {
  font-size: 0.85rem;
  color: var(--color-text-muted, #666);
}

.forum-category-node__desc {
  margin: 0.35rem 0 0;
  font-size: 0.9rem;
  color: var(--color-text-muted, #666);
}

.forum-category-node__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  flex-shrink: 0;
}

.forum-category-node__btn {
  border: 1px solid var(--color-border, #ddd);
  border-radius: 6px;
  background: var(--color-bg, #fff);
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
  cursor: pointer;
}

.forum-category-node__btn:hover {
  border-color: var(--color-primary, #2563eb);
}

.forum-category-node__btn--danger:hover {
  border-color: #b42318;
  color: #b42318;
}
</style>
