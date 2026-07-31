<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Cropper, RectangleStencil } from 'vue-advanced-cropper';
import 'vue-advanced-cropper/dist/style.css';
import { UiButton } from '@tavrida/ui';

const props = withDefaults(
  defineProps<{
    open: boolean;
    file: File | null;
    aspectWidth?: number;
    aspectHeight?: number;
    /** Max long edge of exported JPEG (px). Display size comes from imgproxy. */
    maxLongEdge?: number;
  }>(),
  {
    aspectWidth: 4,
    aspectHeight: 3,
    maxLongEdge: 2400,
  },
);

const emit = defineEmits<{
  cancel: [];
  confirm: [File];
}>();

const cropperRef = ref<InstanceType<typeof Cropper> | null>(null);
const objectUrl = ref<string | null>(null);
const busy = ref(false);

const aspectRatio = computed(() => props.aspectWidth / props.aspectHeight);

const stencilProps = computed(() => ({
  aspectRatio: aspectRatio.value,
}));

watch(
  () => props.file,
  (file) => {
    if (objectUrl.value) {
      URL.revokeObjectURL(objectUrl.value);
      objectUrl.value = null;
    }
    if (file) {
      objectUrl.value = URL.createObjectURL(file);
    }
  },
  { immediate: true },
);

watch(
  () => props.open,
  (open) => {
    if (!open && objectUrl.value) {
      URL.revokeObjectURL(objectUrl.value);
      objectUrl.value = null;
    }
  },
);

function onCancel() {
  emit('cancel');
}

async function onConfirm() {
  const cropper = cropperRef.value;
  if (!cropper || busy.value) return;
  busy.value = true;
  try {
    const { canvas } = cropper.getResult();
    if (!canvas) {
      emit('cancel');
      return;
    }
    const scaled = scaleCanvas(canvas, props.maxLongEdge);
    const blob = await canvasToJpeg(scaled, 0.9);
    const baseName = (props.file?.name ?? 'photo').replace(/\.[^.]+$/, '');
    const file = new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
    emit('confirm', file);
  } finally {
    busy.value = false;
  }
}

function scaleCanvas(source: HTMLCanvasElement, maxLongEdge: number): HTMLCanvasElement {
  const long = Math.max(source.width, source.height);
  if (long <= maxLongEdge) return source;
  const scale = maxLongEdge / long;
  const w = Math.round(source.width * scale);
  const h = Math.round(source.height * scale);
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d');
  if (!ctx) return source;
  ctx.drawImage(source, 0, 0, w, h);
  return out;
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Не удалось сохранить кадр'));
      },
      'image/jpeg',
      quality,
    );
  });
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open && file"
      class="crop-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Обрезка фото"
    >
      <div
        class="crop-modal__backdrop"
        @click="onCancel"
      />
      <div class="crop-modal__panel">
        <header class="crop-modal__header">
          <h2>Кадр {{ aspectWidth }}:{{ aspectHeight }}</h2>
          <p>Выберите область — все фото лота будут в одном формате.</p>
        </header>
        <div class="crop-modal__cropper">
          <Cropper
            v-if="objectUrl"
            ref="cropperRef"
            class="crop-modal__cropper-el"
            :src="objectUrl"
            :stencil-component="RectangleStencil"
            :stencil-props="stencilProps"
            image-restriction="stencil"
          />
        </div>
        <footer class="crop-modal__actions">
          <UiButton
            type="button"
            intent="ghost"
            :disabled="busy"
            @click="onCancel"
          >
            Отмена
          </UiButton>
          <UiButton
            type="button"
            intent="primary"
            :disabled="busy"
            @click="onConfirm"
          >
            {{ busy ? 'Сохранение…' : 'Готово' }}
          </UiButton>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.crop-modal {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 1rem;
}

.crop-modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
}

.crop-modal__panel {
  position: relative;
  z-index: 1;
  width: min(100%, 40rem);
  max-height: min(100vh - 2rem, 42rem);
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 12px;
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
}

.crop-modal__header h2 {
  margin: 0;
  font-size: 1.1rem;
}

.crop-modal__header p {
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.crop-modal__cropper {
  min-height: 16rem;
  height: min(50vh, 24rem);
  background: #111;
  border-radius: 8px;
  overflow: hidden;
}

.crop-modal__cropper-el {
  height: 100%;
  background: #111;
}

.crop-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
