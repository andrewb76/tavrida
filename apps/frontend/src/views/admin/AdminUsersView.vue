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
import { UiButton } from '@tavrida/ui';
import { computed, onMounted, ref } from 'vue';
import { toast } from 'vue-sonner';
import { useSessionStore } from '@/stores/session';

const users = ref<AdminUserRow[]>([]);
const session = useSessionStore();
const total = ref(0);
const loading = ref(true);
const error = ref<string | null>(null);
const search = ref('');
const savingRolesFor = ref<string | null>(null);
const avatarFailed = ref<Record<string, boolean>>({});

const depositOpen = ref(false);
const depositUser = ref<AdminUserRow | null>(null);
const depositAmount = ref(500);
const depositing = ref(false);
const depositError = ref<string | null>(null);

const presets = [100, 500, 1000, 5000];

const depositAmountValid = computed(
  () => Number.isFinite(depositAmount.value) && depositAmount.value >= 100,
);

const roleDraft = ref<Record<string, Record<Exclude<PlatformRole, 'member'>, boolean>>>({});

function initRoleDraft(row: AdminUserRow) {
  roleDraft.value[row.userId] = {
    admin: row.roles.includes('admin'),
    moderator: row.roles.includes('moderator'),
    expert: row.roles.includes('expert'),
  };
}

function rolesFor(userId: string) {
  if (!roleDraft.value[userId]) {
    roleDraft.value[userId] = { admin: false, moderator: false, expert: false };
  }
  return roleDraft.value[userId];
}

function displayLabel(row: AdminUserRow) {
  return row.displayName?.trim() || row.email?.trim() || 'Без имени';
}

function avatarInitial(row: AdminUserRow) {
  return displayLabel(row).charAt(0).toUpperCase();
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
  total.value ? `${total.value} пользователей` : 'Пользователи появляются после регистрации',
);

