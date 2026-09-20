<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { usePlansStore } from '@/stores/plans';
import type { Plan } from '@/types/settings';
import PlanCard from '@/components/plans/PlanCard.vue';
import PlanEditor from '@/components/plans/PlanEditor.vue';

const plansStore = usePlansStore();
const editorOpen = ref(false);
const editingPlan = ref<Plan | null>(null);

onMounted(() => {
  plansStore.fetchPlans();
});

function handleEdit(plan: Plan) {
  editingPlan.value = plan;
  editorOpen.value = true;
}

function handleCreate() {
  editingPlan.value = null;
  editorOpen.value = true;
}

async function handleDelete(plan: Plan) {
  if (confirm(`Удалить тариф "${plan.title}"?`)) {
    await plansStore.deletePlan(plan.id);
  }
}

function handleCloseEditor() {
  editorOpen.value = false;
  editingPlan.value = null;
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Тарифы</h1>
      <button
        class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        @click="handleCreate"
      >
        + Создать тариф
      </button>
    </div>

    <div v-if="plansStore.loading" class="text-center py-8 text-gray-500">Загрузка...</div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <PlanCard
        v-for="plan in plansStore.plans"
        :key="plan.id"
        :plan="plan"
        @edit="handleEdit(plan)"
        @delete="handleDelete(plan)"
      />
    </div>

    <PlanEditor
      :plan="editingPlan"
      :open="editorOpen"
      @close="handleCloseEditor"
    />
  </div>
</template>
