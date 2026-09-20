<script setup lang="ts">
import { computed } from 'vue';
import type { Parameter } from '@/types/settings';
import CategoryBadge from './CategoryBadge.vue';
import ParameterTypeIcon from './ParameterTypeIcon.vue';

const props = defineProps<{
  parameters: Parameter[];
  loading: boolean;
}>();

const emit = defineEmits<{
  edit: [parameter: Parameter];
  delete: [key: string];
}>();

const columns = [
  { key: 'key', label: 'Ключ', sortable: true },
  { key: 'name', label: 'Название', sortable: true },
  { key: 'paramType', label: 'Тип', sortable: true },
  { key: 'category', label: 'Категория', sortable: true },
  { key: 'userOverride', label: 'Override', sortable: false },
  { key: 'syncStatus', label: 'Статус', sortable: true },
  { key: 'actions', label: '', sortable: false },
];
</script>

<template>
  <div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-gray-200">
      <thead class="bg-gray-50">
        <tr>
          <th
            v-for="col in columns"
            :key="col.key"
            class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
          >
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody class="bg-white divide-y divide-gray-200">
        <tr v-if="loading">
          <td colspan="7" class="px-4 py-8 text-center text-gray-500">Загрузка...</td>
        </tr>
        <tr v-else-if="parameters.length === 0">
          <td colspan="7" class="px-4 py-8 text-center text-gray-500">Нет параметров</td>
        </tr>
        <tr
          v-for="param in parameters"
          :key="param.key"
          class="hover:bg-gray-50 cursor-pointer"
          @click="emit('edit', param)"
        >
          <td class="px-4 py-3 text-sm font-mono text-gray-900">{{ param.key }}</td>
          <td class="px-4 py-3 text-sm text-gray-700">{{ param.name }}</td>
          <td class="px-4 py-3 text-sm text-gray-500">
            <ParameterTypeIcon :type="param.paramType" />
          </td>
          <td class="px-4 py-3">
            <CategoryBadge :category="param.category" />
          </td>
          <td class="px-4 py-3 text-sm text-gray-500">
            <span v-if="param.userOverride" class="text-green-600">✓</span>
            <span v-else class="text-gray-300">—</span>
          </td>
          <td class="px-4 py-3 text-sm">
            <span
              :class="param.syncStatus === 'active' ? 'text-green-600' : 'text-yellow-600'"
            >
              {{ param.syncStatus }}
            </span>
          </td>
          <td class="px-4 py-3 text-sm">
            <button
              class="text-red-600 hover:text-red-800"
              @click.stop="emit('delete', param.key)"
            >
              🗑
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
