<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useLimitsStore } from '@/stores/limits';

const route = useRoute();
const limitsStore = useLimitsStore();
const userId = route.params.userId as string;

onMounted(async () => {
  await limitsStore.fetchLimits(userId);
  await limitsStore.fetchUserValues(userId);
});
</script>

<template>
  <div>
    <div class="mb-6">
      <RouterLink to="/users" class="text-blue-600 hover:text-blue-800 text-sm">&larr; Назад к пользователям</RouterLink>
    </div>

    <h1 class="text-2xl font-bold mb-6">{{ userId }}</h1>

    <div v-if="limitsStore.limits.length > 0" class="mb-8">
      <h2 class="text-lg font-semibold mb-4">Лимиты</h2>
      <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Параметр</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Период</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Остаток</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Макс</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Куплено</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">До конца</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="limit in limitsStore.limits" :key="`${limit.paramKey}-${limit.period}`" class="hover:bg-gray-50">
              <td class="px-4 py-3 text-sm font-mono">{{ limit.paramKey }}</td>
              <td class="px-4 py-3 text-sm">{{ limit.period }}</td>
              <td class="px-4 py-3 text-sm">{{ limit.remaining }}</td>
              <td class="px-4 py-3 text-sm">{{ limit.maxValue === -1 ? '∞' : limit.maxValue }}</td>
              <td class="px-4 py-3 text-sm">{{ limit.purchasedRemaining }}</td>
              <td class="px-4 py-3 text-sm">{{ new Date(limit.cycleEnd).toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="limitsStore.userValues.length > 0" class="mb-8">
      <h2 class="text-lg font-semibold mb-4">Настройки (user-var)</h2>
      <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Параметр</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Значение</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="uv in limitsStore.userValues" :key="uv.paramKey" class="hover:bg-gray-50">
              <td class="px-4 py-3 text-sm font-mono">{{ uv.paramKey }}</td>
              <td class="px-4 py-3 text-sm font-mono">{{ JSON.stringify(uv.value) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="limitsStore.limits.length === 0 && limitsStore.userValues.length === 0" class="text-center py-8 text-gray-500">
      Нет данных о лимитах или настройках
    </div>
  </div>
</template>
