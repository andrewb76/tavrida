<script setup lang="ts">
defineOptions({ name: 'UiButton' });

import { buttonVariants, type ButtonVariants } from './buttonVariants';
import { cn } from '../../lib/cn';

export type ButtonProps = {
  intent?: ButtonVariants['intent'];
  size?: ButtonVariants['size'];
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  class?: string;
};

const props = withDefaults(defineProps<ButtonProps>(), {
  type: 'button',
  intent: 'primary',
  size: 'md',
  disabled: false,
  class: undefined,
});
</script>

<template>
  <button
    :type="props.type"
    :disabled="props.disabled"
    :class="cn(buttonVariants({ intent: props.intent, size: props.size }), props.class)"
  >
    <slot />
  </button>
</template>
