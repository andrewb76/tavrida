<script setup lang="ts">
import {
  createAccessGroup,
  deleteAccessGroup,
  getAccessGroupMembersDetails,
  listAccessGroups,
  setAccessGroupMembers,
  updateAccessGroup,
  type AccessGroup,
  type AccessGroupMemberDetails,
} from '@/services/forum';
import { fetchAdminUsers, type AdminUserRow } from '@/services/adminUsers';
import { UiButton } from '@tavrida/ui';
import { computed, onMounted, ref } from 'vue';
import UserAvatar from '@/components/user/UserAvatar.vue';

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
  members: AccessGroupMemberDetails[];
  pendingUserIds: string[];
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
    const res = await getAccessGroupMembersDetails(group.id);
    membersPanel.value = {
      groupId: group.id,
      title: group.name,
      members: res.members,
      pendingUserIds: res.members.map((m) => m.userId),
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

function removeMember(userId: string) {
  if (!membersPanel.value) return;
  membersPanel.value.pendingUserIds = membersPanel.value.pendingUserIds.filter((id) => id !== userId);
  membersPanel.value.members = membersPanel.value.members.filter((m) => m.userId !== userId);
}

async function searchUsers() {
  if (!membersPanel.value?.search.trim()) {
    if (membersPanel.value) membersPanel.value.searchHits = [];
    return;
  }
  try {
    const res = await fetchAdminUsers({ q: membersPanel.value.search.trim(), limit: 10 });
    membersPanel.value.searchHits = res.data.filter(
      (u) => !membersPanel.value?.pendingUserIds.includes(u.userId),
    );
  } catch {
    if (membersPanel.value) membersPanel.value.searchHits = [];
  }
}

function addMember(user: AdminUserRow) {
  if (!membersPanel.value) return;
  if (membersPanel.value.pendingUserIds.includes(user.userId)) return;

  membersPanel.value.pendingUserIds.push(user.userId);
  membersPanel.value.members.push({
    userId: user.userId,
    displayName: user.displayName,
    username: user.username,
    avatarUrl: user.avatarUrl,
    lastSeenAt: null,
  });
  membersPanel.value.search = '';
  membersPanel.value.searchHits = [];
}

async function saveMembers() {
  if (!membersPanel.value) return;
  membersSaving.value = true;
  membersError.value = null;
  try {
    await setAccessGroupMembers(membersPanel.value.groupId, membersPanel.value.pendingUserIds);
    closeMembers();
    await load();
  } catch (e) {
    membersError.value = e instanceof Error ? e.message : 'Не удалось сохранить состав';
  } finally {
    membersSaving.value = false;
  }
}

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'только что';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} мин. назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч. назад`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} дн. назад`;
  const months = Math.floor(days / 30);
  return `${months} мес. назад`;
}

function memberDisplayName(member: AccessGroupMemberDetails): string {
  return member.displayName || member.username || 'Без имени';
}

function memberSubtitle(member: AccessGroupMemberDetails): string {
  const parts: string[] = [];
  if (member.username) parts.push(`@${member.username}`);
  if (member.lastSeenAt) parts.push(relativeTime(member.lastSeenAt));
  return parts.join(' · ');
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
      class="access-groups__panel access-groups__panel--members"
    >
      <div class="access-groups__panel-header">
        <h3>Состав: {{ membersPanel.title }}</h3>
        <span class="access-groups__member-count">
          {{ membersPanel.pendingUserIds.length }} уч.
        </span>
      </div>

      <div class="access-groups__search">
        <input
          v-model="membersPanel.search"
          type="search"
          placeholder="Поиск участника по имени или @username…"
          @input="searchUsers"
        >
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
              @click="addMember(u)"
            >
              <UserAvatar
                :avatar-url="u.avatarUrl"
                :label="u.displayName || u.username || u.email || u.userId"
                size="sm"
              />
              <div class="access-groups__hit-info">
                <span class="access-groups__hit-name">
                  {{ u.displayName || u.username || u.email || u.userId }}
                </span>
                <span class="access-groups__hit-id">{{ u.userId }}</span>
              </div>
            </button>
          </li>
        </ul>
      </div>

      <ul
        v-if="membersPanel.members.length"
        class="access-groups__member-list"
      >
        <li
          v-for="member in membersPanel.members"
          :key="member.userId"
          class="access-groups__member-card"
        >
          <UserAvatar
            :avatar-url="member.avatarUrl"
            :label="memberDisplayName(member)"
            size="sm"
            :user-id="member.userId"
          />
          <div class="access-groups__member-info">
            <span class="access-groups__member-name">
              {{ memberDisplayName(member) }}
            </span>
            <span
              v-if="memberSubtitle(member)"
              class="access-groups__member-sub"
            >
              {{ memberSubtitle(member) }}
            </span>
          </div>
          <button
            type="button"
            class="access-groups__member-remove"
            title="Удалить из группы"
            @click="removeMember(member.userId)"
          >
            ✕
          </button>
        </li>
      </ul>
      <p
        v-else
        class="access-groups__empty"
      >
        Нет участников. Найдите пользователя через поиск выше.
      </p>

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
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  display: grid;
  gap: 0.75rem;
  max-width: 36rem;
}

.access-groups__panel--members {
  max-width: 40rem;
}

.access-groups__panel-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.access-groups__panel-header h3 {
  margin: 0;
}

.access-groups__member-count {
  font-size: 0.8rem;
  color: var(--color-text-muted);
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

.access-groups__search {
  position: relative;
}

.access-groups__hits {
  list-style: none;
  margin: 0.35rem 0 0;
  padding: 0;
  display: grid;
  gap: 0.35rem;
  position: absolute;
  z-index: 10;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.access-groups__hit {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  text-align: left;
  border: none;
  border-radius: 0;
  background: transparent;
  padding: 0.5rem 0.6rem;
  cursor: pointer;
  font: inherit;
}

.access-groups__hit:hover {
  background: var(--color-bg);
}

.access-groups__hit-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.access-groups__hit-name {
  font-size: 0.875rem;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.access-groups__hit-id {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  word-break: break-all;
}

.access-groups__member-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.35rem;
}

.access-groups__member-card {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.625rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
}

.access-groups__member-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.access-groups__member-name {
  font-size: 0.875rem;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.access-groups__member-sub {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.access-groups__member-remove {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 0.75rem;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}

.access-groups__member-remove:hover {
  border-color: var(--color-error);
  color: var(--color-error);
}

.access-groups__empty {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.access-groups__list {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.access-groups__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--color-border);
}

.access-groups__row:last-child {
  border-bottom: none;
}

.access-groups__meta {
  margin-left: 0.5rem;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.access-groups__desc {
  margin: 0.35rem 0 0;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.access-groups__row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  flex-shrink: 0;
}

.access-groups__btn {
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg);
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
  cursor: pointer;
}

.access-groups__btn:hover {
  border-color: var(--color-primary);
}

.access-groups__btn--danger:hover {
  border-color: var(--color-error);
  color: var(--color-error);
}

.access-groups__error {
  margin: 0;
  color: var(--color-error);
}
</style>
