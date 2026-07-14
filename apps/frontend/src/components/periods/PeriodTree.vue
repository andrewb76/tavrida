<script setup lang="ts">
import { UiButton } from '@tavrida/ui';
import type { PeriodRecord } from '@/services/periodsAdmin';

defineProps<{
  nodes: PeriodRecord[];
}>();

defineEmits<{
  edit: [PeriodRecord];
  'add-child': [PeriodRecord];
  partition: [PeriodRecord];
  remove: [PeriodRecord];
}>();
</script>

<template>
  <ul class="space-y-2">
    <li
      v-for="node in nodes"
      :key="node.id"
      class="rounded-md border border-border p-3"
    >
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div class="font-medium">
            {{ node.title }}
          </div>
          <div class="text-xs text-text-muted">
            {{ String(node.startsOn).slice(0, 10) }} — {{ String(node.endsOn).slice(0, 10) }}
            · depth {{ node.depth }}
          </div>
        </div>
        <div class="flex flex-wrap gap-1">
          <UiButton
            intent="ghost"
            size="sm"
            type="button"
            @click="$emit('edit', node)"
          >
            Изменить
          </UiButton>
          <UiButton
            intent="ghost"
            size="sm"
            type="button"
            @click="$emit('add-child', node)"
          >
            + ребёнок
          </UiButton>
          <UiButton
            intent="secondary"
            size="sm"
            type="button"
            @click="$emit('partition', node)"
          >
            Разбить
          </UiButton>
          <UiButton
            intent="danger"
            size="sm"
            type="button"
            @click="$emit('remove', node)"
          >
            ×
          </UiButton>
        </div>
      </div>
      <PeriodTree
        v-if="node.children?.length"
        class="mt-2 ml-4"
        :nodes="node.children"
        @edit="$emit('edit', $event)"
        @add-child="$emit('add-child', $event)"
        @partition="$emit('partition', $event)"
        @remove="$emit('remove', $event)"
      />
    </li>
  </ul>
</template>

<script lang="ts">
export default {
  name: 'PeriodTree',
};
</script>
