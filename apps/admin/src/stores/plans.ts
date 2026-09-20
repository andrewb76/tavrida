import { defineStore } from 'pinia';
import { ref } from 'vue';
import { settingsApi } from '@/services/settings-api';
import type { Plan, PlanValue } from '@/types/settings';

export const usePlansStore = defineStore('plans', () => {
  const plans = ref<Plan[]>([]);
  const planValues = ref<PlanValue[]>([]);
  const loading = ref(false);

  async function fetchPlans() {
    loading.value = true;
    try {
      plans.value = await settingsApi.getPlans();
    } finally {
      loading.value = false;
    }
  }

  async function fetchPlanValues(planId?: string) {
    planValues.value = await settingsApi.getPlanValues(planId);
  }

  async function createPlan(body: Partial<Plan>) {
    await settingsApi.createPlan(body);
    await fetchPlans();
  }

  async function updatePlan(id: string, body: Partial<Plan>) {
    await settingsApi.updatePlan(id, body);
    await fetchPlans();
  }

  async function deletePlan(id: string) {
    await settingsApi.deletePlan(id);
    await fetchPlans();
  }

  async function updatePlanValue(planId: string, key: string, value: unknown) {
    await settingsApi.updatePlanValue(planId, key, value);
    await fetchPlanValues(planId);
  }

  return {
    plans,
    planValues,
    loading,
    fetchPlans,
    fetchPlanValues,
    createPlan,
    updatePlan,
    deletePlan,
    updatePlanValue,
  };
});
