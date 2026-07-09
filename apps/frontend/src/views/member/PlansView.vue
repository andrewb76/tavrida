<script setup lang="ts">
import PlaceholderPage from '@/components/PlaceholderPage.vue';
import { UiButton, UiModal } from '@tavrida/ui';
import { ref } from 'vue';

const activateOpen = ref(false);
</script>

<template>
  <PlaceholderPage wireframe="W08" title="Тарифы" description="Free / Basic / Pro.">
    <UiButton intent="primary" @click="activateOpen = true">Upgrade Basic</UiButton>
    <UiModal v-model:open="activateOpen" title="Активировать Basic" description="W08 modal">
      <UiButton intent="primary" class="w-full" @click="activateOpen = false">Mock OK</UiButton>
    </UiModal>
  </PlaceholderPage>
</template>
