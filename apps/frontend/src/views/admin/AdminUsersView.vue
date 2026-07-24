<script setup lang="ts">
import ProfileReputationLogModal from '@/components/profile/ProfileReputationLogModal.vue';
import {
  adminDepositUser,
  forceSyncAdminUser,
  fetchAdminUsers,
  MANAGED_ROLES,
  patchAdminUserHardLock,
  patchAdminUserRoles,
  ROLE_BADGE_LABELS,
  ROLE_LABELS,
  type AdminUserRow,
  type PlatformRole,
} from '@/services/adminUsers';
import { formatKarma, formatRating } from '@/services/profile';
import { formatMoney } from '@/services/wallet';
import { UiButton } from '@tavrida/ui';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import { refreshSessionBalance } from '@/composables/useWalletBalance';
import { refreshPlatformRoles } from '@/services/roles';
import { useSessionStore } from '@/stores/session';

const users = ref<AdminUserRow[]>([]);
const session = useSessionStore();
const router = useRouter();
const total = ref(0);
const loading = ref(true);
const error = ref<string | null>(null);
const search = ref('');
const savingRolesFor = ref<string | null>(null);
const lockingFor = ref<string | null>(null);
const syncingFor = ref<string | null>(null);
const avatarFailed = ref<Record<string, boolean>>({});
const menuOpenFor = ref<string | null>(null);

const depositOpen = ref(false);
const depositUser = ref<AdminUserRow | null>(null);
const depositAmount = ref(500);
const depositing = ref(false);
const depositError = ref<string | null>(null);

const rolesOpen = ref(false);
const rolesUser = ref<AdminUserRow | null>(null);

const reputationOpen = ref(false);
const reputationUserId = ref('');
const reputationMetric = ref<'karma' | 'rating'>('karma');
const reputationVerifiedSales = ref(0);

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

function roleBadges(row: AdminUserRow): PlatformRole[] {
  const order: PlatformRole[] = ['admin', 'moderator', 'expert', 'member'];
  const set = new Set(row.roles.includes('member') ? row.roles : [...row.roles, 'member' as const]);
  return order.filter((r) => set.has(r));
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtDay(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU');
}

function coveragePct(value: number | null): string {
  if (value == null) return '—';
  return `${Math.round(value * 100)}%`;
}

function inviteQuotaLabel(row: AdminUserRow): string {
  const rem = row.invites.remaining;
  const lim = row.invites.monthlyLimit;
  if (rem == null && lim == null) return `${row.invites.issued} выдано · квота —`;
  if (lim == null) return `${row.invites.issued} выдано · ∞`;
  return `${row.invites.issued} выдано · ${rem ?? 0}/${lim} мес.`;
}

function syncStatusLabel(row: AdminUserRow): string {
  if (row.deletedAt) return 'удалён';
  if (!row.logtoSyncedAt) return 'нет sync';
  return 'ok';
}

/** ADR-018: нельзя X-Act-As на себя или на другого admin. */
function connectBlockReason(row: AdminUserRow): string | null {
  if (row.userId === session.userId) return 'Это ваш аккаунт';
  if (row.roles.includes('admin')) return 'Нельзя войти как администратор';
  return null;
}

function canConnect(row: AdminUserRow): boolean {
  return connectBlockReason(row) == null;
}

function hardLockBlockReason(row: AdminUserRow): string | null {
  if (row.userId === session.userId) return 'Нельзя заблокировать себя';
  if (row.roles.includes('admin')) return 'Нельзя заблокировать администратора';
  return null;
}

function toggleMenu(userId: string) {
  menuOpenFor.value = menuOpenFor.value === userId ? null : userId;
}

function closeMenu() {
  menuOpenFor.value = null;
}

function onDocClick(e: MouseEvent) {
  const target = e.target as HTMLElement | null;
  if (!target?.closest('[data-admin-actions]')) closeMenu();
}

async function toggleHardLock(row: AdminUserRow) {
  closeMenu();
  const block = hardLockBlockReason(row);
  if (block) {
    toast.error(block);
    return;
  }
  const next = !row.isHardLocked;
  const label = next ? 'заблокировать' : 'разблокировать';
  if (!confirm(`Точно ${label} доступ для «${displayLabel(row)}»?`)) return;

  lockingFor.value = row.userId;
  try {
    const result = await patchAdminUserHardLock(row.userId, next);
    row.isHardLocked = result.isHardLocked;
    row.hardLockedAt = result.hardLockedAt;
    toast.success(next ? 'Жёсткая блокировка включена' : 'Блокировка снята');
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Не удалось изменить блокировку');
  } finally {
    lockingFor.value = null;
  }
}

async function forceSync(row: AdminUserRow) {
  closeMenu();
  syncingFor.value = row.userId;
  try {
    const result = await forceSyncAdminUser(row.userId);
    row.displayName = result.displayName;
    row.email = result.email;
    row.username = result.username;
    row.avatarUrl = result.avatarUrl;
    row.isSuspended = result.isSuspended;
    row.logtoSyncedAt = result.logtoSyncedAt;
    toast.success('Синхронизация с Logto выполнена');
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Не удалось синхронизировать');
  } finally {
    syncingFor.value = null;
  }
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
  document.addEventListener('click', onDocClick);
});

