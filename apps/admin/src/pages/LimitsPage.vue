<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useLimitsStore } from '@/stores/limits';

const limitsStore = useLimitsStore();
const planFilter = ref('');

onMounted(() => {
  limitsStore.fetchLimits(undefined, planFilter.value || undefined);
});

function handleFilter() {
  limitsStore.fetchLimits(undefined, planFilter.value || undefined);
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Лимиты</h1>

    <div class="bg-white rounded-xl shadow-sm border p-4 mb-6">
      <div class="flex gap-4">
        <select v-model="planFilter" class="px-3 py-2 border rounded-lg text-sm">
          <option value="">Все планы</option>
          <option value="free">Free</option>
          <option value="basic">Basic</option>
          <option value="pro">Pro</option>
        </select>
        <button class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700" @click="handleFilter">
          Фильтровать
        </button>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User ID</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Параметр</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Период</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Остаток</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Макс</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Куплено</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-if="limitsStore.loading">
            <td colspan="6" class="px-4 py-8 text-center text-gray-500">Загрузка...</td>
          </tr>
          <tr v-else-if="limitsStore.limits.length === 0">
            <td colspan="6" class="px-4 py-8 text-center text-gray-500">Нет лимитов</td>
          </tr>
          <tr v-for="limit in limitsStore.limits" :key="`${limit.userId}-${limit.paramKey}-${limit.period}`" class="hover:bg-gray-50">
            <td class="px-4 py-3 text-sm font-mono">{{ limit.userId }}</td>
            <td class="px-4 py-3 text-sm font-mono">{{ limit.paramKey }}</td>
            <td class="px-4 py-3 text-sm">{{ limit.period }}</td>
            <td class="px-4 py-3 text-sm">{{ limit.remaining }}</td>
            <td class="px-4 py-3 text-sm">{{ limit.maxValue === -1 ? '∞' : limit.maxValue }}</td>
            <td class="px-4 py-3 text-sm">{{ limit.purchasedRemaining }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
