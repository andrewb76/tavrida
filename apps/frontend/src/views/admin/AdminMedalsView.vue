<script setup lang="ts">
import MedalBadges from '@/components/profile/MedalBadges.vue';
import UserAvatar from '@/components/user/UserAvatar.vue';
import { bffAuthHeaders } from '@/services/apiAuth';
import { listAdminUsers, type AdminUserRow } from '@/services/adminUsers';
import { listMedals, type ForumMedal } from '@/services/forum';
import { UiButton } from '@tavrida/ui';
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { toast } from 'vue-sonner';

const medals = ref<ForumMedal[]>([]);
const users = ref<AdminUserRow[]>([]);
const loading = ref(true);
const search = ref('');
const selectedMedal = ref<string | null>(null);
const awardUserId = ref('');
const awardReason = ref('');
const awarding = ref(false);
const revoking: Record<string, boolean> = {};

const filteredUsers = computed(() => {
  const q = search.value.toLowerCase();
  let list = users.value;
  if (q) {
    list = list.filter(
      (u) =>
        u.displayName?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q),
    );
  }
  if (selectedMedal.value) {
    list = list.filter((u) =>
      u.medals.some((m) => m.medalId === selectedMedal.value),
    );
  }
  return list;
});

const stats = computed(() => {
  const medalCount: Record<string, number> = {};
  for (const u of users.value) {
    for (const m of u.medals) {
      medalCount[m.medalId] = (medalCount[m.medalId] ?? 0) + 1;
    }
  }
  return medalCount;
});

function medalName(id: string): string {
  return medals.value.find((m) => m.id === id)?.name ?? id;
}

async function load() {
  loading.value = true;
  try {
    const [m, u] = await Promise.all([listMedals(), listAdminUsers({ limit: 200 })]);
    medals.value = m;
    users.value = u.data ?? [];
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Не удалось загрузить данные');
  } finally {
    loading.value = false;
  }
}

