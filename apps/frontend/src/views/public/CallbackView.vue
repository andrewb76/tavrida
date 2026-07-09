<script setup lang="ts">
import { isLogtoConfigured } from '@/config/logto';
import DevCallbackHandler from './DevCallbackHandler.vue';
import LogtoCallbackHandler from './LogtoCallbackHandler.vue';

const logtoEnabled = isLogtoConfigured();
</script>

<template>
  <LogtoCallbackHandler v-if="logtoEnabled" />
  <DevCallbackHandler v-else />
</template>
