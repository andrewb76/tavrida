<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useLimitsStore } from '@/stores/limits';

const router = useRouter();
const limitsStore = useLimitsStore();
const searchQuery = ref('');
const planFilter = ref('');
const statusFilter = ref('');

onMounted(() => {
  limitsStore.fetchSubscriptions();
});

function handleSearch() {
  limitsStore.fetchSubscriptions({
    planId: planFilter.value || undefined,
    status: statusFilter.value || undefined,
  });
}

function goToUser(userId: string) {
  router.push(`/users/${userId}`);
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Пользователи</h1>

    <div class="bg-white rounded-xl shadow-sm border p-4 mb-6">
      <div class="flex gap-4">
        <input
          v-model="searchQuery"
          placeholder="Поиск по User ID..."
          class="flex-1 px-3 py-2 border rounded-lg text-sm"
        />
        <select v-model="planFilter" class="px-3 py-2 border rounded-lg text-sm">
          <option value="">Все планы</option>
          <option value="free">Free</option>
          <option value="basic">Basic</option>
          <option value="pro">Pro</option>
        </select>
        <select v-model="statusFilter" class="px-3 py-2 border rounded-lg text-sm">
          <option value="">Все статусы</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="EXPIRED">EXPIRED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
        <button class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700" @click="handleSearch">
          Найти
        </button>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User ID</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">План</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Активировано</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Истекает</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-if="limitsStore.loading">
            <td colspan="6" class="px-4 py-8 text-center text-gray-500">Загрузка...</td>
          </tr>
          <tr v-else-if="limitsStore.subscriptions.length === 0">
            <td colspan="6" class="px-4 py-8 text-center text-gray-500">Нет подписок</td>
          </tr>
          <tr
            v-for="sub in limitsStore.subscriptions"
            :key="sub.userId"
            class="hover:bg-gray-50 cursor-pointer"
            @click="goToUser(sub.userId)"
          >
            <td class="px-4 py-3 text-sm font-mono">{{ sub.userId }}</td>
            <td class="px-4 py-3 text-sm">{{ sub.planId }}</td>
            <td class="px-4 py-3 text-sm">{{ new Date(sub.startsAt).toLocaleDateString() }}</td>
            <td class="px-4 py-3 text-sm">{{ sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : '—' }}</td>
            <td class="px-4 py-3">
              <span
                :class="{
                  'bg-green-100 text-green-700': sub.status === 'ACTIVE',
                  'bg-yellow-100 text-yellow-700': sub.status === 'EXPIRED',
                  'bg-red-100 text-red-700': sub.status === 'CANCELLED',
                }"
                class="px-2 py-0.5 rounded-full text-xs font-medium"
              >
                {{ sub.status }}
              </span>
            </td>
            <td class="px-4 py-3 text-sm">
              <button class="text-blue-600 hover:text-blue-800">Подробнее</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
