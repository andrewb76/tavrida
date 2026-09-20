import { defineStore } from 'pinia';
import { ref } from 'vue';
import { settingsApi } from '@/services/settings-api';
import type { Parameter, ServiceInfo, SystemValue } from '@/types/settings';

export const useParametersStore = defineStore('parameters', () => {
  const services = ref<ServiceInfo[]>([]);
  const parameters = ref<Parameter[]>([]);
  const systemValues = ref<SystemValue[]>([]);
  const selectedService = ref<string | null>(null);
  const loading = ref(false);

  async function fetchServices() {
    loading.value = true;
    try {
      services.value = await settingsApi.getServices();
    } finally {
      loading.value = false;
    }
  }

  async function fetchParameters(service?: string, category?: string) {
    loading.value = true;
    try {
      parameters.value = await settingsApi.getParameters(service ?? undefined, category ?? undefined);
    } finally {
      loading.value = false;
    }
  }

  async function fetchSystemValues(domain?: string) {
    systemValues.value = await settingsApi.getSystemValues(domain);
  }

  async function updateSystemValue(key: string, value: unknown) {
    await settingsApi.updateSystemValue(key, value);
    await fetchSystemValues();
  }

  async function createParameter(body: Partial<Parameter>) {
    await settingsApi.createParameter(body);
    await fetchParameters(selectedService.value ?? undefined);
    await fetchServices();
  }

  async function updateParameter(key: string, body: Partial<Parameter>) {
    await settingsApi.updateParameter(key, body);
    await fetchParameters(selectedService.value ?? undefined);
  }

  async function deleteParameter(key: string) {
    await settingsApi.deleteParameter(key);
    await fetchParameters(selectedService.value ?? undefined);
    await fetchServices();
  }

  function selectService(service: string | null) {
    selectedService.value = service;
  }

  return {
    services,
    parameters,
    systemValues,
    selectedService,
    loading,
    fetchServices,
    fetchParameters,
    fetchSystemValues,
    updateSystemValue,
    createParameter,
    updateParameter,
    deleteParameter,
    selectService,
  };
});