async function awardMedal() {
  if (!awardUserId.value || !selectedMedal.value) return;
  awarding.value = true;
  try {
    const res = await fetch(`/api/forum/medals/users/${encodeURIComponent(awardUserId.value)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await bffAuthHeaders()) },
      body: JSON.stringify({
        medalId: selectedMedal.value,
        reason: awardReason.value || null,
      }),
    });
    if (!res.ok) throw new Error('Не удалось вручить медаль');
    toast.success('Медаль вручена');
    awardUserId.value = '';
    awardReason.value = '';
    await load();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  } finally {
    awarding.value = false;
  }
}

async function revokeMedal(userId: string, medalId: string) {
  const key = `${userId}:${medalId}`;
  revoking[key] = true;
  try {
    const res = await fetch(
      `/api/forum/medals/users/${encodeURIComponent(userId)}/${encodeURIComponent(medalId)}`,
      { method: 'DELETE', headers: await bffAuthHeaders() },
    );
    if (!res.ok) throw new Error('Не удалось отозвать медаль');
    toast.success('Медаль отозвана');
    await load();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  } finally {
    revoking[key] = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="admin-medals">
    <h1 class="admin-medals__title">Медали</h1>

    <div
      v-if="loading"
      class="admin-medals__muted"
    >
      Загрузка…
    </div>

    <template v-else>
      <section class="admin-medals__catalog">
        <h2 class="admin-medals__subtitle">Каталог медалей</h2>
        <div class="admin-medals__grid">
          <div
            v-for="m in medals"
            :key="m.id"
            class="admin-medals__medal-card"
            :class="{ 'is-selected': selectedMedal === m.id }"
            @click="selectedMedal = selectedMedal === m.id ? null : m.id"
          >
            <span class="admin-medals__medal-icon">🏅</span>
            <div class="admin-medals__medal-info">
              <strong>{{ m.name }}</strong>
              <span class="admin-medals__medal-desc">{{ m.description }}</span>
              <span class="admin-medals__medal-count">Вручено: {{ stats[m.id] ?? 0 }}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="admin-medals__award">
        <h2 class="admin-medals__subtitle">Вручить медаль</h2>
        <div class="admin-medals__award-form">
          <input
            v-model="awardUserId"
            type="text"
            placeholder="User ID"
            class="admin-medals__input"
          />
          <select
            v-model="selectedMedal"
            class="admin-medals__select"
          >
            <option
              :value="null"
              disabled
            >
              Выберите медаль
            </option>
            <option
              v-for="m in medals"
              :key="m.id"
              :value="m.id"
            >
              {{ m.name }}
            </option>
          </select>
          <input
            v-model="awardReason"
            type="text"
            placeholder="Причина (необязательно)"
            class="admin-medals__input"
          />
          <UiButton
            :disabled="awarding || !awardUserId || !selectedMedal"
            @click="awardMedal"
          >
            {{ awarding ? 'Вручение…' : 'Вручить' }}
          </UiButton>
        </div>
      </section>

      <section class="admin-medals__list">
        <h2 class="admin-medals__subtitle">
          Пользователи
          <span class="admin-medals__count">({{ filteredUsers.length }})</span>
        </h2>
        <input
          v-model="search"
          type="text"
          placeholder="Поиск по имени, логину, email…"
          class="admin-medals__search"
        />
        <div class="admin-medals__table-wrap">
          <table class="admin-medals__table">
            <thead>
              <tr>
                <th>Пользователь</th>
                <th>Медали</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="u in filteredUsers"
                :key="u.userId"
              >
                <td>
                  <RouterLink
                    :to="{ name: 'profile-user', params: { userId: u.userId } }"
                    class="admin-medals__user-link"
                  >
                    <UserAvatar
                      size="sm"
                      :avatar-url="u.avatarUrl"
                      :label="u.displayName ?? u.username ?? u.userId"
                    />
                    {{ u.displayName ?? u.username ?? u.userId.slice(0, 8) }}
                  </RouterLink>
                </td>
                <td>
                  <div class="admin-medals__user-medals">
                    <MedalBadges :user-id="u.userId" />
                  </div>
                </td>
                <td>
                  <template
                    v-for="m in u.medals"
                    :key="m.medalId"
                  >
                    <UiButton
                      size="sm"
                      intent="ghost"
                      :disabled="revoking[`${u.userId}:${m.medalId}`]"
                      @click="revokeMedal(u.userId, m.medalId)"
                    >
                      ✕ {{ m.medalName }}
                    </UiButton>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.admin-medals {
  padding: 1.5rem;
}

.admin-medals__title {
  font-size: 1.5rem;
  margin: 0 0 1.25rem;
}

.admin-medals__subtitle {
  font-size: 1rem;
  margin: 0 0 0.75rem;
}

.admin-medals__count {
  font-weight: 400;
  color: var(--color-text-muted);
}

.admin-medals__muted {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.admin-medals__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.admin-medals__medal-card {
  display: flex;
  gap: 0.65rem;
  align-items: flex-start;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  cursor: pointer;
  transition: border-color 0.15s;
}

.admin-medals__medal-card:hover {
  border-color: var(--color-primary);
}

.admin-medals__medal-card.is-selected {
  border-color: var(--color-primary);
  background: var(--color-primary-soft, rgba(59, 130, 246, 0.04));
}

.admin-medals__medal-icon {
  font-size: 1.5rem;
  line-height: 1;
}

.admin-medals__medal-info {
  display: grid;
  gap: 0.15rem;
  font-size: 0.8rem;
}

.admin-medals__medal-desc {
  color: var(--color-text-muted);
}

.admin-medals__medal-count {
  color: var(--color-text-muted);
}

.admin-medals__award-form {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.admin-medals__input,
.admin-medals__select,
.admin-medals__search {
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--color-border);
  border-radius: 0.375rem;
  font: inherit;
  font-size: 0.85rem;
}

.admin-medals__search {
  width: 100%;
  margin-bottom: 0.75rem;
}

.admin-medals__table-wrap {
  overflow-x: auto;
}

.admin-medals__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.admin-medals__table th,
.admin-medals__table td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
  text-align: left;
  vertical-align: middle;
}

.admin-medals__user-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--color-primary);
  text-decoration: none;
}

.admin-medals__user-link:hover {
  text-decoration: underline;
}

.admin-medals__user-medals {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}
</style>
