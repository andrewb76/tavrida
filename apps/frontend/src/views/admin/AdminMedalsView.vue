<script setup lang="ts">
import UserAvatar from '@/components/user/UserAvatar.vue';
import {
  createMedal,
  deleteMedal,
  listMedals,
  updateMedal,
  awardMedal,
  revokeMedal,
  type ForumMedal,
} from '@/services/forum';
import { fetchAdminUsers, type AdminUserRow } from '@/services/adminUsers';
import { UiButton } from '@tavrida/ui';
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { toast } from 'vue-sonner';

const medals = ref<ForumMedal[]>([]);
const allUsers = ref<AdminUserRow[]>([]);
const loading = ref(true);
const search = ref('');
const selectedMedal = ref<string | null>(null);

// Award form
const awardQuery = ref('');
const awardUser = ref<AdminUserRow | null>(null);
const awardMedalId = ref<string | null>(null);
const awardReason = ref('');
const awarding = ref(false);
const userDropdownOpen = ref(false);

// Medal CRUD
const medalFormOpen = ref(false);
const editingMedal = ref<ForumMedal | null>(null);
const medalForm = ref({ name: '', description: '', iconUrl: '', dispPosition: 0 });
const savingMedal = ref(false);
const deletingMedalId = ref<string | null>(null);

const revoking: Record<string, boolean> = {};

// Pagination
const page = ref(0);
const pageSize = 20;

const userSearchResults = computed(() => {
  const q = awardQuery.value.toLowerCase();
  if (!q || q.length < 2) return [];
  return allUsers.value
    .filter(
      (u) =>
        !awardUser.value &&
        (u.displayName?.toLowerCase().includes(q) ||
          u.username?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q)),
    )
    .slice(0, 8);
});

const filteredUsers = computed(() => {
  const q = search.value.toLowerCase();
  let list = allUsers.value;
  if (q) {
    list = list.filter(
      (u) =>
        u.displayName?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q),
    );
  }
  if (selectedMedal.value) {
    list = list.filter((u) => u.medals.some((m) => m.medalId === selectedMedal.value));
  }
  return list;
});

const pagedUsers = computed(() => {
  const start = page.value * pageSize;
  return filteredUsers.value.slice(start, start + pageSize);
});

const totalPages = computed(() => Math.ceil(filteredUsers.value.length / pageSize));

const stats = computed(() => {
  const medalCount: Record<string, number> = {};
  for (const u of allUsers.value) {
    for (const m of u.medals) {
      medalCount[m.medalId] = (medalCount[m.medalId] ?? 0) + 1;
    }
  }
  return medalCount;
});

watch(search, () => { page.value = 0; });
watch(selectedMedal, () => { page.value = 0; });

function selectAwardUser(user: AdminUserRow) {
  awardUser.value = user;
  awardQuery.value = user.displayName ?? user.username ?? user.userId;
  userDropdownOpen.value = false;
  awardMedalId.value = selectedMedal.value;
}

function clearAwardUser() {
  awardUser.value = null;
  awardQuery.value = '';
  awardMedalId.value = null;
}

async function submitAward() {
  if (!awardUser.value || !awardMedalId.value) return;
  awarding.value = true;
  try {
    await awardMedal({ userId: awardUser.value.userId, medalId: awardMedalId.value, reason: awardReason.value || undefined });
    toast.success(`Медаль вручена ${awardUser.value.displayName ?? awardUser.value.username}`);
    clearAwardUser();
    awardReason.value = '';
    await load();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  } finally {
    awarding.value = false;
  }
}

async function submitRevoke(userId: string, medalId: string) {
  const key = `${userId}:${medalId}`;
  revoking[key] = true;
  try {
    await revokeMedal(userId, medalId);
    toast.success('Медаль отозвана');
    await load();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  } finally {
    revoking[key] = false;
  }
}

function openCreateMedal() {
  editingMedal.value = null;
  medalForm.value = { name: '', description: '', iconUrl: '', dispPosition: 0 };
  medalFormOpen.value = true;
}

function openEditMedal(medal: ForumMedal) {
  editingMedal.value = medal;
  medalForm.value = { name: medal.name, description: medal.description, iconUrl: medal.iconUrl ?? '', dispPosition: medal.dispPosition };
  medalFormOpen.value = true;
}

async function submitMedalForm() {
  savingMedal.value = true;
  try {
    if (editingMedal.value) {
      await updateMedal(editingMedal.value.id, medalForm.value);
      toast.success('Медаль обновлена');
    } else {
      await createMedal(medalForm.value);
      toast.success('Медаль создана');
    }
    medalFormOpen.value = false;
    await load();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  } finally {
    savingMedal.value = false;
  }
}

async function submitDeleteMedal(id: string) {
  deletingMedalId.value = id;
  try {
    await deleteMedal(id);
    toast.success('Медаль удалена');
    await load();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  } finally {
    deletingMedalId.value = null;
  }
}

