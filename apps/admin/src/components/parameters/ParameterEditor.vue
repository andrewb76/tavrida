<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Parameter } from '@/types/settings';
import { useParametersStore } from '@/stores/parameters';
import { usePlansStore } from '@/stores/plans';
import CategoryBadge from './CategoryBadge.vue';

const props = defineProps<{
  parameter: Parameter | null;
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const parametersStore = useParametersStore();
const plansStore = usePlansStore();

const form = ref({
  name: '',
  description: '',
  category: '' as string,
  paramType: '',
  userOverride: false,
  sortOrder: 0,
  defaultValue: '',
  systemValue: '',
  planValues: {} as Record<string, string>,
});

watch(
  () => props.parameter,
  (param) => {
    if (param) {
      form.value = {
        name: param.name,
        description: param.description,
        category: param.category,
        paramType: param.paramType,
        userOverride: param.userOverride,
        sortOrder: param.sortOrder,
        defaultValue: JSON.stringify(param.defaultValue, null, 2),
        systemValue: '',
        planValues: {},
      };
    }
  },
  { immediate: true }
);

const isSystemVar = computed(() => form.value.category === 'system-var');
const isTarifVar = computed(() => form.value.category === 'tarif-var');
const isLimitedVar = computed(() => form.value.category === 'limited-user-var');
const isUserVar = computed(() => form.value.category === 'user-var');
const planPlaceholder = '{ "limit_value": ... }';

async function save() {
  if (!props.parameter) return;
  await parametersStore.updateParameter(props.parameter.key, {
    name: form.value.name,
    description: form.value.description,
    category: form.value.category as Parameter['category'],
    paramType: form.value.paramType as Parameter['paramType'],
    userOverride: form.value.userOverride,
    sortOrder: form.value.sortOrder,
  });
  emit('close');
}

async function remove() {
  if (!props.parameter) return;
  if (confirm(`Удалить параметр ${props.parameter.key}?`)) {
    await parametersStore.deleteParameter(props.parameter.key);
    emit('close');
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open && parameter"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="emit('close')"
    >
      <div class="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between p-4 border-b">
          <div class="flex items-center gap-3">
            <h2 class="text-lg font-semibold">{{ parameter.key }}</h2>
            <CategoryBadge :category="form.category" />
          </div>
          <button class="text-gray-400 hover:text-gray-600 text-xl" @click="emit('close')">&times;</button>
        </div>

        <div class="p-4 space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Ключ</label>
              <input :value="parameter.key" disabled class="w-full px-3 py-2 bg-gray-100 border rounded-lg text-sm" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Сервис</label>
              <input :value="parameter.service" disabled class="w-full px-3 py-2 bg-gray-100 border rounded-lg text-sm" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Категория</label>
              <select v-model="form.category" class="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="system-var">system-var</option>
                <option value="tarif-var">tarif-var</option>
                <option value="limited-user-var">limited-user-var</option>
                <option value="user-var">user-var</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Тип</label>
              <select v-model="form.paramType" class="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="int">int</option>
                <option value="boolean">boolean</option>
                <option value="string">string</option>
                <option value="enum">enum</option>
              </select>
            </div>
          </div>

          <div v-if="isSystemVar" class="flex items-center gap-2">
            <input id="userOverride" v-model="form.userOverride" type="checkbox" class="rounded" />
            <label for="userOverride" class="text-sm text-gray-700">Разрешить override на уровне пользователя</label>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Название</label>
            <input v-model="form.name" class="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Описание</label>
            <textarea v-model="form.description" rows="2" class="w-full px-3 py-2 border rounded-lg text-sm"></textarea>
          </div>

          <div v-if="isSystemVar">
            <label class="block text-sm font-medium text-gray-700 mb-1">Глобальное значение</label>
            <textarea v-model="form.systemValue" rows="3" class="w-full px-3 py-2 border rounded-lg text-sm font-mono"></textarea>
          </div>

          <div v-if="isTarifVar || isLimitedVar || isUserVar">
            <label class="block text-sm font-medium text-gray-700 mb-1">Значение по умолчанию</label>
            <textarea v-model="form.defaultValue" rows="3" class="w-full px-3 py-2 border rounded-lg text-sm font-mono"></textarea>
          </div>

          <div v-if="isTarifVar" class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">Значения по планам</label>
            <div v-for="plan in plansStore.plans" :key="plan.id" class="flex items-center gap-2">
              <span class="w-20 text-sm text-gray-600">{{ plan.title }}</span>
              <input
                v-model="form.planValues[plan.id]"
                class="flex-1 px-3 py-1.5 border rounded-lg text-sm font-mono"
                :placeholder="planPlaceholder"
              />
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between p-4 border-t">
          <button class="px-4 py-2 text-red-600 hover:text-red-800 text-sm" @click="remove">Удалить</button>
          <div class="flex gap-2">
            <button class="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm" @click="emit('close')">Отмена</button>
            <button class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700" @click="save">Сохранить</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
