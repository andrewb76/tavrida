<script setup lang="ts">
import { UiButton } from '@tavrida/ui';
import { computed, onMounted, reactive, ref } from 'vue';
import { toast } from 'vue-sonner';
import {
  deletePlanVariable,
  fetchAdminPlans,
  fetchPlanVariables,
  formatLimitValue,
  PLAN_CONFIG_TIER_IDS,
  saveAdminPlan,
  savePlanVariable,
  serviceTabLabel,
  variableGroupKey,
  type AdminPlan,
  type PlanVariable,
} from '@/services/planConfigAdmin';

const loading = ref(true);
const savingPlans = ref(false);
const savingVariableKey = ref<string | null>(null);
const deletingVariableKey = ref<string | null>(null);
const error = ref('');

const plans = ref<AdminPlan[]>([]);
const variables = ref<PlanVariable[]>([]);
const activeService = ref('');

const planForms = reactive<Record<string, AdminPlan>>({});
const variableForms = reactive<
  Record<
    string,
    Record<
      string,
      {
        limitValue: string | number;
        isFeatureEnabled: boolean;
        priceAmount: string | number;
        isEnabled: boolean;
      }
    >
  >
>({});

const planColumns = computed(() =>
  PLAN_CONFIG_TIER_IDS.map((id) => ({
    id,
    title: plans.value.find((p) => p.id === id)?.title ?? id,
  })),
);

const serviceTabs = computed(() => {
  const services = [...new Set(variables.value.map((v) => v.service))].sort();
  return services.map((service) => ({
    service,
    label: serviceTabLabel(service),
  }));
});

const activeVariables = computed(() =>
  variables.value.filter((v) => v.service === activeService.value),
);

const groupedVariables = computed(() => {
  const groups = new Map<string, PlanVariable[]>();
  for (const variable of activeVariables.value) {
    const group = variableGroupKey(variable.key);
    const list = groups.get(group) ?? [];
    list.push(variable);
    groups.set(group, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, rows]) => ({
      group,
      rows: rows.sort((a, b) => a.key.localeCompare(b.key)),
    }));
});

function syncPlanForms(rows: AdminPlan[]) {
  for (const plan of rows) {
    planForms[plan.id] = { ...plan };
  }
}

function syncVariableForms(rows: PlanVariable[]) {
  for (const variable of rows) {
    const entry: Record<
      string,
      {
        limitValue: string | number;
        isFeatureEnabled: boolean;
        priceAmount: string | number;
        isEnabled: boolean;
      }
    > = {};
    for (const planId of PLAN_CONFIG_TIER_IDS) {
      const tier = variable.tiers[planId];
      entry[planId] = {
        limitValue: tier?.limitValue != null ? String(tier.limitValue) : '',
        isFeatureEnabled: tier?.isFeatureEnabled ?? false,
        priceAmount: tier?.priceAmount != null ? String(tier.priceAmount) : '',
        isEnabled: tier?.isEnabled ?? false,
      };
    }
    variableForms[variable.key] = entry;
  }
}

function ensureActiveService() {
  if (!serviceTabs.value.length) {
    activeService.value = '';
    return;
  }
  if (!serviceTabs.value.some((tab) => tab.service === activeService.value)) {
    activeService.value = serviceTabs.value[0].service;
  }
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const [planRows, variableRows] = await Promise.all([fetchAdminPlans(), fetchPlanVariables()]);
    plans.value = planRows;
    variables.value = variableRows;
    syncPlanForms(planRows);
    syncVariableForms(variableRows);
    ensureActiveService();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить plan-config';
  } finally {
    loading.value = false;
  }
}

async function savePlans() {
  savingPlans.value = true;
  error.value = '';
  try {
    const updated = await Promise.all(
      plans.value.map((original) => {
        const form = planForms[original.id];
        return saveAdminPlan(original.id, {
          title: form.title,
          description: form.description,
          monthlyPrice: Number(form.monthlyPrice),
          yearlyPrice: Number(form.yearlyPrice),
          isActive: form.isActive,
        });
      }),
    );
    plans.value = updated;
    syncPlanForms(updated);
    toast.success('Цены тарифов сохранены');
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка сохранения тарифов';
    toast.error(error.value);
  } finally {
    savingPlans.value = false;
  }
}

