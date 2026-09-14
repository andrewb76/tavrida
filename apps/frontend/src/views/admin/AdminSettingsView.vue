<script setup lang="ts">
import { UiButton } from '@tavrida/ui';
import { computed, onMounted, reactive, ref } from 'vue';
import { toast } from 'vue-sonner';
import {
  CATEGORY_LABELS,
  createSettingsPlan,
  fetchSettingsParameters,
  fetchSettingsPlans,
  fetchSystemValues,
  patchSystemValues,
  type SettingsParameter,
  type SettingsPlan,
} from '@/services/settingsAdmin';

const loading = ref(true);
const savingPlans = ref(false);
const savingSystemValues = ref(false);
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

async function savePlans() {
  savingPlans.value = true;
  error.value = '';
  try {
    await Promise.all(
      plans.value.map((original) => {
        const form = planForms[original.id];
        return createSettingsPlan({
          id: form.id,
          title: form.title,
          monthlyPrice: form.monthlyPrice,
          yearlyPrice: form.yearlyPrice,
          isActive: form.isActive,
        }).catch(() =>
          fetchSettingsPlans().then((rows) => {
            const existing = rows.find((r) => r.id === form.id);
            if (existing) {
              return import('@/services/settingsAdmin').then((m) =>
                m.updateSettingsPlan(form.id, {
                  title: form.title,
                  monthlyPrice: form.monthlyPrice,
                  yearlyPrice: form.yearlyPrice,
                  isActive: form.isActive,
                }),
              );
            }
            throw new Error(`План ${form.id} не найден`);
          }),
        );
      }),
    );
    const refreshed = await fetchSettingsPlans();
    plans.value = refreshed;
    syncPlanForms(refreshed);
    toast.success('Тарифы сохранены');
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка сохранения тарифов';
    toast.error(error.value);
  } finally {
    savingPlans.value = false;
  }
}

async function saveSystemValues(domain: string) {
  savingSystemValues.value = true;
  error.value = '';
  try {
    const form = systemValueForms[domain];
    if (!form) return;
    const values: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(form)) {
      const orig = systemValues.value[domain]?.[key];
      if (typeof orig === 'number') {
        values[key] = Number(raw) || 0;
      } else if (typeof orig === 'boolean') {
        values[key] = raw === 'true';
      } else if (Array.isArray(orig)) {
        try {
          values[key] = JSON.parse(raw);
        } catch {
          values[key] = raw;
        }
      } else {
        values[key] = raw;
      }
    }
    const result = await patchSystemValues(domain, values);
    systemValues.value[domain] = result;
    syncSystemValueForms();
    toast.success(`Настройки «${domain}» сохранены`);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка сохранения системных настроек';
    toast.error(error.value);
  } finally {
    savingSystemValues.value = false;
  }
}

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
    </template>
  </section>
</template>