async function load() {
  loading.value = true;
  try {
    const [m, u] = await Promise.all([listMedals(), fetchAdminUsers({ limit: 500 })]);
    medals.value = m;
    allUsers.value = u.data ?? [];
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Не удалось загрузить данные');
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="am">
    <header class="am__header">
      <h1 class="am__title">
        Медали
      </h1>
      <UiButton @click="openCreateMedal">
        + Создать медаль
      </UiButton>
    </header>

    <div v-if="loading" class="am__muted">
      Загрузка…
    </div>

    <template v-else>
      <!-- Medal catalog -->
      <section class="am__catalog">
        <div class="am__medals-grid">
          <div
            v-for="m in medals"
            :key="m.id"
            class="am__medal-card"
            :class="{ 'is-selected': selectedMedal === m.id }"
          >
            <div class="am__medal-top" @click="selectedMedal = selectedMedal === m.id ? null : m.id">
              <img
                v-if="m.iconUrl"
                :src="m.iconUrl"
                :alt="m.name"
                class="am__medal-icon"
              >
              <span v-else class="am__medal-emoji">🏅</span>
              <div class="am__medal-info">
                <strong>{{ m.name }}</strong>
                <span class="am__medal-desc">{{ m.description || '—' }}</span>
                <span class="am__medal-count">Вручено: {{ stats[m.id] ?? 0 }}</span>
              </div>
            </div>
            <div class="am__medal-actions">
              <UiButton size="sm" intent="ghost" @click="openEditMedal(m)">
                Ред.
              </UiButton>
              <UiButton
                size="sm"
                intent="ghost"
                :disabled="deletingMedalId === m.id"
                @click="submitDeleteMedal(m.id)"
              >
                Удал.
              </UiButton>
            </div>
          </div>
        </div>
      </section>

      <!-- Award form -->
      <section class="am__award">
        <h2 class="am__section-title">
          Вручить медаль
        </h2>
        <div class="am__award-row">
          <div class="am__user-search-wrap">
            <input
              v-model="awardQuery"
              type="text"
              placeholder="Найти пользователя…"
              class="am__input"
              :disabled="!!awardUser"
              @focus="userDropdownOpen = !!awardQuery && !awardUser"
              @input="userDropdownOpen = true"
            >
            <button
              v-if="awardUser"
              type="button"
              class="am__clear-btn"
              @click="clearAwardUser"
            >
              ✕
            </button>
            <div v-if="userDropdownOpen && userSearchResults.length" class="am__dropdown">
              <button
                v-for="u in userSearchResults"
                :key="u.userId"
                type="button"
                class="am__dropdown-item"
                @click="selectAwardUser(u)"
              >
                <UserAvatar size="sm" :avatar-url="u.avatarUrl" :label="u.displayName ?? u.username ?? u.userId" />
                {{ u.displayName ?? u.username ?? u.userId }}
              </button>
            </div>
          </div>
          <select v-model="awardMedalId" class="am__select">
            <option :value="null" disabled>
              Медаль
            </option>
            <option v-for="m in medals" :key="m.id" :value="m.id">
              {{ m.name }}
            </option>
          </select>
          <input
            v-model="awardReason"
            type="text"
            placeholder="Причина"
            class="am__input am__input--reason"
          >
          <UiButton :disabled="awarding || !awardUser || !awardMedalId" @click="submitAward">
            {{ awarding ? '…' : 'Вручить' }}
          </UiButton>
        </div>
      </section>

      <!-- Users list -->
      <section class="am__users">
        <div class="am__users-header">
          <h2 class="am__section-title">
            Пользователи ({{ filteredUsers.length }})
          </h2>
          <input
            v-model="search"
            type="text"
            placeholder="Поиск…"
            class="am__input am__input--search"
          >
        </div>
        <div class="am__table-wrap">
          <table class="am__table">
            <thead>
              <tr>
                <th>Пользователь</th>
                <th>Медали</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in pagedUsers" :key="u.userId">
                <td>
                  <RouterLink :to="{ name: 'profile-user', params: { userId: u.userId } }" class="am__user-link">
                    <UserAvatar size="sm" :avatar-url="u.avatarUrl" :label="u.displayName ?? u.username ?? u.userId" />
                    {{ u.displayName ?? u.username ?? u.userId.slice(0, 8) }}
                  </RouterLink>
                </td>
                <td>
                  <div class="am__user-medals">
                    <template v-for="m in u.medals" :key="m.medalId">
                      <span class="am__medal-badge" :title="m.reason ?? m.medalName">
                        {{ m.medalName }}
                      </span>
                    </template>
                    <span v-if="!u.medals.length" class="am__muted-inline">—</span>
                  </div>
                </td>
                <td class="am__revoke-cell">
                  <template v-for="m in u.medals" :key="m.medalId">
                    <UiButton
                      size="sm"
                      intent="ghost"
                      :disabled="revoking[`${u.userId}:${m.medalId}`]"
                      @click="submitRevoke(u.userId, m.medalId)"
                    >
                      ✕
                    </UiButton>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="totalPages > 1" class="am__pagination">
          <UiButton size="sm" :disabled="page === 0" @click="page--">
            ←
          </UiButton>
          <span class="am__page-info">{{ page + 1 }} / {{ totalPages }}</span>
          <UiButton size="sm" :disabled="page >= totalPages - 1" @click="page++">
            →
          </UiButton>
        </div>
      </section>
    </template>

    <!-- Medal create/edit dialog -->
    <Teleport to="body">
      <div v-if="medalFormOpen" class="am__overlay" @click.self="medalFormOpen = false">
        <div class="am__dialog">
          <h3>{{ editingMedal ? 'Редактировать медаль' : 'Новая медаль' }}</h3>
          <div class="am__form">
            <label class="am__label">
              Название
              <input
                v-model="medalForm.name"
                type="text"
                class="am__input"
                maxlength="200"
              >
            </label>
            <label class="am__label">
              Описание
              <input v-model="medalForm.description" type="text" class="am__input">
            </label>
            <label class="am__label">
              Иконка (URL)
              <input
                v-model="medalForm.iconUrl"
                type="text"
                class="am__input"
                placeholder="https://…"
              >
            </label>
            <label class="am__label">
              Позиция
              <input v-model.number="medalForm.dispPosition" type="number" class="am__input">
            </label>
          </div>
          <div class="am__dialog-actions">
            <UiButton intent="secondary" @click="medalFormOpen = false">
              Отмена
            </UiButton>
            <UiButton :disabled="savingMedal || !medalForm.name" @click="submitMedalForm">
              {{ savingMedal ? '…' : editingMedal ? 'Сохранить' : 'Создать' }}
            </UiButton>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.am { padding: 1.5rem; }
.am__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
.am__title { font-size: 1.5rem; margin: 0; }
.am__section-title { font-size: 1rem; margin: 0 0 0.75rem; }
.am__muted { font-size: 0.875rem; color: var(--color-text-muted); }

.am__medals-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr)); gap: 0.75rem; margin-bottom: 1.5rem; }
.am__medal-card { border: 1px solid var(--color-border); border-radius: 0.5rem; overflow: hidden; }
.am__medal-top { display: flex; gap: 0.65rem; padding: 0.75rem; cursor: pointer; }
.am__medal-top:hover { background: var(--color-hover); }
.am__medal-card.is-selected { border-color: var(--color-primary); }
.am__medal-icon { width: 2rem; height: 2rem; border-radius: 0.25rem; object-fit: contain; }
.am__medal-emoji { font-size: 1.5rem; line-height: 1; }
.am__medal-info { display: grid; gap: 0.15rem; font-size: 0.8rem; }
.am__medal-desc { color: var(--color-text-muted); }
.am__medal-count { color: var(--color-text-muted); }
.am__medal-actions { display: flex; gap: 0.25rem; padding: 0 0.75rem 0.5rem; }

