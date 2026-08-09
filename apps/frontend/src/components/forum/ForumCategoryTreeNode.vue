<script setup lang="ts">
import type { CategoryNode } from '@/services/forum';
import ForumCategoryTreeNode from '@/components/forum/ForumCategoryTreeNode.vue';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
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

const menuOpen = ref(false);

const hasChildren = computed(() => props.node.children.length > 0);
const isCollapsed = computed(() => props.collapsedIds.has(props.node.id));
const topicsLink = computed(() => ({
  path: '/forum/topics',
  query: { categoryId: props.node.id },
}));

const topicCount = computed(() => props.node.topicCount ?? 0);
const commentCount = computed(() => props.node.commentCount ?? 0);

const indentStyle = computed(() => ({
  '--depth': String(props.depth),
}));

function onToggle() {
  emit('toggleCollapse', props.node.id);
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value;
}

function closeMenu() {
  menuOpen.value = false;
}

function runAction(action: 'addChild' | 'edit' | 'access' | 'delete') {
  closeMenu();
  if (action === 'addChild') emit('addChild', props.node);
  else if (action === 'edit') emit('edit', props.node);
  else if (action === 'access') emit('access', props.node);
  else if (action === 'delete') emit('delete', props.node);
}

function onDocClick(e: MouseEvent) {
  const target = e.target as HTMLElement | null;
  if (!target?.closest(`[data-category-actions="${props.node.id}"]`)) {
    closeMenu();
  }
}

onMounted(() => {
  document.addEventListener('click', onDocClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick);
});
</script>

<template>
  <li class="forum-category-node">
    <div
      class="forum-category-node__row"
      :style="indentStyle"
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
        :data-category-actions="node.id"
      >
        <button
          type="button"
          class="forum-category-node__menu-btn"
          :aria-expanded="menuOpen"
          aria-haspopup="menu"
          aria-label="Действия"
          title="Действия"
          @click="toggleMenu"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            class="forum-category-node__menu-icon"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="5"
              r="1.5"
            />
            <circle
              cx="12"
              cy="12"
              r="1.5"
            />
            <circle
              cx="12"
              cy="19"
              r="1.5"
            />
          </svg>
        </button>

        <div
          v-if="menuOpen"
          class="forum-category-node__menu"
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            @click="runAction('addChild')"
          >
            + Подраздел
          </button>
          <button
            type="button"
            role="menuitem"
            @click="runAction('edit')"
          >
            Изменить
          </button>
          <button
            type="button"
            role="menuitem"
            @click="runAction('access')"
          >
            Доступ
          </button>
          <button
            type="button"
            role="menuitem"
            class="forum-category-node__menu-danger"
            @click="runAction('delete')"
          >
            Удалить
          </button>
        </div>
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
  gap: 0.5rem;
  padding: 0.65rem 0;
  padding-left: calc(var(--depth, 0) * 0.85rem);
  border-bottom: 1px solid var(--color-border);
}

.forum-category-node__main {
  min-width: 0;
  flex: 1;
}

.forum-category-node__title-row {
  display: flex;
  align-items: flex-start;
  gap: 0.15rem;
}

.forum-category-node__toggle {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  min-height: 2.25rem;
  margin: -0.25rem 0;
  border: none;
  background: transparent;
  padding: 0;
  font-size: 0.95rem;
  line-height: 1;
  cursor: pointer;
  color: var(--color-text-muted);
  touch-action: manipulation;
}

.forum-category-node__toggle:hover {
  color: var(--color-primary);
}

.forum-category-node__toggle-spacer {
  display: inline-block;
  width: 2.25rem;
  flex: none;
}

.forum-category-node__link {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.35rem;
  padding-top: 0.35rem;
  text-decoration: none;
  color: inherit;
  min-width: 0;
}

.forum-category-node__link strong {
  word-break: break-word;
}

.forum-category-node__link:hover strong {
  color: var(--color-primary);
}

.forum-category-node__slug {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  word-break: break-all;
}

.forum-category-node__badge {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  background: var(--color-border);
  color: var(--color-text-muted);
}

.forum-category-node__counts {
  margin: 0.2rem 0 0 2.25rem;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.forum-category-node__desc {
  margin: 0.3rem 0 0 2.25rem;
  font-size: 0.85rem;
  color: var(--color-text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.forum-category-node__actions {
  position: relative;
  flex-shrink: 0;
}

.forum-category-node__menu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-text-muted);
  cursor: pointer;
  touch-action: manipulation;
}

.forum-category-node__menu-btn:hover,
.forum-category-node__menu-btn[aria-expanded='true'] {
  border-color: var(--color-primary);
  color: var(--color-text);
  background: var(--color-bg);
}

.forum-category-node__menu-icon {
  width: 1rem;
  height: 1rem;
}

.forum-category-node__menu {
  position: absolute;
  right: 0;
  z-index: 30;
  margin-top: 0.25rem;
  min-width: 11rem;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  box-shadow: var(--shadow-card, 0 8px 24px rgb(0 0 0 / 12%));
  padding: 0.25rem 0;
}

.forum-category-node__menu button {
  display: block;
  width: 100%;
  border: 0;
  background: transparent;
  padding: 0.7rem 0.9rem;
  text-align: left;
  font: inherit;
  font-size: 0.9rem;
  color: var(--color-text);
  cursor: pointer;
  touch-action: manipulation;
}

.forum-category-node__menu button:hover {
  background: var(--color-bg);
}

.forum-category-node__menu-danger:hover {
  color: var(--color-error);
}

@media (max-width: 640px) {
  .forum-category-node__row {
    padding-left: calc(var(--depth, 0) * 0.5rem);
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
  }

  .forum-category-node__slug {
    display: none;
  }

  .forum-category-node__desc {
    display: none;
  }

  .forum-category-node__counts {
    margin-left: 2.25rem;
  }
}
</style>
