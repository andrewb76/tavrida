<script setup lang="ts">
import type { CategoryNode } from '@/services/forum';
import ForumCategoryTreeNode from '@/components/forum/ForumCategoryTreeNode.vue';
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

const props = defineProps<{
  node: CategoryNode;
  depth: number;
  isAdmin: boolean;
  /** Collapsed category ids (home + admin share localStorage via parent). */
  collapsedIds: Set<string>;
  showCounts?: boolean;
}>();

const emit = defineEmits<{
  edit: [node: CategoryNode];
  addChild: [parent: CategoryNode];
  access: [node: CategoryNode];
  delete: [node: CategoryNode];
  toggleCollapse: [categoryId: string];
}>();

const hasChildren = computed(() => props.node.children.length > 0);
const isCollapsed = computed(() => props.collapsedIds.has(props.node.id));
const topicsLink = computed(() => ({
  path: '/forum/topics',
  query: { categoryId: props.node.id },
}));

const topicCount = computed(() => props.node.topicCount ?? 0);
const commentCount = computed(() => props.node.commentCount ?? 0);

function onToggle() {
  emit('toggleCollapse', props.node.id);
}
</script>

<template>
  <li class="forum-category-node">
    <div
      class="forum-category-node__row"
      :style="{ paddingLeft: `${depth * 1.25}rem` }"
    >
      <div class="forum-category-node__main">
        <div class="forum-category-node__title-row">
          <button
            v-if="hasChildren"
            type="button"
            class="forum-category-node__toggle"
            :aria-expanded="!isCollapsed"
            :aria-label="isCollapsed ? 'Развернуть раздел' : 'Свернуть раздел'"
            @click="onToggle"
          >
            {{ isCollapsed ? '▸' : '▾' }}
          </button>
          <span
            v-else
            class="forum-category-node__toggle-spacer"
            aria-hidden="true"
          />
          <RouterLink
            :to="topicsLink"
            class="forum-category-node__link"
          >
            <strong>{{ node.title }}</strong>
            <span class="forum-category-node__slug">/{{ node.slug }}</span>
            <span
              v-if="node.restricted"
              class="forum-category-node__badge"
              title="Ограниченный доступ"
            >доступ</span>
          </RouterLink>
        </div>
        <p
          v-if="showCounts !== false"
          class="forum-category-node__counts"
        >
          {{ topicCount }} тем · {{ commentCount }} комментариев
        </p>
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
          class="forum-category-node__btn"
          @click="emit('access', node)"
        >
          Доступ
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
      v-if="hasChildren && !isCollapsed"
      class="forum-category-node__children"
    >
      <ForumCategoryTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        :is-admin="isAdmin"
        :collapsed-ids="collapsedIds"
        :show-counts="showCounts"
        @edit="emit('edit', $event)"
        @add-child="emit('addChild', $event)"
        @access="emit('access', $event)"
        @delete="emit('delete', $event)"
        @toggle-collapse="emit('toggleCollapse', $event)"
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

.forum-category-node__title-row {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
}

.forum-category-node__toggle {
  flex: none;
  width: 1.5rem;
  border: none;
  background: transparent;
  padding: 0;
  font-size: 0.95rem;
  line-height: 1.4;
  cursor: pointer;
  color: var(--color-text-muted, #666);
}

.forum-category-node__toggle:hover {
  color: var(--color-primary, #2563eb);
}

.forum-category-node__toggle-spacer {
  display: inline-block;
  width: 1.5rem;
  flex: none;
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

.forum-category-node__badge {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  background: var(--color-border, #e5e7eb);
  color: var(--color-text-muted, #666);
}

.forum-category-node__counts {
  margin: 0.25rem 0 0 1.75rem;
  font-size: 0.85rem;
  color: var(--color-text-muted, #666);
}

.forum-category-node__desc {
  margin: 0.35rem 0 0 1.75rem;
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
