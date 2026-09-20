<script setup lang="ts">
import { useParametersStore } from '@/stores/parameters';

const store = useParametersStore();

const emit = defineEmits<{
  select: [service: string | null];
}>();

function selectService(service: string | null) {
  store.selectService(service);
  emit('select', service);
}
</script>

<template>
  <div class="w-56 bg-white border-r border-gray-200 flex flex-col">
    <div class="p-3 border-b border-gray-200">
      <h3 class="text-sm font-semibold text-gray-700">Сервисы</h3>
    </div>
    <div class="flex-1 overflow-y-auto p-2">
      <button
        class="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors"
        :class="store.selectedService === null ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100'"
        @click="selectService(null)"
      >
        Все сервисы
        <span class="text-gray-400 ml-1">({{ store.parameters.length }})</span>
      </button>
      <button
        v-for="svc in store.services"
        :key="svc.name"
        class="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors"
        :class="store.selectedService === svc.name ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100'"
        @click="selectService(svc.name)"
      >
        {{ svc.name }}
        <span class="text-gray-400 ml-1">({{ svc.parameterCount }})</span>
      </button>
    </div>
  </div>
</template>