onUnmounted(() => {
  document.removeEventListener('click', onDocClick);
});

const subtitle = computed(() =>
  total.value ? `${total.value} пользователей` : 'Пользователи появляются после регистрации',
);

function openRoles(row: AdminUserRow) {
  closeMenu();
  rolesUser.value = row;
  initRoleDraft(row);
  rolesOpen.value = true;
}

async function saveRoles() {
  const row = rolesUser.value;
  if (!row) return;
  const draft = rolesFor(row.userId);

  savingRolesFor.value = row.userId;
  try {
    const result = await patchAdminUserRoles(row.userId, draft);
    row.roles = result.roles;
    initRoleDraft(row);
    toast.success('Роли обновлены');
    rolesOpen.value = false;
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Не удалось обновить роли');
  } finally {
    savingRolesFor.value = null;
  }
}

function openDeposit(row: AdminUserRow) {
  closeMenu();
  depositUser.value = row;
  depositAmount.value = 500;
  depositError.value = null;
  depositOpen.value = true;
}

function openReputation(row: AdminUserRow, metric: 'karma' | 'rating') {
  closeMenu();
  reputationUserId.value = row.userId;
  reputationMetric.value = metric;
  reputationVerifiedSales.value = row.rating.verifiedSales;
  reputationOpen.value = true;
}

function openWalletHistory(row: AdminUserRow) {
  closeMenu();
  void router.push({
    name: 'admin-user-wallet',
    params: { userId: row.userId },
    query: { label: displayLabel(row) },
  });
}

