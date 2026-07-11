<script setup lang="ts">
import {
  adminDepositUser,
  fetchAdminUsers,
  MANAGED_ROLES,
  patchAdminUserRoles,
  ROLE_LABELS,
  type AdminUserRow,
  type PlatformRole,
} from '@/services/adminUsers';
import { formatMoney } from '@/services/wallet';
import { UiButton, UiModal } from '@tavrida/ui';
import { computed, onMounted, ref } from 'vue';
import { toast } from 'vue-sonner';

const users = ref<AdminUserRow[]>([]);
const total = ref(0);
const loading = ref(true);
const error = ref<string | null>(null);
const search = ref('');
const savingRolesFor = ref<string | null>(null);

const depositOpen = ref(false);
const depositUser = ref<AdminUserRow | null>(null);
const depositAmount = ref(500);
const depositing = ref(false);
const depositError = ref<string | null>(null);

const presets = [100, 500, 1000, 5000];

const roleDraft = ref<Record<string, Record<Exclude<PlatformRole, 'member'>, boolean>>>({});

function initRoleDraft(row: AdminUserRow) {
  roleDraft.value[row.userId] = {
    admin: row.roles.includes('admin'),
    moderator: row.roles.includes('moderator'),
    expert: row.roles.includes('expert'),
  };
}

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const result = await fetchAdminUsers({ q: search.value.trim() || undefined, limit: 100 });
    users.value = result.data;
    total.value = result.pagination.total;
    for (const row of result.data) initRoleDraft(row);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить пользователей';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void load();
});

const subtitle = computed(() =>
  total.value ? `${total.value} пользователей в реестре` : 'Пользователи появляются после регистрации',
);

async function saveRoles(row: AdminUserRow) {
  const draft = roleDraft.value[row.userId];
  if (!draft) return;

  savingRolesFor.value = row.userId;
  try {
    const result = await patchAdminUserRoles(row.userId, draft);
    row.roles = result.roles;
    initRoleDraft(row);
    toast.success('Роли обновлены');
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Не удалось обновить роли');
  } finally {
    savingRolesFor.value = null;
  }
}

function openDeposit(row: AdminUserRow) {
  depositUser.value = row;
  depositAmount.value = 500;
  depositError.value = null;
  depositOpen.value = true;
}

async function confirmDeposit() {
  if (!depositUser.value || depositAmount.value < 100) return;
  depositing.value = true;
  depositError.value = null;

  try {
    const result = await adminDepositUser(depositUser.value.userId, depositAmount.value);
    depositUser.value.balance = result.balance;
    const listRow = users.value.find((u) => u.userId === depositUser.value?.userId);
    if (listRow) listRow.balance = result.balance;
    toast.success(`Баланс: ${formatMoney(result.balance)}`);
    depositOpen.value = false;
  } catch (e) {
    depositError.value = e instanceof Error ? e.message : 'Ошибка пополнения';
  } finally {
    depositing.value = false;
  }
}
</script>

<template>
  <section class="space-y-4">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold">Пользователи</h2>
        <p class="text-sm text-text-muted">{{ subtitle }}</p>
      </div>
      <form class="flex gap-2" @submit.prevent="load">
        <input
          v-model="search"
          type="search"
          placeholder="ID или имя…"
          class="rounded-md border border-border bg-bg px-3 py-2 text-sm"
        />
        <UiButton intent="secondary" type="submit">Найти</UiButton>
      </form>
    </div>

    <p v-if="loading" class="text-sm text-text-muted">Загрузка…</p>
    <p v-else-if="error" class="text-sm text-danger">{{ error }}</p>
    <p v-else-if="users.length === 0" class="text-sm text-text-muted">Нет пользователей.</p>

    <div v-else class="overflow-x-auto rounded-lg border border-border">
      <table class="min-w-full text-left text-sm">
        <thead class="border-b border-border bg-bg/60 text-text-muted">
          <tr>
            <th class="px-3 py-2 font-medium">Пользователь</th>
            <th class="px-3 py-2 font-medium">Баланс</th>
            <th class="px-3 py-2 font-medium">Роли (Keto)</th>
            <th class="px-3 py-2 font-medium">Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in users" :key="row.userId" class="border-b border-border/70 align-top">
            <td class="px-3 py-3">
              <div class="font-medium">{{ row.displayName ?? '—' }}</div>
              <code class="text-xs text-text-muted">{{ row.userId }}</code>
              <div class="mt-1 text-xs text-text-muted">
                {{ new Date(row.createdAt).toLocaleDateString('ru-RU') }}
              </div>
            </td>
            <td class="px-3 py-3 tabular-nums">{{ formatMoney(row.balance) }}</td>
            <td class="px-3 py-3">
              <div class="flex flex-col gap-2">
                <label
                  v-for="role in MANAGED_ROLES"
                  :key="role"
                  class="flex items-center gap-2 text-sm"
                >
                  <input
                    v-model="roleDraft[row.userId][role]"
                    type="checkbox"
                    class="rounded border-border"
                  />
                  {{ ROLE_LABELS[role] }}
                </label>
                <UiButton
                  intent="secondary"
                  class="mt-1"
                  :disabled="savingRolesFor === row.userId"
                  @click="saveRoles(row)"
                >
                  {{ savingRolesFor === row.userId ? 'Сохранение…' : 'Сохранить роли' }}
                </UiButton>
              </div>
            </td>
            <td class="px-3 py-3">
              <UiButton intent="primary" @click="openDeposit(row)">Пополнить</UiButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <UiModal
      v-model:open="depositOpen"
      title="Пополнение баланса"
      :description="depositUser ? `Пользователь ${depositUser.userId}` : ''"
    >
      <div v-if="depositUser" class="space-y-4">
        <p class="text-sm text-text-muted">
          Текущий баланс: <strong>{{ formatMoney(depositUser.balance) }}</strong>
        </p>

        <div class="flex flex-wrap gap-2">
          <UiButton
            v-for="preset in presets"
            :key="preset"
            :intent="depositAmount === preset ? 'primary' : 'secondary'"
            @click="depositAmount = preset"
          >
            {{ formatMoney(preset) }}
          </UiButton>
        </div>

        <label class="block text-sm">
          Сумма (₽)
          <input
            v-model.number="depositAmount"
            type="number"
            min="100"
            step="100"
            class="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2"
          />
        </label>

        <p v-if="depositError" class="text-sm text-danger">{{ depositError }}</p>

        <UiButton
          intent="primary"
          class="w-full"
          :disabled="depositing || depositAmount < 100"
          @click="confirmDeposit"
        >
          {{ depositing ? 'Пополнение…' : `Пополнить ${formatMoney(depositAmount)}` }}
        </UiButton>
      </div>
    </UiModal>
  </section>
</template>
