<script setup lang="ts">
import ForumCategoryTreeNode from '@/components/forum/ForumCategoryTreeNode.vue';
import { useForumTreeCollapsed } from '@/composables/useForumTreeCollapsed';
import {
  createCategory,
  deleteCategory,
  flattenCategories,
  listAccessGroups,
  listCategories,
  setCategoryAccessGroups,
  updateCategory,
  type AccessGroup,
  type CategoryFormInput,
  type CategoryNode,
} from '@/services/forum';
import { useSessionStore } from '@/stores/session';
import { UiButton, UiModal } from '@tavrida/ui';
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';

const session = useSessionStore();
const isAdmin = computed(() => session.isAdmin);
const { collapsedIds, toggleCollapse } = useForumTreeCollapsed();

const tree = ref<CategoryNode[]>([]);
const allGroups = ref<AccessGroup[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const saving = ref(false);
const formError = ref<string | null>(null);
const slugManual = ref(false);

type FormState = {
  mode: 'create' | 'edit';
  categoryId?: string;
  parentId: string | null;
  slug: string;
  title: string;
  description: string;
  sortOrder: number;
};

const form = ref<FormState | null>(null);
const formOpen = ref(false);

watch(formOpen, (open) => {
  if (!open && form.value) {
    form.value = null;
    formError.value = null;
    slugManual.value = false;
  }
});

type AccessState = {
  categoryId: string;
  title: string;
  selectedIds: Set<string>;
};

const access = ref<AccessState | null>(null);
const accessError = ref<string | null>(null);
const accessSaving = ref(false);

const parentTitle = computed(() => {
  if (!form.value?.parentId) return null;
  return flattenCategories(tree.value).find((c) => c.id === form.value?.parentId)?.title ?? null;
});

async function loadTree() {
  loading.value = true;
  error.value = null;
  try {
    tree.value = await listCategories();
    if (isAdmin.value) {
      allGroups.value = await listAccessGroups();
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка загрузки';
  } finally {
    loading.value = false;
  }
}

onMounted(loadTree);

function openCreateRoot() {
  access.value = null;
  slugManual.value = false;
  form.value = {
    mode: 'create',
    parentId: null,
    slug: '',
    title: '',
    description: '',
    sortOrder: 0,
  };
  formError.value = null;
  formOpen.value = true;
}

function openCreateChild(parent: CategoryNode) {
  access.value = null;
  slugManual.value = false;
  form.value = {
    mode: 'create',
    parentId: parent.id,
    slug: '',
    title: '',
    description: '',
    sortOrder: 0,
  };
  formError.value = null;
  formOpen.value = true;
}

function openEdit(node: CategoryNode) {
  access.value = null;
  slugManual.value = true;
  form.value = {
    mode: 'edit',
    categoryId: node.id,
    parentId: node.parentId,
    slug: node.slug,
    title: node.title,
    description: node.description,
    sortOrder: node.sortOrder,
  };
  formError.value = null;
  formOpen.value = true;
}

function closeForm() {
  form.value = null;
  formError.value = null;
  slugManual.value = false;
  formOpen.value = false;
}

function slugFromTitle(title: string): string {
  const translit = title
    .trim()
    .toLowerCase()
    .replace(/[а-яё]/gi, (ch) => {
      const map: Record<string, string> = {
        а: 'a',
        б: 'b',
        в: 'v',
        г: 'g',
        д: 'd',
        е: 'e',
        ё: 'e',
        ж: 'zh',
        з: 'z',
        и: 'i',
        й: 'y',
        к: 'k',
        л: 'l',
        м: 'm',
        н: 'n',
        о: 'o',
        п: 'p',
        р: 'r',
        с: 's',
        т: 't',
        у: 'u',
        ф: 'f',
        х: 'h',
        ц: 'ts',
        ч: 'ch',
        ш: 'sh',
        щ: 'sch',
        ъ: '',
        ы: 'y',
        ь: '',
        э: 'e',
        ю: 'yu',
        я: 'ya',
      };
      return map[ch.toLowerCase()] ?? '';
    })
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    .replace(/-+/g, '-')
    .slice(0, 64);
  return translit || 'category';
}

function takenSlugs(excludeId?: string): Set<string> {
  const set = new Set<string>();
  for (const node of flattenCategories(tree.value)) {
    if (excludeId && node.id === excludeId) continue;
    set.add(node.slug);
  }
  return set;
}

function uniqueSlug(base: string, excludeId?: string): string {
  const taken = takenSlugs(excludeId);
  const root = (base || 'category').slice(0, 64);
  if (!taken.has(root)) return root;
  for (let i = 2; i < 1000; i += 1) {
    const suffix = `-${i}`;
    const candidate = `${root.slice(0, Math.max(1, 64 - suffix.length))}${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${root.slice(0, 55)}-${Date.now().toString(36).slice(-8)}`;
}

function syncSlugFromTitle() {
  if (!form.value || form.value.mode !== 'create' || slugManual.value) return;
  form.value.slug = uniqueSlug(slugFromTitle(form.value.title));
}

function onTitleInput() {
  syncSlugFromTitle();
}

function onSlugInput() {
  slugManual.value = true;
  if (!form.value) return;
  form.value.slug = form.value.slug
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-');
}

function regenerateSlug() {
  if (!form.value) return;
  slugManual.value = false;
  form.value.slug = uniqueSlug(
    slugFromTitle(form.value.title || form.value.slug),
    form.value.mode === 'edit' ? form.value.categoryId : undefined,
  );
}

async function submitForm() {
  if (!form.value) return;
  if (form.value.mode === 'create' && !form.value.slug.trim()) {
    form.value.slug = uniqueSlug(slugFromTitle(form.value.title));
  }
  const payload: CategoryFormInput = {
    slug: form.value.slug.trim().replace(/^-+|-+$/g, ''),
    title: form.value.title.trim(),
    description: form.value.description.trim(),
    parentId: form.value.parentId,
    sortOrder: form.value.sortOrder,
  };
  if (!payload.title || !payload.slug) {
    formError.value = 'Укажите название';
    return;
  }

  saving.value = true;
  formError.value = null;
  try {
    if (form.value.mode === 'create') {
      await createCategory(payload);
    } else if (form.value.categoryId) {
      await updateCategory(form.value.categoryId, payload);
    }
    closeForm();
    await loadTree();
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Не удалось сохранить';
  } finally {
    saving.value = false;
  }
}

async function removeCategory(node: CategoryNode) {
  if (!confirm(`Удалить раздел «${node.title}»?`)) return;
  saving.value = true;
  error.value = null;
  try {
    await deleteCategory(node.id);
    if (form.value?.categoryId === node.id) closeForm();
    await loadTree();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось удалить';
  } finally {
    saving.value = false;
  }
}

async function openAccess(node: CategoryNode) {
  form.value = null;
  accessError.value = null;
  if (!allGroups.value.length) {
    try {
      allGroups.value = await listAccessGroups();
    } catch (e) {
      accessError.value = e instanceof Error ? e.message : 'Не удалось загрузить группы';
    }
  }
  access.value = {
    categoryId: node.id,
    title: node.title,
    selectedIds: new Set(node.accessGroupIds ?? []),
  };
}

function closeAccess() {
  access.value = null;
  accessError.value = null;
}

function toggleGroup(groupId: string) {
  if (!access.value) return;
  const next = new Set(access.value.selectedIds);
  if (next.has(groupId)) next.delete(groupId);
  else next.add(groupId);
  access.value.selectedIds = next;
}

function isSelected(groupId: string) {
  return access.value?.selectedIds.has(groupId) ?? false;
}

async function saveAccess() {
  if (!access.value) return;
  accessSaving.value = true;
  accessError.value = null;
  try {
    await setCategoryAccessGroups(access.value.categoryId, [...access.value.selectedIds]);
    closeAccess();
    await loadTree();
  } catch (e) {
    accessError.value = e instanceof Error ? e.message : 'Не удалось сохранить доступ';
  } finally {
    accessSaving.value = false;
  }
}
</script>

<template>
  <section class="forum-categories">
    <header class="forum-categories__header">
      <div class="min-w-0">
        <p class="forum-categories__back">
          <RouterLink to="/forum">
            ← К форуму
          </RouterLink>
        </p>
        <h1 class="text-xl font-semibold text-text sm:text-2xl">
          Разделы форума
        </h1>
        <p class="mt-1 text-sm text-text-muted">
          Управление деревом категорий. Клик по названию открывает темы раздела.
        </p>
      </div>
      <UiButton
        v-if="isAdmin"
        intent="primary"
        type="button"
        class="w-full shrink-0 sm:w-auto"
        @click="openCreateRoot"
      >
        + Корневой раздел
      </UiButton>
    </header>

    <p
      v-if="isAdmin"
      class="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-muted"
    >
      Режим администратора: доступ через
      <RouterLink
        to="/admin/access-groups"
        class="text-primary hover:underline"
      >
        группы доступа
      </RouterLink>
      (нет групп = всем; иначе OR по выбранным + админы).
    </p>

    <div
      v-if="access"
      class="rounded-md border border-border bg-surface p-4"
    >
      <h2 class="text-lg font-medium text-text">
        Доступ: {{ access.title }}
      </h2>
      <p class="mt-1 text-sm text-text-muted">
        Выберите группы. Пустой выбор — раздел виден всем.
      </p>
      <p
        v-if="allGroups.length === 0"
        class="mt-2 text-sm text-text-muted"
      >
        Групп пока нет —
        <RouterLink
          to="/admin/access-groups"
          class="text-primary hover:underline"
        >
          создайте на странице групп доступа
        </RouterLink>.
      </p>
      <ul
        v-else
        class="mt-3 grid gap-2"
      >
        <li
          v-for="g in allGroups"
          :key="g.id"
        >
          <label class="flex cursor-pointer items-start gap-2 text-sm text-text">
            <input
              type="checkbox"
              class="mt-1 size-4 accent-primary"
              :checked="isSelected(g.id)"
              @change="toggleGroup(g.id)"
            >
            <span>
              <strong>{{ g.name }}</strong>
              <span
                v-if="g.description"
                class="font-normal text-text-muted"
              > — {{ g.description }}</span>
            </span>
          </label>
        </li>
      </ul>
      <p
        v-if="accessError"
        class="mt-2 text-sm text-error"
      >
        {{ accessError }}
      </p>
      <div class="mt-4 flex flex-wrap gap-2">
        <UiButton
          intent="primary"
          type="button"
          :disabled="accessSaving"
          @click="saveAccess"
        >
          {{ accessSaving ? 'Сохранение…' : 'Сохранить доступ' }}
        </UiButton>
        <UiButton
          intent="secondary"
          type="button"
          :disabled="accessSaving"
          @click="closeAccess"
        >
          Отмена
        </UiButton>
      </div>
    </div>

    <UiModal
      v-model:open="formOpen"
      :title="form?.mode === 'create' ? 'Новый раздел' : 'Редактирование'"
      :description="parentTitle ? `Родитель: ${parentTitle}` : undefined"
    >
      <form
        class="grid gap-4"
        @submit.prevent="submitForm"
      >
        <label class="grid gap-1.5 text-sm text-text">
          Название
          <input
            v-model="form!.title"
            type="text"
            maxlength="128"
            required
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-text transition-colors placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Введите название раздела"
            @input="onTitleInput"
          >
        </label>
        <label class="grid gap-1.5 text-sm text-text">
          <span class="flex flex-wrap items-center justify-between gap-2">
            Slug (URL)
            <button
              type="button"
              class="text-xs font-medium text-primary hover:underline"
              @click="regenerateSlug"
            >
              Сгенерировать
            </button>
          </span>
          <input
            v-model="form!.slug"
            type="text"
            maxlength="64"
            required
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            class="w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-text transition-colors placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="avto-zapolnitsya"
            @input="onSlugInput"
          >
          <span class="text-xs text-text-muted">
            При создании заполняется автоматически и делается уникальным.
          </span>
        </label>
        <label class="grid gap-1.5 text-sm text-text">
          Описание
          <textarea
            v-model="form!.description"
            rows="3"
            maxlength="2000"
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-text transition-colors placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Кратко о содержимом раздела"
          />
        </label>
        <label class="grid gap-1.5 text-sm text-text sm:max-w-40">
          Порядок
          <input
            v-model.number="form!.sortOrder"
            type="number"
            step="1"
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-text transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
        </label>
        <p
          v-if="formError"
          class="text-sm text-danger"
        >
          {{ formError }}
        </p>
        <div class="flex flex-wrap gap-2 pt-1">
          <UiButton
            intent="primary"
            type="submit"
            :disabled="saving"
          >
            {{ saving ? 'Сохранение…' : 'Сохранить' }}
          </UiButton>
          <UiButton
            intent="secondary"
            type="button"
            :disabled="saving"
            @click="closeForm"
          >
            Отмена
          </UiButton>
        </div>
      </form>
    </UiModal>

    <p
      v-if="loading"
      class="text-sm text-text-muted"
    >
      Загрузка…
    </p>
    <p
      v-else-if="error"
      class="text-sm text-error"
    >
      {{ error }}
    </p>
    <p
      v-else-if="tree.length === 0"
      class="text-sm text-text-muted"
    >
      Пока нет разделов.
      <template v-if="isAdmin">
        Создайте первый корневой раздел.
      </template>
    </p>

    <ul
      v-else
      class="forum-categories__tree"
    >
      <ForumCategoryTreeNode
        v-for="node in tree"
        :key="node.id"
        :node="node"
        :depth="0"
        :is-admin="isAdmin"
        :collapsed-ids="collapsedIds"
        @edit="openEdit"
        @add-child="openCreateChild"
        @access="openAccess"
        @delete="removeCategory"
        @toggle-collapse="toggleCollapse"
      />
    </ul>
  </section>
</template>

<style scoped>
.forum-categories {
  display: grid;
  gap: 1rem;
}

.forum-categories__header {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.75rem;
}

@media (min-width: 640px) {
  .forum-categories__header {
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
  }
}

.forum-categories__back {
  margin: 0 0 0.35rem;
  font-size: 0.9rem;
}

.forum-categories__back a {
  color: var(--color-primary);
  text-decoration: none;
}

.forum-categories__tree {
  list-style: none;
  margin: 0;
  padding: 0 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  overflow: hidden;
}

@media (min-width: 640px) {
  .forum-categories__tree {
    padding: 0 1rem;
  }
}
</style>
