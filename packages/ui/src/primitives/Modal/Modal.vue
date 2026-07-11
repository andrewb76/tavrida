<script setup lang="ts">
defineOptions({ name: 'UiModal' });

import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui';
import { cn } from '../../lib/cn';

defineProps<{
  title: string;
  description?: string;
}>();

const open = defineModel<boolean>('open', { required: true });
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay
        :class="cn('fixed inset-0 z-[100] bg-black/50')"
      />
      <DialogContent
        :class="
          cn(
            'fixed left-1/2 top-1/2 z-[101] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2',
            'pointer-events-auto rounded-lg border border-border bg-surface p-6 shadow-card',
          )
        "
      >
        <DialogTitle class="text-lg font-semibold text-text">
          {{ title }}
        </DialogTitle>
        <DialogDescription
          v-if="description"
          class="mt-2 text-sm text-text-muted"
        >
          {{ description }}
        </DialogDescription>
        <div class="mt-4">
          <slot />
        </div>
        <DialogClose
          class="absolute right-4 top-4 rounded-md p-1 text-text-muted hover:bg-bg hover:text-text"
          aria-label="Закрыть"
        >
          ✕
        </DialogClose>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
