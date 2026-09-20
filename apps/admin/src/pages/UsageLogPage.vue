<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useLimitsStore } from '@/stores/limits';

const limitsStore = useLimitsStore();
const filters = ref({
  userId: '',
  key: '',
  period: '',
  source: '',
  dateFrom: '',
  dateTo: '',
});
const page = ref(1);
const pageSize = 20;

onMounted(() => {
  handleSearch();
});

function handleSearch() {
  limitsStore.fetchUsageLog({
    ...filters.value,
    page: page.value,
    pageSize,
  });
}

const sourceLabels: Record<string, string> = {
  base: 'base',
  purchased: 'purchased',
  grant: 'grant',
  restore: 'restore',
};

const sourceColors: Record<string, string> = {
  base: 'bg-gray-100 text-gray-700',
  purchased: 'bg-blue-100 text-blue-700',
  grant: 'bg-green-100 text-green-700',
  restore: 'bg-yellow-100 text-yellow-700',
};
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Лог использований</h1>

    <div class="bg-white rounded-xl shadow-sm border p-4 mb-6">
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <input v-model="filters.userId" placeholder="User ID" class="px-3 py-2 border rounded-lg text-sm" />
        <input v-model="filters.key" placeholder="Параметр" class="px-3 py-2 border rounded-lg text-sm" />
        <select v-model="filters.period" class="px-3 py-2 border rounded-lg text-sm">
          <option value="">Все периоды</option>
          <option value="hour">Час</option>
          <option value="day">Сутки</option>
          <option value="week">Неделя</option>
          <option value="month">Месяц</option>
        </select>
        <select v-model="filters.source" class="px-3 py-2 border rounded-lg text-sm">
          <option value="">Все источники</option>
          <option value="base">base</option>
          <option value="purchased">purchased</option>
          <option value="grant">grant</option>
          <option value="restore">restore</option>
        </select>
        <input v-model="filters.dateFrom" type="date" class="px-3 py-2 border rounded-lg text-sm" />
        <input v-model="filters.dateTo" type="date" class="px-3 py-2 border rounded-lg text-sm" />
      </div>
      <button class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700" @click="handleSearch">
        Найти
      </button>
    </div>

    <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Время</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Пользователь</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Параметр</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Период</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Δ</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Остаток</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Источник</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-if="limitsStore.loading">
            <td colspan="7" class="px-4 py-8 text-center text-gray-500">Загрузка...</td>
          </tr>
          <tr v-else-if="limitsStore.usageLog.length === 0">
            <td colspan="7" class="px-4 py-8 text-center text-gray-500">Нет записей</td>
          </tr>
          <tr v-for="entry in limitsStore.usageLog" :key="entry.id" class="hover:bg-gray-50">
            <td class="px-4 py-3 text-sm">{{ new Date(entry.createdAt).toLocaleString() }}</td>
            <td class="px-4 py-3 text-sm font-mono">{{ entry.userId }}</td>
            <td class="px-4 py-3 text-sm font-mono">{{ entry.paramKey }}</td>
            <td class="px-4 py-3 text-sm">{{ entry.period }}</td>
            <td class="px-4 py-3 text-sm font-mono" :class="entry.delta < 0 ? 'text-red-600' : 'text-green-600'">
              {{ entry.delta > 0 ? '+' : '' }}{{ entry.delta }}
            </td>
            <td class="px-4 py-3 text-sm">{{ entry.remainingAfter }}</td>
            <td class="px-4 py-3">
              <span
                :class="sourceColors[entry.source]"
                class="px-2 py-0.5 rounded-full text-xs font-medium"
              >
                {{ sourceLabels[entry.source] ?? entry.source }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
