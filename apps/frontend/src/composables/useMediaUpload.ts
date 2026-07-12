import {
  getMediaLimits,
  uploadFile,
  type MediaAttachment,
  type MediaDomain,
  type MediaLimits,
} from '@/services/media';
import { computed, onMounted, ref } from 'vue';

export type UploadItem = {
  id: string;
  file: File;
  previewUrl: string | null;
  status: 'queued' | 'uploading' | 'ready' | 'error';
  error: string | null;
  result: MediaAttachment | null;
};

export function useMediaUpload(domain: MediaDomain) {
  const limits = ref<MediaLimits | null>(null);
  const items = ref<UploadItem[]>([]);
  const loadingLimits = ref(true);
  const globalError = ref<string | null>(null);

  const readyAttachments = computed(() =>
    items.value
      .filter((item) => item.status === 'ready' && item.result)
      .map((item) => item.result!),
  );

  const readyUrls = computed(() => readyAttachments.value.map((item) => item.url));

  const count = computed(() => readyAttachments.value.length);
  const canAddMore = computed(() => {
    if (!limits.value) return false;
    return items.value.length < limits.value.countMax;
  });

  onMounted(async () => {
    loadingLimits.value = true;
    try {
      limits.value = await getMediaLimits(domain);
    } catch (e) {
      globalError.value = e instanceof Error ? e.message : 'Не удалось загрузить лимиты';
    } finally {
      loadingLimits.value = false;
    }
  });

  async function addFiles(fileList: FileList | File[]) {
    globalError.value = null;
    if (!limits.value) return;

    const files = Array.from(fileList);
    const remaining = limits.value.countMax - items.value.length;
    const batch = files.slice(0, Math.max(0, remaining));

    for (const file of batch) {
      if (file.size > limits.value.sizeMaxBytes) {
        globalError.value = `Файл ${file.name} превышает лимит ${limits.value.sizeMaxMb} MB`;
        continue;
      }

      const id = crypto.randomUUID();
      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
      const item: UploadItem = {
        id,
        file,
        previewUrl,
        status: 'queued',
        error: null,
        result: null,
      };
      items.value = [...items.value, item];
      void uploadOne(item);
    }
  }

  async function uploadOne(item: UploadItem) {
    const index = items.value.findIndex((row) => row.id === item.id);
    if (index < 0) return;

    items.value[index] = { ...item, status: 'uploading', error: null };
    try {
      const result = await uploadFile(domain, item.file);
      const current = items.value.findIndex((row) => row.id === item.id);
      if (current >= 0) {
        items.value[current] = { ...items.value[current], status: 'ready', result };
      }
    } catch (e) {
      const current = items.value.findIndex((row) => row.id === item.id);
      if (current >= 0) {
        items.value[current] = {
          ...items.value[current],
          status: 'error',
          error: e instanceof Error ? e.message : 'Ошибка загрузки',
        };
      }
    }
  }

  function removeItem(id: string) {
    const row = items.value.find((item) => item.id === id);
    if (row?.previewUrl) URL.revokeObjectURL(row.previewUrl);
    items.value = items.value.filter((item) => item.id !== id);
  }

  function reset() {
    for (const item of items.value) {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    }
    items.value = [];
    globalError.value = null;
  }

  return {
    limits,
    items,
    loadingLimits,
    globalError,
    readyAttachments,
    readyUrls,
    count,
    canAddMore,
    addFiles,
    removeItem,
    reset,
  };
}