async function saveVariable(variable: PlanVariable) {
  savingVariableKey.value = variable.key;
  error.value = '';
  try {
    const form = variableForms[variable.key];
    const tierValues: Record<
      string,
      {
        limitValue?: number | null;
        isFeatureEnabled?: boolean;
        priceAmount?: number | null;
        isEnabled?: boolean;
      }
    > = {};

    for (const planId of PLAN_CONFIG_TIER_IDS) {
      const cell = form[planId];
      if (variable.valueType === 'feature') {
        tierValues[planId] = { isFeatureEnabled: cell.isFeatureEnabled };
      } else if (variable.valueType === 'price') {
        tierValues[planId] = {
          priceAmount: Number(cell.priceAmount) || 0,
          isEnabled: cell.isEnabled,
        };
      } else {
        const raw = String(cell.limitValue ?? '').trim();
        tierValues[planId] = {
          limitValue: raw === '' ? null : Number(raw),
        };
      }
    }

    await savePlanVariable(variable.key, tierValues);
    toast.success(`Сохранено: ${variable.name}`);
    const refreshed = await fetchPlanVariables();
    variables.value = refreshed;
    syncVariableForms(refreshed);
    ensureActiveService();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка сохранения переменной';
    toast.error(error.value);
  } finally {
    savingVariableKey.value = null;
  }
}

