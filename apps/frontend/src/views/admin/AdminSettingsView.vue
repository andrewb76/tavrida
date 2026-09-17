<script setup lang="ts">
import { UiButton } from '@tavrida/ui';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { toast } from 'vue-sonner';
import {
  CATEGORY_LABELS,
  createSettingsPlan,
  deleteUserValue,
  fetchLimitState,
  fetchPlanValues,
  fetchSettingsParameters,
  fetchSettingsPlans,
  fetchSystemValues,
  fetchUserValues,
  patchSystemValues,
  setPlanValue,
  setUserValue,
  type LimitState,
  type PlanValueRow,
  type SettingsParameter,
  type SettingsPlan,
  type UserValueRow,
} from '@/services/settingsAdmin';

const loading = ref(true);
const savingPlans = ref(false);
const savingSystemValues = ref(false);
const savingPlanValues = ref(false);
const savingUserValue = ref(false);
const error = ref('');

const plans = ref<SettingsPlan[]>([]);
const parameters = ref<SettingsParameter[]>([]);
const systemValues = ref<Record<string, Record<string, unknown>>>({});

const activeCategory = ref<string>('system-var');

const planForms = reactive<Record<string, SettingsPlan>>({});
const systemValueForms = reactive<Record<string, Record<string, string>>>({});

const categoryTabs = computed(() => {
  const cats = [...new Set(parameters.value.map((p) => p.category))].sort();
  return cats.map((c) => ({ category: c, label: CATEGORY_LABELS[c] ?? c }));
});

const filteredParameters = computed(() =>
  parameters.value.filter((p) => p.category === activeCategory.value),
);

const tarifParams = computed(() =>
  parameters.value.filter((p) => p.category === 'tarif-var'),
);

const planValues = ref<PlanValueRow[]>([]);
const planValueForms = reactive<Record<string, Record<string, string>>>({});

function syncPlanForms(rows: SettingsPlan[]) {
  for (const plan of rows) {
    planForms[plan.id] = { ...plan };
  }
}

function syncSystemValueForms() {
  for (const [domain, values] of Object.entries(systemValues.value)) {
    if (!systemValueForms[domain]) systemValueForms[domain] = {};
    for (const [key, val] of Object.entries(values)) {
      systemValueForms[domain][key] = String(val ?? '');
    }
  }
}

function syncPlanValueForms(rows: PlanValueRow[]) {
  for (const row of rows) {
    if (!planValueForms[row.planId]) planValueForms[row.planId] = {};
    planValueForms[row.planId][row.paramKey] = String(row.value ?? '');
  }
}

const userValuesTarget = ref('');
const userValuesList = ref<UserValueRow[]>([]);
const userValueKey = ref('');
const userValueRaw = ref('');
const userValueLoading = ref(false);

const limitsTarget = ref('');
const limitsList = ref<LimitState[]>([]);
const limitsLoading = ref(false);
const limitsUsageLog = ref<{ data: Record<string, unknown>[]; total: number }>({ data: [], total: 0 });

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const [planRows, paramRows] = await Promise.all([
      fetchSettingsPlans(),
      fetchSettingsParameters(),
    ]);
    plans.value = planRows;
    parameters.value = paramRows.data ?? [];
    syncPlanForms(planRows);

    const domains = [...new Set(parameters.value
      .filter((p) => p.category === 'system-var')
      .map((p) => p.key.split('.')[0]))];
    for (const domain of domains) {
      systemValues.value[domain] = await fetchSystemValues(domain);
    }
    syncSystemValueForms();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить данные';
  } finally {
    loading.value = false;
  }
}

async function loadPlanValues() {
  if (!tarifParams.value.length) return;
  try {
    const rows = await fetchPlanValues();
    planValues.value = rows;
    syncPlanValueForms(rows);
  } catch (e) {
    toast.error(`Ошибка загрузки plan values: ${e instanceof Error ? e.message : e}`);
  }
}

