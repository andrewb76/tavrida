<script setup lang="ts">
defineOptions({ name: 'UiIcon' });

import { Icon } from '@iconify/vue';
import { computed } from 'vue';
import { cn } from '../../lib/cn';
import '../../icons/register-lucide';
import { resolveUiIcon, type UiIconName } from '../../icons/ui-icons';

const props = withDefaults(
  defineProps<{
    /** Semantic key (`home`) or Iconify id (`lucide:house`). */
    name: UiIconName;
    size?: number | string;
    class?: string;
    /** Accessible label; when set, icon is exposed to AT. */
    label?: string;
  }>(),
  {
    size: 20,
  },
);

const icon = computed(() => resolveUiIcon(props.name));
</script>

<template>
  <Icon
    :icon="icon"
    :width="size"
    :height="size"
    :class="cn('inline-block shrink-0 align-middle', props.class)"
    :aria-hidden="label ? undefined : true"
    :aria-label="label"
    :role="label ? 'img' : undefined"
  />
</template>