async function impersonate(row: AdminUserRow) {
  closeMenu();
  if (row.roles.includes('admin')) {
    toast.error('Нельзя войти как другой администратор');
    return;
  }
  if (row.userId === session.userId) {
    toast.message('Это уже ваш аккаунт');
    return;
  }
  try {
    session.startImpersonation({
      targetUserId: row.userId,
      targetDisplayName: displayLabel(row),
    });
    await refreshPlatformRoles();
    await refreshSessionBalance();
    toast.success(`Режим: ${displayLabel(row)}`);
    await router.push('/app');
  } catch (e) {
    session.stopImpersonation();
    toast.error(e instanceof Error ? e.message : 'Не удалось начать impersonation');
  }
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
        <h2 class="text-lg font-semibold">
          Пользователи
        </h2>
        <p class="text-sm text-text-muted">
          {{ subtitle }}
        </p>
      </div>
      <form
        class="flex gap-2"
        @submit.prevent="load"
      >
        <input
          v-model="search"
          type="search"
          placeholder="Имя, email или ID…"
          class="rounded-md border border-border bg-bg px-3 py-2 text-sm"
        >
        <UiButton
          intent="secondary"
          type="submit"
        >
          Найти
        </UiButton>
      </form>
    </div>

    <p
      v-if="loading"
      class="text-sm text-text-muted"
    >
      Загрузка…
    </p>
    <p
      v-else-if="error"
      class="text-sm text-danger"
    >
      {{ error }}
    </p>
    <p
      v-else-if="users.length === 0"
      class="text-sm text-text-muted"
    >
      Нет пользователей.
    </p>

    <div
      v-else
      class="grid gap-2"
    >
      <article
        v-for="row in users"
        :key="row.userId"
        class="rounded-md border border-border bg-surface px-3 py-2.5"
        :class="{ 'opacity-70': row.deletedAt }"
      >
        <!-- Header -->
        <div class="flex items-start gap-2.5">
          <div
            class="relative mt-0.5 flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-sm font-semibold text-primary"
          >
            <span aria-hidden="true">{{ avatarInitial(row) }}</span>
            <img
              v-if="row.avatarUrl && !avatarFailed[row.userId]"
              :src="row.avatarUrl"
              :alt="displayLabel(row)"
              class="absolute inset-0 size-full object-cover"
              referrerpolicy="no-referrer"
              @error="avatarFailed[row.userId] = true"
            >
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <RouterLink
                :to="{ name: 'profile-user', params: { userId: row.userId } }"
                class="truncate text-sm font-semibold text-text hover:underline"
              >
                {{ displayLabel(row) }}
              </RouterLink>
              <span
                v-if="row.userId === session.userId"
                class="rounded bg-bg px-1 py-px text-[10px] font-medium uppercase text-text-muted"
              >вы</span>
              <span
                v-for="role in roleBadges(row)"
                :key="role"
                class="rounded px-1 py-px text-[10px] font-medium uppercase tracking-wide"
                :class="{
                  'bg-primary/15 text-primary': role === 'admin',
                  'bg-amber-100 text-amber-900': role === 'moderator',
                  'bg-sky-100 text-sky-900': role === 'expert',
                  'bg-bg text-text-muted': role === 'member',
                }"
              >{{ ROLE_BADGE_LABELS[role] }}</span>
              <span
                v-if="row.isHardLocked"
                class="rounded bg-red-100 px-1 py-px text-[10px] font-medium text-red-800"
              >hard-lock</span>
              <span
                v-if="row.isSuspended"
                class="rounded bg-orange-100 px-1 py-px text-[10px] font-medium text-orange-800"
              >suspend</span>
              <span
                v-if="row.deletedAt"
                class="rounded bg-stone-200 px-1 py-px text-[10px] font-medium text-stone-700"
              >deleted</span>
              <span
                v-if="row.rating.isLimited || row.rating.banUntil"
                class="rounded bg-violet-100 px-1 py-px text-[10px] font-medium text-violet-900"
                :title="row.rating.banUntil ? `banUntil ${fmtDate(row.rating.banUntil)}` : 'isLimited'"
              >rating-ban</span>
            </div>

            <p class="mt-0.5 truncate text-xs text-text-muted">
              <span v-if="row.email">{{ row.email }} · </span>
              <code class="text-[11px]">{{ row.userId }}</code>
            </p>
          </div>

          <div
            class="relative shrink-0"
            data-admin-actions
          >
            <button
              type="button"
              class="inline-flex size-8 items-center justify-center rounded-md border border-border text-text-muted hover:bg-bg hover:text-text"
              :aria-expanded="menuOpenFor === row.userId"
              aria-haspopup="menu"
              aria-label="Действия"
              title="Действия"
              @click.stop="toggleMenu(row.userId)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                class="size-4"
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
              v-if="menuOpenFor === row.userId"
              class="absolute right-0 z-30 mt-1 w-52 overflow-hidden rounded-md border border-border bg-surface py-1 text-sm shadow-card"
              role="menu"
            >
              <button
                type="button"
                class="block w-full px-3 py-1.5 text-left hover:bg-bg"
                role="menuitem"
                @click="openDeposit(row)"
              >
                Пополнить баланс
              </button>
              <button
                type="button"
                class="block w-full px-3 py-1.5 text-left hover:bg-bg"
                role="menuitem"
                @click="openWalletHistory(row)"
              >
                История кошелька
              </button>
              <button
                type="button"
                class="block w-full px-3 py-1.5 text-left hover:bg-bg"
                role="menuitem"
                @click="openReputation(row, 'karma')"
              >
                Лог репутации
              </button>
              <RouterLink
                :to="{ name: 'profile-user', params: { userId: row.userId } }"
                class="block w-full px-3 py-1.5 text-left hover:bg-bg"
                role="menuitem"
                @click="closeMenu"
              >
                Публичный профиль
              </RouterLink>
              <button
                type="button"
                class="block w-full px-3 py-1.5 text-left hover:bg-bg"
                role="menuitem"
                @click="openRoles(row)"
              >
                Роли (Keto)
              </button>
              <button
                type="button"
                class="block w-full px-3 py-1.5 text-left hover:bg-bg disabled:opacity-50"
                role="menuitem"
                :disabled="syncingFor === row.userId"
                @click="forceSync(row)"
              >
                {{ syncingFor === row.userId ? 'Sync…' : 'Force sync Logto' }}
              </button>
              <button
                type="button"
                class="block w-full px-3 py-1.5 text-left hover:bg-bg disabled:opacity-50"
                role="menuitem"
                :disabled="lockingFor === row.userId || hardLockBlockReason(row) != null"
                :title="hardLockBlockReason(row) ?? undefined"
                @click="toggleHardLock(row)"
              >
                {{
                  lockingFor === row.userId
                    ? '…'
                    : row.isHardLocked
                      ? 'Снять hard-lock'
                      : 'Жёсткая блокировка'
                }}
              </button>
              <button
                type="button"
                class="block w-full px-3 py-1.5 text-left hover:bg-bg disabled:opacity-50"
                role="menuitem"
                :disabled="!canConnect(row)"
                :title="connectBlockReason(row) ?? undefined"
                @click="impersonate(row)"
              >
                Подключиться
              </button>
            </div>
          </div>
        </div>

        <!-- Compact meta grid -->
        <dl class="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] leading-snug sm:grid-cols-3 lg:grid-cols-4">
          <div>
            <dt class="text-text-muted">
              Баланс
            </dt>
            <dd class="font-semibold tabular-nums text-text">
              {{ formatMoney(row.balance) }}
            </dd>
          </div>
          <div>
            <dt class="text-text-muted">
              ★ / effective
            </dt>
            <dd class="tabular-nums text-text">
              {{ formatRating(row.rating.totalRating, row.rating.verifiedSales) }}
              /
              {{ formatRating(row.rating.effectiveRating, row.rating.verifiedSales) }}
              <span class="text-text-muted">· {{ formatKarma(row.rating.karma) }}</span>
            </dd>
          </div>
          <div>
            <dt class="text-text-muted">
              Sales / coverage
            </dt>
            <dd class="tabular-nums text-text">
              {{ row.rating.verifiedSales }}/{{ row.rating.pendingSales }}
              · {{ coveragePct(row.rating.feedbackCoverage) }}
            </dd>
          </div>
          <div>
            <dt class="text-text-muted">
              План
            </dt>
            <dd class="text-text">
              {{ row.plan.planId }}
              <span class="text-text-muted">
                · {{ row.plan.expiresAt ? fmtDay(row.plan.expiresAt) : '∞' }}
                · {{ row.plan.autoRenew ? 'auto' : 'manual' }}
              </span>
            </dd>
          </div>
          <div>
            <dt class="text-text-muted">
              Инвайты
            </dt>
            <dd class="text-text">
              {{ inviteQuotaLabel(row) }}
            </dd>
          </div>
          <div>
            <dt class="text-text-muted">
              Реф. дерево
            </dt>
            <dd class="tabular-nums text-text">
              L1 {{ row.referral.l1 }} · L2 {{ row.referral.l2 }}
            </dd>
          </div>
          <div class="col-span-2 sm:col-span-1 lg:col-span-2">
            <dt class="text-text-muted">
              Пригласил
            </dt>
            <dd class="truncate text-text">
              <template v-if="row.inviterId">
                <RouterLink
                  :to="{ name: 'profile-user', params: { userId: row.inviterId } }"
                  class="hover:underline"
                >
                  {{ row.inviterDisplayName || row.inviterId }}
                </RouterLink>
              </template>
              <template v-else>
                —
              </template>
            </dd>
          </div>
          <div class="col-span-2 sm:col-span-2 lg:col-span-2">
            <dt class="text-text-muted">
              Access groups
            </dt>
            <dd class="truncate text-text">
              <template v-if="row.accessGroups.length">
                {{ row.accessGroups.map((g) => g.name).join(', ') }}
              </template>
              <template v-else>
                —
              </template>
            </dd>
          </div>
          <div class="col-span-2 sm:col-span-3 lg:col-span-4">
            <dt class="text-text-muted">
              Даты / sync
            </dt>
            <dd class="text-text">
              созд. {{ fmtDay(row.createdAt) }}
              · upd {{ fmtDate(row.updatedAt) }}
              · sync {{ fmtDate(row.logtoSyncedAt) }}
              <span
                class="ml-1 rounded px-1 py-px text-[10px] font-medium uppercase"
                :class="{
                  'bg-emerald-100 text-emerald-800': syncStatusLabel(row) === 'ok',
                  'bg-orange-100 text-orange-800': syncStatusLabel(row) === 'нет sync',
                  'bg-stone-200 text-stone-700': syncStatusLabel(row) === 'удалён',
                }"
              >{{ syncStatusLabel(row) }}</span>
              <template v-if="row.deletedAt">
                · deletedAt {{ fmtDate(row.deletedAt) }}
              </template>
              <template v-if="row.rating.banUntil">
                · banUntil {{ fmtDate(row.rating.banUntil) }}
              </template>
              <template v-if="row.rating.isLimited">
                · isLimited
              </template>
            </dd>
          </div>
        </dl>
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
              <h3
                id="admin-deposit-title"
                class="text-lg font-semibold text-text"
              >
                Пополнение баланса
              </h3>
              <p class="mt-1 text-sm text-text-muted">
                {{ displayLabel(depositUser) }}
              </p>
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
              >
            </label>

            <p
              v-if="depositError"
              class="text-sm text-danger"
            >
              {{ depositError }}
            </p>

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

    <Teleport to="body">
      <div
        v-if="rolesOpen && rolesUser"
        class="fixed inset-0 z-[200] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          class="absolute inset-0 bg-black/50"
          aria-label="Закрыть"
          @click="rolesOpen = false"
        />
        <div
          class="relative z-10 w-full max-w-sm rounded-lg border border-border bg-surface p-5 shadow-card"
          @click.stop
        >
          <h3 class="text-base font-semibold">
            Роли — {{ displayLabel(rolesUser) }}
          </h3>
          <div class="mt-3 flex flex-col gap-2">
            <label
              v-for="role in MANAGED_ROLES"
              :key="role"
              class="flex items-center gap-2 text-sm"
            >
              <input
                v-model="rolesFor(rolesUser.userId)[role]"
                type="checkbox"
                class="rounded border-border"
              >
              {{ ROLE_LABELS[role] }}
            </label>
          </div>
          <div class="mt-4 flex justify-end gap-2">
            <UiButton
              intent="secondary"
              type="button"
              @click="rolesOpen = false"
            >
              Отмена
            </UiButton>
            <UiButton
              type="button"
              :disabled="savingRolesFor === rolesUser.userId"
              @click="saveRoles"
            >
              {{ savingRolesFor === rolesUser.userId ? 'Сохранение…' : 'Сохранить' }}
            </UiButton>
          </div>
        </div>
      </div>
    </Teleport>

    <ProfileReputationLogModal
      v-if="reputationUserId"
      v-model:open="reputationOpen"
      :user-id="reputationUserId"
      :metric="reputationMetric"
      :verified-sales="reputationVerifiedSales"
    />
  </section>
</template>