async function savePlanValues() {
  savingPlanValues.value = true;
  error.value = '';
  try {
    const calls: Promise<unknown>[] = [];
    for (const plan of plans.value) {
      const form = planValueForms[plan.id];
      if (!form) continue;
      for (const param of tarifParams.value) {
        const raw = form[param.key];
        if (raw === undefined) continue;
        const orig = planValues.value.find((v) => v.planId === plan.id && v.paramKey === param.key);
        const origStr = String(orig?.value ?? '');
        if (raw !== origStr) {
          const parsed = raw === '' ? null : (Number.isFinite(Number(raw)) ? Number(raw) : raw);
          calls.push(setPlanValue(plan.id, param.key, parsed));
        }
      }
    }
    if (calls.length) {
      await Promise.all(calls);
      toast.success(`Сохранено ${calls.length} значений`);
      const refreshed = await fetchPlanValues();
      planValues.value = refreshed;
      syncPlanValueForms(refreshed);
    } else {
      toast.info('Изменений нет');
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка сохранения plan values';
    toast.error(error.value);
  } finally {
    savingPlanValues.value = false;
  }
}

async function loadUserValues() {
  const userId = userValuesTarget.value.trim();
  if (!userId) return;
  userValueLoading.value = true;
  try {
    userValuesList.value = await fetchUserValues(userId);
    userValueKey.value = '';
    userValueRaw.value = '';
  } catch (e) {
    toast.error(`Ошибка: ${e instanceof Error ? e.message : e}`);
  } finally {
    userValueLoading.value = false;
  }
}

async function saveUserValue() {
  const userId = userValuesTarget.value.trim();
  const key = userValueKey.value.trim();
  if (!userId || !key) return;
  savingUserValue.value = true;
  try {
    const parsed = userValueRaw.value === '' ? null : (Number.isFinite(Number(userValueRaw.value)) ? Number(userValueRaw.value) : userValueRaw.value);
    await setUserValue(userId, key, parsed);
    toast.success(`Пользовательское значение ${key} сохранено`);
    await loadUserValues();
  } catch (e) {
    toast.error(`Ошибка: ${e instanceof Error ? e.message : e}`);
  } finally {
    savingUserValue.value = false;
  }
}

async function removeUserValue(userId: string, key: string) {
  try {
    await deleteUserValue(userId, key);
    toast.success(`Удалено: ${key}`);
    await loadUserValues();
  } catch (e) {
    toast.error(`Ошибка: ${e instanceof Error ? e.message : e}`);
  }
}

async function loadLimits() {
  const userId = limitsTarget.value.trim();
  if (!userId) return;
  limitsLoading.value = true;
  try {
    const result = await fetchLimitState(userId);
    limitsList.value = result.limits ?? [];
  } catch (e) {
    toast.error(`Ошибка: ${e instanceof Error ? e.message : e}`);
  } finally {
    limitsLoading.value = false;
  }
}

watch(activeCategory, (cat) => {
  if (cat === 'tarif-var' && !planValues.value.length) {
    void loadPlanValues();
  }
});

onMounted(() => {
  void load();
});
</script>

<template>
  <section class="space-y-8">
    <div>
      <h2 class="text-lg font-semibold">
        Настройки (settings)
      </h2>
      <p class="text-sm text-text-muted">
        Единый сервис параметров: системные, тарифные, лимитные и пользовательские.
      </p>
    </div>

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

    <template v-else>
      <!-- Plans -->
      <section class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="font-medium">
            Тарифы
          </h3>
          <UiButton
            intent="primary"
            :disabled="savingPlans"
            @click="savePlans"
          >
            {{ savingPlans ? 'Сохранение…' : 'Сохранить тарифы' }}
          </UiButton>
        </div>

        <div class="overflow-x-auto rounded-lg border border-border">
          <table class="min-w-full text-sm">
            <thead class="bg-bg text-left text-text-muted">
              <tr>
                <th scope="col" class="px-3 py-2 font-medium">
                  План
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  ₽ / мес
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  ₽ / год
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  Активен
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="plan in plans"
                :key="plan.id"
                class="border-t border-border"
              >
                <td class="px-3 py-2">
                  <div class="font-medium">
                    {{ planForms[plan.id]?.title ?? plan.title }}
                  </div>
                  <div class="text-xs text-text-muted">
                    {{ plan.id }}
                  </div>
                </td>
                <td class="px-3 py-2">
                  <input
                    v-model="planForms[plan.id].monthlyPrice"
                    type="text"
                    class="w-28 rounded-md border border-border bg-bg px-2 py-1"
                    :aria-label="`${plan.title}, цена за месяц`"
                    :disabled="plan.id === 'free'"
                  >
                </td>
                <td class="px-3 py-2">
                  <input
                    v-model="planForms[plan.id].yearlyPrice"
                    type="text"
                    class="w-28 rounded-md border border-border bg-bg px-2 py-1"
                    :aria-label="`${plan.title}, цена за год`"
                    :disabled="plan.id === 'free'"
                  >
                </td>
                <td class="px-3 py-2">
                  <input
                    v-model="planForms[plan.id].isActive"
                    type="checkbox"
                    class="size-4 rounded border-border"
                    :aria-label="`${plan.title}, активен`"
                    :disabled="plan.id === 'free'"
                  >
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Parameters by category -->
      <section class="space-y-4">
        <h3 class="font-medium">
          Параметры
        </h3>

        <nav
          v-if="categoryTabs.length"
          class="flex flex-wrap gap-2 border-b border-border pb-2"
          aria-label="Категории параметров"
        >
          <button
            v-for="tab in categoryTabs"
            :key="tab.category"
            type="button"
            class="rounded-md px-3 py-1.5 text-sm transition-colors"
            :class="
              activeCategory === tab.category
                ? 'bg-primary/10 font-medium text-primary'
                : 'text-text-muted hover:bg-bg hover:text-text'
            "
            @click="activeCategory = tab.category"
          >
            {{ tab.label }}
          </button>
        </nav>

        <div
          v-if="filteredParameters.length"
          class="overflow-x-auto rounded-lg border border-border"
        >
          <table class="min-w-full text-sm">
            <thead class="bg-bg text-left text-text-muted">
              <tr>
                <th scope="col" class="px-3 py-2 font-medium">
                  Ключ
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  Название
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  Сервис
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  Тип
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  Override
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="param in filteredParameters"
                :key="param.key"
                class="border-t border-border"
              >
                <td class="px-3 py-2 font-mono text-xs">
                  {{ param.key }}
                </td>
                <td class="px-3 py-2">
                  {{ param.name }}
                  <span
                    v-if="param.description"
                    class="text-xs text-text-muted"
                  > · {{ param.description }}</span>
                </td>
                <td class="px-3 py-2 text-xs text-text-muted">
                  {{ param.service }}
                </td>
                <td class="px-3 py-2 text-xs text-text-muted">
                  {{ param.paramType }}
                </td>
                <td class="px-3 py-2 text-xs text-text-muted">
                  {{ param.userOverride ? 'да' : 'нет' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p
          v-else
          class="text-sm text-text-muted"
        >
          Нет параметров в категории «{{ CATEGORY_LABELS[activeCategory] ?? activeCategory }}».
        </p>
      </section>

      <!-- System values by domain -->
      <section
        v-if="activeCategory === 'system-var' && Object.keys(systemValues).length"
        class="space-y-4"
      >
        <h3 class="font-medium">
          Системные значения
        </h3>

        <div
          v-for="(values, domain) in systemValues"
          :key="domain"
          class="space-y-2 rounded-lg border border-border p-4"
        >
          <div class="flex items-center justify-between">
            <h4 class="font-medium">
              {{ domain }}
            </h4>
            <UiButton
              intent="secondary"
              size="sm"
              :disabled="savingSystemValues"
              @click="saveSystemValues(String(domain))"
            >
              {{ savingSystemValues ? '…' : 'Сохранить' }}
            </UiButton>
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <div
              v-for="(val, key) in values"
              :key="String(key)"
            >
              <label class="mb-1 block text-xs text-text-muted">{{ key }}</label>
              <input
                v-if="typeof val === 'boolean'"
                :checked="systemValueForms[domain]?.[String(key)] === 'true'"
                type="checkbox"
                class="size-4 rounded border-border"
                @change="systemValueForms[domain][String(key)] = String(($event.target as HTMLInputElement).checked)"
              >
              <input
                v-else-if="Array.isArray(val)"
                v-model="systemValueForms[domain][String(key)]"
                type="text"
                class="w-full rounded-md border border-border bg-bg px-2 py-1 font-mono text-xs"
              >
              <input
                v-else
                v-model="systemValueForms[domain][String(key)]"
                type="text"
                class="w-full rounded-md border border-border bg-bg px-2 py-1"
              >
            </div>
          </div>
        </div>
      </section>

      <!-- Plan values matrix (tarif-var) -->
      <section
        v-if="activeCategory === 'tarif-var' && tarifParams.length"
        class="space-y-4"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 class="font-medium">
              Значения по тарифам
            </h3>
            <p class="text-xs text-text-muted">
              Значения параметров для каждого тарифного плана.
            </p>
          </div>
          <UiButton
            intent="primary"
            :disabled="savingPlanValues"
            @click="savePlanValues"
          >
            {{ savingPlanValues ? 'Сохранение…' : 'Сохранить' }}
          </UiButton>
        </div>

        <div class="overflow-x-auto rounded-lg border border-border">
          <table class="w-full table-fixed text-sm">
            <colgroup>
              <col class="w-[40%]">
              <col
                v-for="plan in plans"
                :key="`col-${plan.id}`"
                class="w-[15%]"
              >
            </colgroup>
            <thead class="bg-bg text-left text-text-muted">
              <tr>
                <th scope="col" class="px-3 py-2 font-medium">
                  Параметр
                </th>
                <th
                  v-for="plan in plans"
                  :key="plan.id"
                  scope="col"
                  class="px-3 py-2 font-medium"
                >
                  {{ plan.title }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="param in tarifParams"
                :key="param.key"
                class="border-t border-border"
              >
                <td class="px-3 py-2">
                  <div class="font-medium">
                    {{ param.name }}
                  </div>
                  <div class="truncate font-mono text-xs text-text-muted">
                    {{ param.key }}
                  </div>
                </td>
                <td
                  v-for="plan in plans"
                  :key="`${param.key}-${plan.id}`"
                  class="px-3 py-2"
                >
                  <input
                    v-model="planValueForms[plan.id]?.[param.key]"
                    type="text"
                    class="w-full max-w-24 rounded-md border border-border bg-bg px-2 py-1"
                    :aria-label="`${param.name}, ${plan.title}`"
                    :disabled="plan.id === 'free'"
                  >
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- User values -->
      <section class="space-y-4">
        <h3 class="font-medium">
          Пользовательские значения
        </h3>

        <div class="flex items-end gap-3">
          <div class="flex-1">
            <label class="mb-1 block text-xs text-text-muted">User ID</label>
            <input
              v-model="userValuesTarget"
              type="text"
              placeholder="user-id"
              class="w-full rounded-md border border-border bg-bg px-2 py-1"
              @keydown.enter="loadUserValues"
            >
          </div>
          <UiButton
            intent="secondary"
            :disabled="userValueLoading || !userValuesTarget.trim()"
            @click="loadUserValues"
          >
            {{ userValueLoading ? '…' : 'Загрузить' }}
          </UiButton>
        </div>

        <div
          v-if="userValuesList.length"
          class="space-y-3"
        >
          <div class="overflow-x-auto rounded-lg border border-border">
            <table class="min-w-full text-sm">
              <thead class="bg-bg text-left text-text-muted">
                <tr>
                  <th scope="col" class="px-3 py-2 font-medium">
                    Ключ
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    Значение
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="uv in userValuesList"
                  :key="uv.paramKey"
                  class="border-t border-border"
                >
                  <td class="px-3 py-2 font-mono text-xs">
                    {{ uv.paramKey }}
                  </td>
                  <td class="px-3 py-2">
                    {{ String(uv.value) }}
                  </td>
                  <td class="px-3 py-2">
                    <button
                      type="button"
                      class="text-xs text-error hover:underline"
                      @click="removeUserValue(userValuesTarget.trim(), uv.paramKey)"
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div
          v-else-if="userValuesTarget.trim() && !userValueLoading"
          class="text-sm text-text-muted"
        >
          Нет пользовательских значений для этого пользователя.
        </div>

        <div
          v-if="userValuesTarget.trim()"
          class="flex items-end gap-3 rounded-lg border border-border p-3"
        >
          <div class="flex-1">
            <label class="mb-1 block text-xs text-text-muted">Ключ параметра</label>
            <input
              v-model="userValueKey"
              type="text"
              placeholder="forum.topic.maxTags"
              class="w-full rounded-md border border-border bg-bg px-2 py-1 font-mono text-xs"
            >
          </div>
          <div class="flex-1">
            <label class="mb-1 block text-xs text-text-muted">Значение</label>
            <input
              v-model="userValueRaw"
              type="text"
              placeholder="5"
              class="w-full rounded-md border border-border bg-bg px-2 py-1"
            >
          </div>
          <UiButton
            intent="primary"
            size="sm"
            :disabled="savingUserValue || !userValueKey.trim()"
            @click="saveUserValue"
          >
            {{ savingUserValue ? '…' : 'Добавить / Обновить' }}
          </UiButton>
        </div>
      </section>

      <!-- Limits state -->
      <section class="space-y-4">
        <h3 class="font-medium">
          Лимиты пользователя
        </h3>

        <div class="flex items-end gap-3">
          <div class="flex-1">
            <label class="mb-1 block text-xs text-text-muted">User ID</label>
            <input
              v-model="limitsTarget"
              type="text"
              placeholder="user-id"
              class="w-full rounded-md border border-border bg-bg px-2 py-1"
              @keydown.enter="loadLimits"
            >
          </div>
          <UiButton
            intent="secondary"
            :disabled="limitsLoading || !limitsTarget.trim()"
            @click="loadLimits"
          >
            {{ limitsLoading ? '…' : 'Показать лимиты' }}
          </UiButton>
        </div>

        <div
          v-if="limitsList.length"
          class="overflow-x-auto rounded-lg border border-border"
        >
          <table class="min-w-full text-sm">
            <thead class="bg-bg text-left text-text-muted">
              <tr>
                <th scope="col" class="px-3 py-2 font-medium">
                  Параметр
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  Период
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  Осталось
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  Лимит
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  План
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  Сброс
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(limit, idx) in limitsList"
                :key="`${limit.paramKey}-${limit.period}-${idx}`"
                class="border-t border-border"
              >
                <td class="px-3 py-2 font-mono text-xs">
                  {{ limit.paramKey }}
                </td>
                <td class="px-3 py-2">
                  {{ limit.period }}
                </td>
                <td
                  class="px-3 py-2 font-medium"
                  :class="limit.remaining === 0 ? 'text-error' : limit.remaining < limit.maxValue * 0.2 ? 'text-amber-600' : 'text-success'"
                >
                  {{ limit.remaining }}
                </td>
                <td class="px-3 py-2">
                  {{ limit.maxValue }}
                </td>
                <td class="px-3 py-2 text-xs text-text-muted">
                  {{ limit.planId }}
                </td>
                <td class="px-3 py-2 text-xs text-text-muted">
                  {{ new Date(limit.cycleEnd).toLocaleString() }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p
          v-else-if="limitsTarget.trim() && !limitsLoading"
          class="text-sm text-text-muted"
        >
          Нет активных лимитов для этого пользователя.
        </p>
      </section>
    </template>
  </section>
</template>
