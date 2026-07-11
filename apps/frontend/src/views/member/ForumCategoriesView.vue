<script setup lang="ts">
import ForumCategoryTreeNode from '@/components/forum/ForumCategoryTreeNode.vue';
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
  type CategoryFormInput,
  type CategoryNode,
} from '@/services/forum';
import { useSessionStore } from '@/stores/session';
import { UiButton } from '@tavrida/ui';
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';

const session = useSessionStore();
const isAdmin = computed(() => session.isAdmin);

const tree = ref<CategoryNode[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const saving = ref(false);
const formError = ref<string | null>(null);

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
const showForm = computed(() => form.value != null);

async function loadTree() {
  loading.value = true;
  error.value = null;
  try {
    tree.value = await listCategories();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка загрузки';
  } finally {
    loading.value = false;
  }
}

onMounted(loadTree);

function openCreateRoot() {
  form.value = {
    mode: 'create',
    parentId: null,
    slug: '',
    title: '',
    description: '',
    sortOrder: 0,
  };
  formError.value = null;
}

function openCreateChild(parent: CategoryNode) {
  form.value = {
    mode: 'create',
    parentId: parent.id,
    slug: '',
    title: '',
    description: '',
    sortOrder: 0,
  };
  formError.value = null;
}

function openEdit(node: CategoryNode) {
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
}

function closeForm() {
  form.value = null;
  formError.value = null;
}

function slugFromTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '')
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
    .replace(/-+/g, '-')
    .slice(0, 64);
}

function onTitleInput() {
  if (!form.value || form.value.mode !== 'create' || form.value.slug) return;
  form.value.slug = slugFromTitle(form.value.title);
}

async function submitForm() {
  if (!form.value) return;
  const payload: CategoryFormInput = {
    slug: form.value.slug.trim(),
    title: form.value.title.trim(),
    description: form.value.description.trim(),
    parentId: form.value.parentId,
    sortOrder: form.value.sortOrder,
  };
  if (!payload.title || !payload.slug) {
    formError.value = 'Укажите название и slug';
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
</script>

<template>
  <section class="forum-categories">
    <header class="forum-categories__header">
      <div>
        <p class="forum-categories__back">
          <RouterLink to="/forum">
            ← К списку тем
          </RouterLink>
        </p>
        <h1>Разделы форума</h1>
        <p class="forum-categories__lead">
          Дерево категорий. Выберите раздел, чтобы посмотреть темы внутри.
        </p>
      </div>
      <UiButton
        v-if="isAdmin"
        intent="primary"
        type="button"
        @click="openCreateRoot"
      >
        + Корневой раздел
      </UiButton>
    </header>

    <p
      v-if="isAdmin"
      class="forum-categories__admin-hint"
    >
      Режим администратора: можно добавлять, редактировать и удалять разделы.
    </p>

    <div
      v-if="showForm"
      class="forum-categories__form-panel"
    >
      <h2>{{ form?.mode === 'create' ? 'Новый раздел' : 'Редактирование' }}</h2>
      <form
        class="forum-categories__form"
        @submit.prevent="submitForm"
      >
        <label>
          Название
          <input
            v-model="form!.title"
            type="text"
            maxlength="128"
            required
            @input="onTitleInput"
          >
        </label>
        <label>
          Slug (URL)
          <input
            v-model="form!.slug"
            type="text"
            maxlength="64"
            required
          >
        </label>
        <label>
          Описание
          <textarea
            v-model="form!.description"
            rows="3"
            maxlength="2000"
          />
        </label>
        <label>
          Порядок сортировки
          <input
            v-model.number="form!.sortOrder"
            type="number"
            step="1"
          >
        </label>
        <p
          v-if="formError"
          class="forum-categories__error"
        >
          {{ formError }}
        </p>
        <div class="forum-categories__form-actions">
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
    </div>

    <p
      v-if="loading"
      class="forum-categories__status"
    >
      Загрузка…
    </p>
    <p
      v-else-if="error"
      class="forum-categories__error"
    >
      {{ error }}
    </p>
    <p
      v-else-if="tree.length === 0"
      class="forum-categories__status"
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
        @edit="openEdit"
        @add-child="openCreateChild"
        @delete="removeCategory"
      />
    </ul>
  </section>
</template>

<style scoped>
.forum-categories {
  display: grid;
  gap: 1.25rem;
}

.forum-categories__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.forum-categories__back {
  margin: 0 0 0.35rem;
  font-size: 0.9rem;
}

.forum-categories__back a {
  color: var(--color-primary, #2563eb);
  text-decoration: none;
}

.forum-categories__lead {
  margin: 0.25rem 0 0;
  color: var(--color-text-muted, #666);
}

.forum-categories__admin-hint {
  margin: 0;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  background: color-mix(in srgb, var(--color-primary, #2563eb) 8%, transparent);
  font-size: 0.9rem;
}

.forum-categories__form-panel {
  padding: 1rem;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 8px;
  background: var(--color-bg, #fff);
}

.forum-categories__form {
  display: grid;
  gap: 0.85rem;
  max-width: 32rem;
}

.forum-categories__form label {
  display: grid;
  gap: 0.35rem;
}

.forum-categories__form input,
.forum-categories__form textarea {
  width: 100%;
}

.forum-categories__form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.forum-categories__status,
.forum-categories__error {
  margin: 0;
}

.forum-categories__error {
  color: #b42318;
}

.forum-categories__tree {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 8px;
  padding: 0 1rem;
}
</style>
