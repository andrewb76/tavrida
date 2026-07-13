<script setup lang="ts">
import { computed, ref } from 'vue';
import { imageProxyPresets, proxiedMediaUrl } from '@/utils/imageProxy';

const props = defineProps<{
  images: string[];
}>();

const active = ref(0);

const slides = computed(() => (props.images.length ? props.images : ['placeholder']));

const activeSrc = computed(() => {
  const slide = slides.value[active.value];
  if (slide === 'placeholder') return undefined;
  return proxiedMediaUrl(slide, imageProxyPresets.galleryMain);
});

function select(index: number) {
  active.value = index;
}
</script>

<template>
  <div class="media-gallery">
    <div class="media-gallery__main">
      <img
        v-if="activeSrc"
        :src="activeSrc"
        alt=""
        class="media-gallery__img"
      >
      <div
        v-else
        class="media-gallery__placeholder"
      >
        Нет фото
      </div>
    </div>
    <div
      v-if="slides.length > 1"
      class="media-gallery__dots"
    >
      <button
        v-for="(slide, idx) in slides"
        :key="idx"
        type="button"
        :class="{ 'is-active': idx === active }"
        @click="select(idx)"
      />
    </div>
  </div>
</template>

<style scoped>
.media-gallery {
  display: grid;
  gap: 0.5rem;
}

.media-gallery__main {
  aspect-ratio: 4 / 3;
  border-radius: 8px;
  overflow: hidden;
  background: var(--color-surface-muted, #f3f3f3);
}

.media-gallery__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-gallery__placeholder {
  display: grid;
  place-items: center;
  height: 100%;
  color: var(--color-text-muted, #666);
}

.media-gallery__dots {
  display: flex;
  gap: 0.35rem;
}

.media-gallery__dots button {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 999px;
  border: none;
  background: #ccc;
  cursor: pointer;
}

.media-gallery__dots button.is-active {
  background: #333;
}
</style>