.am__award { margin-bottom: 1.5rem; }
.am__award-row { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: flex-start; }

.am__user-search-wrap { position: relative; flex: 1; min-width: 14rem; }
.am__clear-btn { position: absolute; right: 0.5rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--color-text-muted); }
.am__dropdown { position: absolute; top: 100%; left: 0; right: 0; z-index: 100; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 0.375rem; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-height: 16rem; overflow-y: auto; }
.am__dropdown-item { display: flex; align-items: center; gap: 0.4rem; width: 100%; padding: 0.4rem 0.65rem; border: none; background: none; cursor: pointer; font: inherit; font-size: 0.85rem; text-align: left; }
.am__dropdown-item:hover { background: var(--color-hover); }

.am__input, .am__select { padding: 0.45rem 0.65rem; border: 1px solid var(--color-border); border-radius: 0.375rem; font: inherit; font-size: 0.85rem; }
.am__input--reason { flex: 1; min-width: 10rem; }
.am__input--search { width: 100%; max-width: 20rem; }

.am__users-header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 0.5rem; }
.am__table-wrap { overflow-x: auto; }
.am__table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.am__table th, .am__table td { padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--color-border); text-align: left; vertical-align: middle; }
.am__user-link { display: inline-flex; align-items: center; gap: 0.4rem; color: var(--color-primary); text-decoration: none; }
.am__user-link:hover { text-decoration: underline; }
.am__user-medals { display: flex; flex-wrap: wrap; gap: 0.25rem; }
.am__medal-badge { font-size: 0.75rem; padding: 0.1rem 0.4rem; border-radius: 0.25rem; background: var(--color-primary-soft, rgba(59,130,246,0.08)); color: var(--color-primary); }
.am__muted-inline { color: var(--color-text-muted); }
.am__revoke-cell { white-space: nowrap; }

.am__pagination { display: flex; align-items: center; gap: 0.5rem; justify-content: center; margin-top: 0.75rem; }
.am__page-info { font-size: 0.85rem; color: var(--color-text-muted); }

.am__overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; }
.am__dialog { background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 0.75rem; padding: 1.5rem; width: 24rem; max-width: 90vw; }
.am__dialog h3 { margin: 0 0 1rem; }
.am__form { display: grid; gap: 0.75rem; margin-bottom: 1rem; }
.am__label { display: grid; gap: 0.25rem; font-size: 0.8rem; font-weight: 500; }
.am__dialog-actions { display: flex; justify-content: flex-end; gap: 0.5rem; }
</style>
