<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useParametersStore } from '@/stores/parameters';
import { usePlansStore } from '@/stores/plans';
import type { Parameter } from '@/types/settings';
import ServiceSidebar from '@/components/parameters/ServiceSidebar.vue';
import ParametersTable from '@/components/parameters/ParametersTable.vue';
import ParameterEditor from '@/components/parameters/ParameterEditor.vue';

const route = useRoute();
const router = useRouter();
const parametersStore = useParametersStore();
const plansStore = usePlansStore();

const editingParameter = ref<Parameter | null>(null);
const editorOpen = ref(false);
const categoryFilter = ref<string>('');

onMounted(async () => {
  const serviceQuery = route.query.service as string | undefined;
  if (serviceQuery) {
    parametersStore.selectService(serviceQuery);
  }
  await Promise.all([
    parametersStore.fetchServices(),
    parametersStore.fetchParameters(serviceQuery),
    plansStore.fetchPlans(),
  ]);
});

watch(
  () => parametersStore.selectedService,
  (service) => {
    parametersStore.fetchParameters(service ?? undefined, categoryFilter.value || undefined);
    const query: Record<string, string> = {};
    if (service) query.service = service;
    router.replace({ query });
  }
);

watch(categoryFilter, (cat) => {
  parametersStore.fetchParameters(parametersStore.selectedService ?? undefined, cat || undefined);
});

function handleSelectService(service: string | null) {
  parametersStore.fetchParameters(service ?? undefined, categoryFilter.value || undefined);
}

function handleEdit(param: Parameter) {
  editingParameter.value = param;
  editorOpen.value = true;
}

async function handleDelete(key: string) {
  if (confirm(`Удалить параметр ${key}?`)) {
    await parametersStore.deleteParameter(key);
  }
}

function handleCloseEditor() {
  editorOpen.value = false;
  editingParameter.value = null;
}
</script>

<template>
  <div class="flex h-[calc(100vh-3rem)]">
    <ServiceSidebar @select="handleSelectService" />

    <div class="flex-1 flex flex-col">
      <div class="p-4 border-b bg-white flex items-center justify-between">
        <h1 class="text-xl font-semibold">Параметры</h1>
        <div class="flex items-center gap-3">
          <select v-model="categoryFilter" class="px-3 py-1.5 border rounded-lg text-sm">
            <option value="">Все категории</option>
            <option value="system-var">system-var</option>
            <option value="tarif-var">tarif-var</option>
            <option value="limited-user-var">limited-user-var</option>
            <option value="user-var">user-var</option>
          </select>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto">
        <ParametersTable
          :parameters="parametersStore.parameters"
          :loading="parametersStore.loading"
          @edit="handleEdit"
          @delete="handleDelete"
        />
      </div>
    </div>

    <ParameterEditor
      :parameter="editingParameter"
      :open="editorOpen"
      @close="handleCloseEditor"
    />
  </div>
</template>
