<script setup lang="ts">
import { computed, ref } from 'vue';
import ProxiedImg from '@/components/media/ProxiedImg.vue';
import { imageProxyPresets, proxiedMediaUrl } from '@/utils/imageProxy';
import { useClubAccessStore } from '@/stores/clubAccess';

const props = defineProps<{
  images: string[];
}>();

const clubAccess = useClubAccessStore();
const active = ref(0);

const slides = computed(() => (props.images.length ? props.images : []));
const multi = computed(() => slides.value.length > 1);

const aspectRatio = computed(
  () => `${clubAccess.lotImageAspectWidth} / ${clubAccess.lotImageAspectHeight}`,
);

const activeSrc = computed(() => {
  const slide = slides.value[active.value];
  if (!slide) return undefined;
  return proxiedMediaUrl(slide, imageProxyPresets.galleryMain);
});

const activeFallback = computed(() => slides.value[active.value]);

function select(index: number) {
  if (!slides.value.length) return;
  const len = slides.value.length;
  active.value = ((index % len) + len) % len;
}

function prev() {
  select(active.value - 1);
}

function next() {
  select(active.value + 1);
}

function thumbSrc(url: string) {
  return proxiedMediaUrl(url, imageProxyPresets.galleryThumb) ?? url;
}

/** Pointer swipe */
const dragStartX = ref<number | null>(null);

function onPointerDown(e: PointerEvent) {
  if (!multi.value) return;
  if ((e.target as HTMLElement)?.closest('button')) return;
  dragStartX.value = e.clientX;
  (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
}

function onPointerUp(e: PointerEvent) {
  if (dragStartX.value == null) return;
  const dx = e.clientX - dragStartX.value;
  dragStartX.value = null;
  if (Math.abs(dx) < 40) return;
  if (dx < 0) next();
  else prev();
}

function onKeydown(e: KeyboardEvent) {
  if (!multi.value) return;
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    prev();
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    next();
  }
}
</script>

<template>
  <div
    class="media-gallery"
    role="region"
    aria-roledescription="carousel"
    aria-label="Фото лота"
    tabindex="0"
    @keydown="onKeydown"
  >
    <div
      class="media-gallery__main"
      :style="{ aspectRatio }"
      @pointerdown="onPointerDown"
      @pointerup="onPointerUp"
      @pointercancel="dragStartX = null"
    >
      <ProxiedImg
        v-if="activeFallback"
        :src="activeSrc"
        :fallback-src="activeFallback"
        alt=""
        class="media-gallery__img"
        loading="eager"
      />
      <div
        v-else
        class="media-gallery__placeholder"
      >
        Нет фото
      </div>

      <template v-if="multi">
        <button
          type="button"
          class="media-gallery__nav media-gallery__nav--prev"
          aria-label="Предыдущее фото"
          @click="prev"
        >
          ‹
        </button>
        <button
          type="button"
          class="media-gallery__nav media-gallery__nav--next"
          aria-label="Следующее фото"
          @click="next"
        >
          ›
        </button>
        <p class="media-gallery__counter">
          {{ active + 1 }} / {{ slides.length }}
        </p>
      </template>
    </div>

    <div
      v-if="multi"
      class="media-gallery__dots"
      aria-hidden="true"
    >
      <button
        v-for="(_slide, idx) in slides"
        :key="idx"
        type="button"
        :class="{ 'is-active': idx === active }"
        :aria-label="`Фото ${idx + 1}`"
        @click="select(idx)"
      />
    </div>

    <div
      v-if="multi"
      class="media-gallery__thumbs"
    >
      <button
        v-for="(slide, idx) in slides"
        :key="slide"
        type="button"
        class="media-gallery__thumb"
        :class="{ 'is-active': idx === active }"
        :aria-label="`Показать фото ${idx + 1}`"
        :aria-current="idx === active ? 'true' : undefined"
        @click="select(idx)"
      >
        <ProxiedImg
          :src="thumbSrc(slide)"
          :fallback-src="slide"
          alt=""
        />
      </button>
    </div>
  </div>
</template>

<style scoped>
.media-gallery {
  display: grid;
  gap: 0.5rem;
  outline: none;
}

.media-gallery__main {
  position: relative;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  background: var(--color-surface-muted);
  touch-action: pan-y;
  user-select: none;
}

.media-gallery__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.media-gallery__placeholder {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  min-height: 10rem;
  color: var(--color-text-muted);
}

.media-gallery__nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1;
  width: 2.25rem;
  height: 2.25rem;
  border: none;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
}

.media-gallery__nav--prev {
  left: 0.5rem;
}

.media-gallery__nav--next {
  right: 0.5rem;
}

.media-gallery__counter {
  position: absolute;
  right: 0.5rem;
  bottom: 0.5rem;
  margin: 0;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 0.75rem;
}

.media-gallery__dots {
  display: flex;
  justify-content: center;
  gap: 0.35rem;
}

.media-gallery__dots button {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 999px;
  border: none;
  background: var(--color-border);
  cursor: pointer;
}

.media-gallery__dots button.is-active {
  background: var(--color-text);
}

.media-gallery__thumbs {
  display: none;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 0.15rem;
}

.media-gallery__thumb {
  flex: 0 0 auto;
  width: 4.5rem;
  height: 3.375rem;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  background: var(--color-surface-muted);
}

.media-gallery__thumb.is-active {
  border-color: var(--color-primary);
}

.media-gallery__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

@media (min-width: 640px) {
  .media-gallery__dots {
    display: none;
  }

  .media-gallery__thumbs {
    display: flex;
  }
}

@media (max-width: 639px) {
  .media-gallery__nav {
    display: none;
  }
}
</style>
