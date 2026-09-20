<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { usePlansStore } from '@/stores/plans';

const route = useRoute();
const plansStore = usePlansStore();
const planId = route.params.id as string;

const plan = computed(() => plansStore.plans.find(p => p.id === planId));

onMounted(async () => {
  await plansStore.fetchPlans();
  await plansStore.fetchPlanValues(planId);
});
</script>

<template>
  <div>
    <div class="mb-6">
      <RouterLink to="/plans" class="text-blue-600 hover:text-blue-800 text-sm">&larr; Назад к тарифам</RouterLink>
    </div>

    <div v-if="plan" class="bg-white rounded-xl shadow-sm border p-6 mb-6">
      <div class="flex items-start justify-between mb-4">
        <div>
          <h1 class="text-2xl font-bold">{{ plan.title }}</h1>
          <p class="text-gray-500 mt-1">{{ plan.description }}</p>
        </div>
        <span
          :class="plan.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
          class="px-3 py-1 rounded-full text-sm font-medium"
        >
          {{ plan.isActive ? 'Активен' : 'Неактивен' }}
        </span>
      </div>

      <div class="flex gap-6 text-sm">
        <div><span class="text-gray-500">ID:</span> <span class="font-mono">{{ plan.id }}</span></div>
        <div><span class="text-gray-500">Мес:</span> <span class="font-medium">{{ plan.monthlyPrice }} ₽</span></div>
        <div><span class="text-gray-500">Год:</span> <span class="font-medium">{{ plan.yearlyPrice }} ₽</span></div>
        <div><span class="text-gray-500">Порядок:</span> {{ plan.sortOrder }}</div>
      </div>
    </div>

    <h2 class="text-lg font-semibold mb-4">Значения параметров</h2>
    <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Параметр</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Значение</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-if="plansStore.planValues.length === 0">
            <td colspan="2" class="px-4 py-8 text-center text-gray-500">Нет значений</td>
          </tr>
          <tr v-for="pv in plansStore.planValues" :key="pv.paramKey" class="hover:bg-gray-50">
            <td class="px-4 py-3 text-sm font-mono">{{ pv.paramKey }}</td>
            <td class="px-4 py-3 text-sm font-mono">{{ JSON.stringify(pv.value) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
