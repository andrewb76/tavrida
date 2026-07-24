<script setup lang="ts">
import {
  createAccessGroup,
  deleteAccessGroup,
  getAccessGroupMembers,
  listAccessGroups,
  setAccessGroupMembers,
  updateAccessGroup,
  type AccessGroup,
} from '@/services/forum';
import { fetchAdminUsers, type AdminUserRow } from '@/services/adminUsers';
import { UiButton } from '@tavrida/ui';
import { computed, onMounted, ref } from 'vue';

const groups = ref<AccessGroup[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const saving = ref(false);

const form = ref<{
  mode: 'create' | 'edit';
  groupId?: string;
  name: string;
  description: string;
} | null>(null);
const formError = ref<string | null>(null);

const membersPanel = ref<{
  groupId: string;
  title: string;
  userIdsText: string;
  search: string;
  searchHits: AdminUserRow[];
} | null>(null);
const membersError = ref<string | null>(null);
const membersSaving = ref(false);

const showForm = computed(() => form.value != null);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    groups.value = await listAccessGroups();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка загрузки';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void load();
});

function openCreate() {
  membersPanel.value = null;
  form.value = { mode: 'create', name: '', description: '' };
  formError.value = null;
}

function openEdit(group: AccessGroup) {
  membersPanel.value = null;
  form.value = {
    mode: 'edit',
    groupId: group.id,
    name: group.name,
    description: group.description,
  };
  formError.value = null;
}

function closeForm() {
  form.value = null;
  formError.value = null;
}

async function submitForm() {
  if (!form.value) return;
  const name = form.value.name.trim();
  if (!name) {
    formError.value = 'Укажите название';
    return;
  }
  saving.value = true;
  formError.value = null;
  try {
    if (form.value.mode === 'create') {
      await createAccessGroup({ name, description: form.value.description.trim() });
    } else if (form.value.groupId) {
      await updateAccessGroup(form.value.groupId, {
        name,
        description: form.value.description.trim(),
      });
    }
    closeForm();
    await load();
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Не удалось сохранить';
  } finally {
    saving.value = false;
  }
}

async function removeGroup(group: AccessGroup) {
  if (!confirm(`Удалить группу «${group.name}»? Связи с разделами будут сняты.`)) return;
  saving.value = true;
  error.value = null;
  try {
    await deleteAccessGroup(group.id);
    if (form.value?.groupId === group.id) closeForm();
    if (membersPanel.value?.groupId === group.id) closeMembers();
    await load();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось удалить';
  } finally {
    saving.value = false;
  }
}

async function openMembers(group: AccessGroup) {
  form.value = null;
  membersError.value = null;
  try {
    const res = await getAccessGroupMembers(group.id);
    membersPanel.value = {
      groupId: group.id,
      title: group.name,
      userIdsText: res.userIds.join('\n'),
      search: '',
      searchHits: [],
    };
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить состав';
  }
}

function closeMembers() {
  membersPanel.value = null;
  membersError.value = null;
}

async function searchUsers() {
  if (!membersPanel.value?.search.trim()) {
    if (membersPanel.value) membersPanel.value.searchHits = [];
    return;
  }
  try {
    const res = await fetchAdminUsers({ q: membersPanel.value.search.trim(), limit: 10 });
    membersPanel.value.searchHits = res.data;
  } catch {
    membersPanel.value.searchHits = [];
  }
}

function addUserId(userId: string) {
  if (!membersPanel.value) return;
  const lines = membersPanel.value.userIdsText
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!lines.includes(userId)) lines.push(userId);
  membersPanel.value.userIdsText = lines.join('\n');
}

async function saveMembers() {
  if (!membersPanel.value) return;
  membersSaving.value = true;
  membersError.value = null;
  try {
    const userIds = membersPanel.value.userIdsText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    await setAccessGroupMembers(membersPanel.value.groupId, userIds);
    closeMembers();
    await load();
  } catch (e) {
    membersError.value = e instanceof Error ? e.message : 'Не удалось сохранить состав';
  } finally {
    membersSaving.value = false;
  }
}
</script>