async function saveRoles(row: AdminUserRow) {
  const draft = rolesFor(row.userId);

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

function closeDeposit() {
  if (depositing.value) return;
  depositOpen.value = false;
  depositUser.value = null;
  depositError.value = null;
}

async function confirmDeposit() {
  if (!depositUser.value || !depositAmountValid.value) {
    depositError.value = 'Минимальная сумма — 100 ₽';
    return;
  }

  depositing.value = true;
  depositError.value = null;

  try {
    const result = await adminDepositUser(depositUser.value.userId, depositAmount.value);
    depositUser.value.balance = result.balance;
    const listRow = users.value.find((u) => u.userId === depositUser.value?.userId);
    if (listRow) listRow.balance = result.balance;
    if (depositUser.value.userId === session.userId) {
      session.setBalance(result.balance);
    }
    toast.success(`Баланс: ${formatMoney(result.balance)}`);
    closeDeposit();
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Ошибка пополнения';
    depositError.value = message;
    toast.error(message);
  } finally {
    depositing.value = false;
  }
}
</script>

<template>
  <section class="space-y-4 pb-32">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold">Пользователи</h2>
        <p class="text-sm text-text-muted">{{ subtitle }}</p>
      </div>
      <form class="flex gap-2" @submit.prevent="load">
        <input
          v-model="search"
          type="search"
          placeholder="Имя, email или ID…"
          class="rounded-md border border-border bg-bg px-3 py-2 text-sm"
        />
        <UiButton intent="secondary" type="submit">Найти</UiButton>
      </form>
    </div>

    <p v-if="loading" class="text-sm text-text-muted">Загрузка…</p>
    <p v-else-if="error" class="text-sm text-danger">{{ error }}</p>
    <p v-else-if="users.length === 0" class="text-sm text-text-muted">Нет пользователей.</p>

    <div v-else class="grid gap-4">
      <article
        v-for="row in users"
        :key="row.userId"
        class="rounded-lg border border-border bg-surface p-4 shadow-card"
      >
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="flex min-w-0 flex-1 items-start gap-3">
            <div
              class="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-base font-semibold text-primary"
            >
              <span aria-hidden="true">{{ avatarInitial(row) }}</span>
              <img
                v-if="row.avatarUrl && !avatarFailed[row.userId]"
                :src="row.avatarUrl"
                :alt="displayLabel(row)"
                class="absolute inset-0 size-full object-cover"
                referrerpolicy="no-referrer"
                @error="avatarFailed[row.userId] = true"
              />
            </div>

            <div class="min-w-0">
              <p class="truncate text-base font-semibold text-text">{{ displayLabel(row) }}</p>
              <p v-if="row.email" class="truncate text-sm text-text-muted">{{ row.email }}</p>
              <code class="mt-1 block truncate text-xs text-text-muted">{{ row.userId }}</code>
              <p class="mt-1 text-xs text-text-muted">
                {{ new Date(row.createdAt).toLocaleDateString('ru-RU') }}
                <span v-if="row.isSuspended" class="text-orange-600"> · заблокирован</span>
                <span v-else-if="!row.logtoSyncedAt" class="text-orange-600"> · ожидает синхронизацию</span>
              </p>
            </div>
          </div>

          <div class="relative z-10 shrink-0 text-right">
            <p class="text-xs text-text-muted">Баланс</p>
            <p class="text-lg font-semibold tabular-nums">{{ formatMoney(row.balance) }}</p>
            <button
              type="button"
              class="mt-2 inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-white hover:bg-primary-hover"
              @click="openDeposit(row)"
            >
              Пополнить
            </button>
          </div>
        </div>

        <div class="mt-4 border-t border-border/70 pt-4">
          <p class="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">Роли (Keto)</p>
          <div class="flex flex-wrap items-center gap-4">
            <label
              v-for="role in MANAGED_ROLES"
              :key="role"
              class="flex items-center gap-2 text-sm"
            >
              <input
                v-model="rolesFor(row.userId)[role]"
                type="checkbox"
                class="rounded border-border"
              />
              {{ ROLE_LABELS[role] }}
            </label>
            <UiButton
              intent="secondary"
              size="sm"
              type="button"
              :disabled="savingRolesFor === row.userId"
              @click="saveRoles(row)"
            >
              {{ savingRolesFor === row.userId ? 'Сохранение…' : 'Сохранить роли' }}
            </UiButton>
          </div>
        </div>
      </article>
    </div>

    <Teleport to="body">
      <div
        v-if="depositOpen && depositUser"
        class="fixed inset-0 z-[200] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-deposit-title"
      >
        <button
          type="button"
          class="absolute inset-0 bg-black/50"
          aria-label="Закрыть"
          @click="closeDeposit"
        />

        <div
          class="relative z-10 w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-card"
          @click.stop
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 id="admin-deposit-title" class="text-lg font-semibold text-text">
                Пополнение баланса
              </h3>
              <p class="mt-1 text-sm text-text-muted">{{ displayLabel(depositUser) }}</p>
            </div>
            <button
              type="button"
              class="rounded-md p-1 text-text-muted hover:bg-bg hover:text-text"
              aria-label="Закрыть"
              @click="closeDeposit"
            >
              ✕
            </button>
          </div>

          <div class="mt-4 space-y-4">
            <p class="text-sm text-text-muted">
              Текущий баланс: <strong>{{ formatMoney(depositUser.balance) }}</strong>
            </p>

            <div class="flex flex-wrap gap-2">
              <button
                v-for="preset in presets"
                :key="preset"
                type="button"
                class="inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium"
                :class="
                  depositAmount === preset
                    ? 'bg-primary text-white'
                    : 'border border-border bg-bg text-text hover:bg-surface'
                "
                @click="depositAmount = preset"
              >
                {{ formatMoney(preset) }}
              </button>
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

            <button
              type="button"
              class="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-base font-medium text-white hover:bg-primary-hover disabled:pointer-events-none disabled:opacity-50"
              :disabled="depositing || !depositAmountValid"
              @click="confirmDeposit"
            >
              {{ depositing ? 'Пополнение…' : `Пополнить ${formatMoney(depositAmount)}` }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>
