<script setup lang="ts">
import { ref } from 'vue';
import { settingsApi } from '@/services/settings-api';

const yamlContent = ref('');
const importResult = ref<{ created: Record<string, number>; updated: Record<string, number>; errors: string[] } | null>(null);
const loading = ref(false);

async function handleExport() {
  loading.value = true;
  try {
    const yaml = await settingsApi.exportYaml();
    yamlContent.value = yaml;
    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `settings-${new Date().toISOString().slice(0, 10)}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  } finally {
    loading.value = false;
  }
}

async function handleImport() {
  if (!yamlContent.value.trim()) return;
  loading.value = true;
  try {
    importResult.value = await settingsApi.importYaml(yamlContent.value);
  } finally {
    loading.value = false;
  }
}

function handleFileUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    yamlContent.value = e.target?.result as string;
  };
  reader.readAsText(file);
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">YAML-конфигурация</h1>

    <div class="flex gap-4 mb-6">
      <button
        class="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
        :disabled="loading"
        @click="handleExport"
      >
        {{ loading ? 'Загрузка...' : 'Экспорт текущих настроек' }}
      </button>
      <label class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 cursor-pointer">
        Выбрать файл
        <input type="file" accept=".yaml,.yml" class="hidden" @change="handleFileUpload" />
      </label>
      <button
        class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
        :disabled="loading || !yamlContent.trim()"
        @click="handleImport"
      >
        {{ loading ? 'Загрузка...' : 'Импорт' }}
      </button>
    </div>

    <div class="mb-6">
      <label class="block text-sm font-medium text-gray-700 mb-2">YAML</label>
      <textarea
        v-model="yamlContent"
        rows="20"
        class="w-full px-4 py-3 border rounded-xl text-sm font-mono bg-gray-900 text-green-400"
        placeholder="Вставьте YAML или загрузите файл..."
      ></textarea>
    </div>

    <div v-if="importResult" class="bg-white rounded-xl shadow-sm border p-4">
      <h2 class="text-lg font-semibold mb-3">Результат импорта</h2>
      <div class="grid grid-cols-3 gap-4 mb-4">
        <div class="text-center">
          <div class="text-2xl font-bold text-green-600">{{ importResult.created.parameters + importResult.created.plans }}</div>
          <div class="text-sm text-gray-500">Создано</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-blue-600">{{ importResult.updated.parameters + importResult.updated.plans }}</div>
          <div class="text-sm text-gray-500">Обновлено</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-red-600">{{ importResult.errors.length }}</div>
          <div class="text-sm text-gray-500">Ошибок</div>
        </div>
      </div>
      <div v-if="importResult.errors.length > 0" class="mt-4">
        <h3 class="text-sm font-medium text-red-700 mb-2">Ошибки:</h3>
        <ul class="list-disc list-inside text-sm text-red-600">
          <li v-for="err in importResult.errors" :key="err">{{ err }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>
