import { defineStore } from 'pinia';
import { ref } from 'vue';
import { settingsApi } from '@/services/settings-api';
import type { UsageLogEntry, UserLimit, UserSubscription, UserValue } from '@/types/settings';

export const useLimitsStore = defineStore('limits', () => {
  const limits = ref<UserLimit[]>([]);
  const subscriptions = ref<UserSubscription[]>([]);
  const userValues = ref<UserValue[]>([]);
  const usageLog = ref<UsageLogEntry[]>([]);
  const totalLogEntries = ref(0);
  const loading = ref(false);

  async function fetchLimits(userId?: string, planId?: string) {
    loading.value = true;
    try {
      limits.value = await settingsApi.getUserLimits(userId, planId);
    } finally {
      loading.value = false;
    }
  }

  async function fetchSubscriptions(params?: { planId?: string; status?: string }) {
    loading.value = true;
    try {
      subscriptions.value = await settingsApi.getSubscriptions(params);
    } finally {
      loading.value = false;
    }
  }

  async function fetchUserValues(userId: string) {
    userValues.value = await settingsApi.getUserValues(userId);
  }

  async function grantLimit(body: { userId: string; key: string; period: string; amount: number; reason?: string }) {
    await settingsApi.grantLimit(body);
    await fetchLimits(body.userId);
  }

  async function fetchUsageLog(params: Record<string, unknown>) {
    loading.value = true;
    try {
      const result = await settingsApi.getUsageLog(params);
      usageLog.value = result.data;
      totalLogEntries.value = result.total;
    } finally {
      loading.value = false;
    }
  }

  return {
    limits,
    subscriptions,
    userValues,
    usageLog,
    totalLogEntries,
    loading,
    fetchLimits,
    fetchSubscriptions,
    fetchUserValues,
    grantLimit,
    fetchUsageLog,
  };
});
