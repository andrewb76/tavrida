<script setup lang="ts">
import PlaceholderPage from '@/components/PlaceholderPage.vue';
import { UiButton, UiModal } from '@tavrida/ui';
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const bidOpen = ref(false);
const lotId = computed(() => route.params.id as string);
</script>

<template>
  <PlaceholderPage
    wireframe="W03"
    :title="`Лот #${lotId}`"
    description="Галерея, таймер, ставки, экспертиза — mock."
  >
    <UiButton
      intent="primary"
      @click="bidOpen = true"
    >
      Сделать ставку
    </UiButton>
    <UiModal
      v-model:open="bidOpen"
      title="Ставка на лот"
      description="W03 modal · mock"
    >
      <p class="mb-4 text-sm text-text-muted">
        Мин. ставка: 1 550 ₽
      </p>
      <UiButton
        intent="primary"
        class="w-full"
        @click="bidOpen = false"
      >
        Подтвердить (mock)
      </UiButton>
    </UiModal>
  </PlaceholderPage>
</template>
