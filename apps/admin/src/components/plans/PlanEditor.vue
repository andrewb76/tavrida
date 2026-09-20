<script setup lang="ts">
import { ref, watch } from 'vue';
import type { Plan } from '@/types/settings';

const props = defineProps<{
  plan: Plan | null;
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const form = ref({
  id: '',
  title: '',
  description: '',
  monthlyPrice: 0,
  yearlyPrice: 0,
  isActive: true,
  sortOrder: 0,
});

watch(
  () => props.plan,
  (plan) => {
    if (plan) {
      form.value = { ...plan };
    } else {
      form.value = { id: '', title: '', description: '', monthlyPrice: 0, yearlyPrice: 0, isActive: true, sortOrder: 0 };
    }
  },
  { immediate: true }
);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="emit('close')"
    >
      <div class="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div class="flex items-center justify-between p-4 border-b">
          <h2 class="text-lg font-semibold">{{ plan ? 'Редактировать тариф' : 'Создать тариф' }}</h2>
          <button class="text-gray-400 hover:text-gray-600 text-xl" @click="emit('close')">&times;</button>
        </div>

        <div class="p-4 space-y-4">
          <div v-if="!plan">
            <label class="block text-sm font-medium text-gray-700 mb-1">ID</label>
            <input v-model="form.id" class="w-full px-3 py-2 border rounded-lg text-sm" placeholder="free, basic, pro" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Название</label>
            <input v-model="form.title" class="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Описание</label>
            <textarea v-model="form.description" rows="2" class="w-full px-3 py-2 border rounded-lg text-sm"></textarea>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Цена/мес (₽)</label>
              <input v-model.number="form.monthlyPrice" type="number" class="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Цена/год (₽)</label>
              <input v-model.number="form.yearlyPrice" type="number" class="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>
          <div class="flex items-center gap-2">
            <input id="isActive" v-model="form.isActive" type="checkbox" class="rounded" />
            <label for="isActive" class="text-sm text-gray-700">Активен</label>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Порядок сортировки</label>
            <input v-model.number="form.sortOrder" type="number" class="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
        </div>

        <div class="flex justify-end gap-2 p-4 border-t">
          <button class="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm" @click="emit('close')">Отмена</button>
          <button class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            {{ plan ? 'Сохранить' : 'Создать' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
