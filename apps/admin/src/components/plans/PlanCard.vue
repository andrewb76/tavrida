<script setup lang="ts">
import type { Plan } from '@/types/settings';

defineProps<{
  plan: Plan;
}>();

const emit = defineEmits<{
  edit: [];
  delete: [];
}>();
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
    <div class="flex items-start justify-between mb-3">
      <div>
        <h3 class="text-lg font-semibold">{{ plan.title }}</h3>
        <p class="text-sm text-gray-500 mt-1">{{ plan.description }}</p>
      </div>
      <span
        :class="plan.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
        class="px-2 py-0.5 rounded-full text-xs font-medium"
      >
        {{ plan.isActive ? 'Активен' : 'Неактивен' }}
      </span>
    </div>

    <div class="flex gap-4 text-sm mb-4">
      <div>
        <span class="text-gray-500">Мес:</span>
        <span class="ml-1 font-medium">{{ plan.monthlyPrice }} ₽</span>
      </div>
      <div>
        <span class="text-gray-500">Год:</span>
        <span class="ml-1 font-medium">{{ plan.yearlyPrice }} ₽</span>
      </div>
    </div>

    <div class="flex gap-2">
      <RouterLink
        :to="`/plans/${plan.id}`"
        class="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-50"
      >
        Подробнее
      </RouterLink>
      <button
        class="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50"
        @click="emit('edit')"
      >
        Редактировать
      </button>
      <button
        class="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 border border-red-200 rounded-lg hover:bg-red-50"
        @click="emit('delete')"
      >
        Удалить
      </button>
    </div>
  </div>
</template>
