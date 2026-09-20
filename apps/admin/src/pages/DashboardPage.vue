<script setup lang="ts">
import { onMounted } from 'vue';
import { useParametersStore } from '@/stores/parameters';
import { usePlansStore } from '@/stores/plans';

const parametersStore = useParametersStore();
const plansStore = usePlansStore();

onMounted(async () => {
  await Promise.all([
    parametersStore.fetchServices(),
    parametersStore.fetchParameters(),
    plansStore.fetchPlans(),
  ]);
});

const stats = [
  { label: 'Сервисов', value: () => parametersStore.services.length, color: 'bg-blue-500' },
  { label: 'Параметров', value: () => parametersStore.parameters.length, color: 'bg-green-500' },
  { label: 'Тарифов', value: () => plansStore.plans.filter(p => p.isActive).length, color: 'bg-purple-500' },
];
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Обзор</h1>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="bg-white rounded-lg shadow p-4"
      >
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg" :class="stat.color">
            {{ stat.value() }}
          </div>
          <div>
            <div class="text-sm text-gray-500">{{ stat.label }}</div>
            <div class="text-2xl font-bold">{{ stat.value() }}</div>
          </div>
        </div>
      </div>
    </div>

    <h2 class="text-lg font-semibold mb-4">Сервисы</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <RouterLink
        v-for="svc in parametersStore.services"
        :key="svc.name"
        :to="`/parameters?service=${svc.name}`"
        class="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
      >
        <div class="font-medium">{{ svc.name }}</div>
        <div class="text-sm text-gray-500">{{ svc.parameterCount }} параметров</div>
      </RouterLink>
    </div>
  </div>
</template>
