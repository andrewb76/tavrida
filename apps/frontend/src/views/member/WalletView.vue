<script setup lang="ts">
import PlaceholderPage from '@/components/PlaceholderPage.vue';
import { UiButton, UiModal } from '@tavrida/ui';
import { ref } from 'vue';

const depositOpen = ref(false);
</script>

<template>
  <PlaceholderPage wireframe="W08" title="Кошелёк" description="Баланс, история, пополнение.">
    <p class="mb-4 text-2xl font-semibold">1 250 ₽</p>
    <UiButton intent="primary" @click="depositOpen = true">Пополнить</UiButton>
    <UiModal v-model:open="depositOpen" title="Пополнение" description="W08 modal">
      <UiButton intent="primary" class="w-full" @click="depositOpen = false">Mock OK</UiButton>
    </UiModal>
  </PlaceholderPage>
</template>