async function deleteVariable(variable: PlanVariable) {
  if (!window.confirm(`Удалить переменную ${variable.key} и все значения по тарифам?`)) return;

  deletingVariableKey.value = variable.key;
  error.value = '';
  try {
    await deletePlanVariable(variable.key);
    toast.success(`Удалена: ${variable.key}`);
    const refreshed = await fetchPlanVariables();
    variables.value = refreshed;
    syncVariableForms(refreshed);
    ensureActiveService();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка удаления';
    toast.error(error.value);
  } finally {
    deletingVariableKey.value = null;
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
        Тарифы (plan-config)
      </h2>
      <p class="text-sm text-text-muted">
        Планы, plan variables и разовые цены (<code class="text-xs">valueType: price</code>) из
        <code>plan-config</code> — влияют на <code>/plans</code>, <code>billing.charge</code> и
        <code>limits/check</code>.
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
      <section class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="font-medium">
            Тарифы (цены подписки)
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
                <th class="px-3 py-2 font-medium">
                  План
                </th>
                <th class="px-3 py-2 font-medium">
                  ₽ / мес
                </th>
                <th class="px-3 py-2 font-medium">
                  ₽ / год
                </th>
                <th class="px-3 py-2 font-medium">
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
                    {{ planForms[plan.id].title }}
                  </div>
                  <div class="text-xs text-text-muted">
                    {{ plan.id }}
                  </div>
                </td>
                <td class="px-3 py-2">
                  <input
                    v-model.number="planForms[plan.id].monthlyPrice"
                    type="number"
                    min="0"
                    step="1"
                    class="w-28 rounded-md border border-border bg-bg px-2 py-1"
                    :disabled="plan.id === 'free'"
                  >
                </td>
                <td class="px-3 py-2">
                  <input
                    v-model.number="planForms[plan.id].yearlyPrice"
                    type="number"
                    min="0"
                    step="1"
                    class="w-28 rounded-md border border-border bg-bg px-2 py-1"
                    :disabled="plan.id === 'free'"
                  >
                </td>
                <td class="px-3 py-2">
                  <input
                    v-model="planForms[plan.id].isActive"
                    type="checkbox"
                    class="size-4 rounded border-border"
                    :disabled="plan.id === 'free'"
                  >
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="space-y-4">
        <h3 class="font-medium">
          Plan variables по сервисам
        </h3>
        <p class="text-xs text-text-muted">
          <code>-1</code> = без лимита. Переменные регистрируют domain-сервисы при старте; если ключ
          исчез из манифеста — <strong>Зависший</strong> (удаление только вручную). Quote разовой
          цены: <code>GET /api/v1/charges/quote?key=…</code>.
        </p>

        <nav
          v-if="serviceTabs.length"
          class="flex flex-wrap gap-2 border-b border-border pb-2"
          aria-label="Сервисы plan-config"
        >
          <button
            v-for="tab in serviceTabs"
            :key="tab.service"
            type="button"
            class="rounded-md px-3 py-1.5 text-sm transition-colors"
            :class="
              activeService === tab.service
                ? 'bg-primary/10 font-medium text-primary'
                : 'text-text-muted hover:bg-bg hover:text-text'
            "
            @click="activeService = tab.service"
          >
            {{ tab.label }}
          </button>
        </nav>

        <div
          v-if="groupedVariables.length"
          class="overflow-x-auto rounded-lg border border-border"
        >
          <table class="w-full table-fixed text-sm">
            <colgroup>
              <col class="w-[40%]">
              <col
                v-for="col in planColumns"
                :key="`col-${col.id}`"
                class="w-[14%]"
              >
              <col class="w-[8rem]">
            </colgroup>
            <thead class="bg-bg text-left text-text-muted">
              <tr>
                <th class="px-3 py-2 font-medium">
                  Переменная
                </th>
                <th
                  v-for="col in planColumns"
                  :key="col.id"
                  class="px-3 py-2 font-medium"
                >
                  {{ col.title }}
                </th>
                <th class="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              <template
                v-for="{ group, rows } in groupedVariables"
                :key="group"
              >
                <tr class="border-t border-border bg-bg/70">
                  <td
                    :colspan="planColumns.length + 2"
                    class="px-3 py-1.5 text-xs font-medium tracking-wide text-text-muted"
                  >
                    {{ group }}
                  </td>
                </tr>
                <tr
                  v-for="variable in rows"
                  :key="variable.key"
                  class="border-t border-border align-top"
                  :class="variable.syncStatus === 'stale' ? 'bg-amber-500/5' : ''"
                >
                  <td class="px-3 py-2">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="font-medium">{{ variable.name }}</span>
                      <span
                        v-if="variable.syncStatus === 'stale'"
                        class="rounded bg-amber-500/15 px-1.5 py-0.5 text-xs text-amber-800 dark:text-amber-300"
                        title="Сервис больше не передаёт этот ключ в sync-манифесте"
                      >
                        Зависший
                      </span>
                    </div>
                    <div class="truncate font-mono text-xs text-text-muted">
                      {{ variable.key }}
                    </div>
                    <div class="text-xs text-text-muted">
                      {{ variable.valueType }}
                      <span v-if="variable.description">· {{ variable.description }}</span>
                    </div>
                  </td>
                  <td
                    v-for="col in planColumns"
                    :key="`${variable.key}-${col.id}`"
                    class="px-3 py-2"
                  >
                    <template v-if="variable.valueType === 'feature'">
                      <label class="inline-flex items-center gap-1">
                        <input
                          v-model="variableForms[variable.key][col.id].isFeatureEnabled"
                          type="checkbox"
                          class="size-4 rounded border-border"
                        >
                        <span class="text-xs">
                          {{ variableForms[variable.key][col.id].isFeatureEnabled ? 'да' : 'нет' }}
                        </span>
                      </label>
                    </template>
                    <template v-else-if="variable.valueType === 'price'">
                      <div class="space-y-1">
                        <input
                          v-model="variableForms[variable.key][col.id].priceAmount"
                          type="number"
                          min="0"
                          step="1"
                          class="w-full max-w-24 rounded-md border border-border bg-bg px-2 py-1"
                        >
                        <label class="flex items-center gap-1 text-xs text-text-muted">
                          <input
                            v-model="variableForms[variable.key][col.id].isEnabled"
                            type="checkbox"
                            class="size-3.5 rounded border-border"
                          >
                          вкл.
                        </label>
                      </div>
                    </template>
                    <template v-else>
                      <input
                        v-model="variableForms[variable.key][col.id].limitValue"
                        type="number"
                        class="w-full max-w-24 rounded-md border border-border bg-bg px-2 py-1"
                        :placeholder="formatLimitValue(null)"
                      >
                    </template>
                  </td>
                  <td class="space-y-1 px-3 py-2">
                    <UiButton
                      intent="secondary"
                      size="sm"
                      :disabled="savingVariableKey === variable.key"
                      @click="saveVariable(variable)"
                    >
                      {{ savingVariableKey === variable.key ? '…' : 'Сохранить' }}
                    </UiButton>
                    <UiButton
                      v-if="variable.syncStatus === 'stale'"
                      intent="secondary"
                      size="sm"
                      :disabled="deletingVariableKey === variable.key"
                      @click="deleteVariable(variable)"
                    >
                      {{ deletingVariableKey === variable.key ? '…' : 'Удалить' }}
                    </UiButton>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <p
          v-else
          class="text-sm text-text-muted"
        >
          Нет plan variables для выбранного сервиса.
        </p>
      </section>
    </template>
  </section>
</template>