<template>
  <section class="access-groups">
    <header class="access-groups__header">
      <div>
        <h2 class="text-lg font-medium">
          Группы доступа
        </h2>
        <p class="mt-1 text-sm text-text-muted">
          Участники групп получают доступ к закрытым разделам форума (логика OR).
          Привязка групп к разделам — на странице «Разделы форума».
        </p>
      </div>
      <UiButton
        intent="primary"
        type="button"
        @click="openCreate"
      >
        + Группа
      </UiButton>
    </header>

    <div
      v-if="showForm"
      class="access-groups__panel"
    >
      <h3>{{ form?.mode === 'create' ? 'Новая группа' : 'Редактирование' }}</h3>
      <form
        class="access-groups__form"
        @submit.prevent="submitForm"
      >
        <label>
          Название
          <input
            v-model="form!.name"
            type="text"
            maxlength="128"
            required
          >
        </label>
        <label>
          Описание
          <textarea
            v-model="form!.description"
            rows="2"
            maxlength="2000"
          />
        </label>
        <p
          v-if="formError"
          class="access-groups__error"
        >
          {{ formError }}
        </p>
        <div class="access-groups__actions">
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

    <div
      v-if="membersPanel"
      class="access-groups__panel"
    >
      <h3>Состав: {{ membersPanel.title }}</h3>
      <p class="text-sm text-text-muted">
        User ID (Logto), по одному на строку.
      </p>
      <label>
        Поиск участника
        <input
          v-model="membersPanel.search"
          type="search"
          placeholder="Имя или @username"
          @input="searchUsers"
        >
      </label>
      <ul
        v-if="membersPanel.searchHits.length"
        class="access-groups__hits"
      >
        <li
          v-for="u in membersPanel.searchHits"
          :key="u.userId"
        >
          <button
            type="button"
            class="access-groups__hit"
            @click="addUserId(u.userId)"
          >
            {{ u.displayName || u.username || u.email || u.userId }}
            <span class="access-groups__hit-id">{{ u.userId }}</span>
          </button>
        </li>
      </ul>
      <label>
        User ID
        <textarea
          v-model="membersPanel.userIdsText"
          rows="6"
          placeholder="пусто = никого в группе"
        />
      </label>
      <p
        v-if="membersError"
        class="access-groups__error"
      >
        {{ membersError }}
      </p>
      <div class="access-groups__actions">
        <UiButton
          intent="primary"
          type="button"
          :disabled="membersSaving"
          @click="saveMembers"
        >
          {{ membersSaving ? 'Сохранение…' : 'Сохранить состав' }}
        </UiButton>
        <UiButton
          intent="secondary"
          type="button"
          :disabled="membersSaving"
          @click="closeMembers"
        >
          Отмена
        </UiButton>
      </div>
    </div>

    <p
      v-if="loading"
      class="text-sm text-text-muted"
    >
      Загрузка…
    </p>
    <p
      v-else-if="error"
      class="access-groups__error"
    >
      {{ error }}
    </p>
    <p
      v-else-if="groups.length === 0"
      class="text-sm text-text-muted"
    >
      Пока нет групп. Создайте первую.
    </p>

    <ul
      v-else
      class="access-groups__list"
    >
      <li
        v-for="group in groups"
        :key="group.id"
        class="access-groups__row"
      >
        <div>
          <strong>{{ group.name }}</strong>
          <span class="access-groups__meta">
            {{ group.memberCount ?? 0 }} уч.
          </span>
          <p
            v-if="group.description"
            class="access-groups__desc"
          >
            {{ group.description }}
          </p>
        </div>
        <div class="access-groups__row-actions">
          <button
            type="button"
            class="access-groups__btn"
            @click="openMembers(group)"
          >
            Состав
          </button>
          <button
            type="button"
            class="access-groups__btn"
            @click="openEdit(group)"
          >
            Изменить
          </button>
          <button
            type="button"
            class="access-groups__btn access-groups__btn--danger"
            @click="removeGroup(group)"
          >
            Удалить
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.access-groups {
  display: grid;
  gap: 1.25rem;
}

.access-groups__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.access-groups__panel {
  padding: 1rem;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 8px;
  background: var(--color-bg, #fff);
  display: grid;
  gap: 0.75rem;
  max-width: 36rem;
}

.access-groups__form {
  display: grid;
  gap: 0.85rem;
}

.access-groups__form label,
.access-groups__panel > label {
  display: grid;
  gap: 0.35rem;
  font-size: 0.9rem;
}

.access-groups__form input,
.access-groups__form textarea,
.access-groups__panel input,
.access-groups__panel textarea {
  width: 100%;
}

.access-groups__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.access-groups__hits {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.35rem;
}

.access-groups__hit {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  width: 100%;
  text-align: left;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 6px;
  background: var(--color-surface, #fff);
  padding: 0.4rem 0.6rem;
  cursor: pointer;
  font: inherit;
}

.access-groups__hit:hover {
  border-color: var(--color-primary, #2563eb);
}

.access-groups__hit-id {
  font-size: 0.75rem;
  color: var(--color-text-muted, #666);
  word-break: break-all;
}

.access-groups__list {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 8px;
}

.access-groups__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
}

.access-groups__row:last-child {
  border-bottom: none;
}

.access-groups__meta {
  margin-left: 0.5rem;
  font-size: 0.8rem;
  color: var(--color-text-muted, #666);
}

.access-groups__desc {
  margin: 0.35rem 0 0;
  font-size: 0.9rem;
  color: var(--color-text-muted, #666);
}

.access-groups__row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  flex-shrink: 0;
}

.access-groups__btn {
  border: 1px solid var(--color-border, #ddd);
  border-radius: 6px;
  background: var(--color-bg, #fff);
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
  cursor: pointer;
}

.access-groups__btn:hover {
  border-color: var(--color-primary, #2563eb);
}

.access-groups__btn--danger:hover {
  border-color: #b42318;
  color: #b42318;
}

.access-groups__error {
  margin: 0;
  color: #b42318;
}
</style>
