<script setup lang="ts">
defineOptions({ name: 'UiButton' });

import { buttonVariants, type ButtonVariants } from './buttonVariants';
import { cn } from '../../lib/cn';

export type ButtonProps = {
  intent?: ButtonVariants['intent'];
  size?: ButtonVariants['size'];
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
};

withDefaults(defineProps<ButtonProps>(), {
  type: 'button',
  intent: 'primary',
  size: 'md',
  disabled: false,
});
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    :class="cn(buttonVariants({ intent, size }))"
  >
    <slot />
  </button>
</template>
