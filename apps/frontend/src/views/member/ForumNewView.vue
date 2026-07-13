<script setup lang="ts">
import MediaUploader from '@/components/media/MediaUploader.vue';
import { useMediaUpload } from '@/composables/useMediaUpload';
import {
  createTopic,
  flattenCategories,
  listCategories,
  type CategoryNode,
} from '@/services/forum';
import { UiButton } from '@tavrida/ui';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const categories = ref<CategoryNode[]>([]);
const categoryId = ref('');
const title = ref('');
const body = ref('');
const loading = ref(true);
const saving = ref(false);
const error = ref<string | null>(null);
const attachmentsExpanded = ref(false);

const attachmentUpload = useMediaUpload('forum');

const attachmentHint = computed(() => {
  const limits = attachmentUpload.limits.value;
  if (!limits) return '';
  return `До ${limits.countMax} файлов, макс. ${limits.sizeMaxMb} MB`;
});

onMounted(async () => {
  try {
    const tree = await listCategories();
    categories.value = flattenCategories(tree);
    categoryId.value = categories.value[0]?.id ?? '';
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить категории';
  } finally {
    loading.value = false;
  }
});

async function submit() {
  if (!categoryId.value || !title.value.trim() || !body.value.trim()) return;
  saving.value = true;
  error.value = null;
  try {
    const topic = await createTopic({
      categoryId: categoryId.value,
      title: title.value.trim(),
      body: body.value.trim(),
      attachments: attachmentUpload.readyAttachments.value,
    });
    await router.push(`/forum/topics/${topic.id}`);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось создать тему';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <section class="forum-new">
    <h1>Новая тема</h1>

    <p
      v-if="loading"
      class="forum-new__status"
    >
      Загрузка…
    </p>

    <form
      v-else
      class="forum-new__form"
      @submit.prevent="submit"
    >
      <label>
        Категория
        <select
          v-model="categoryId"
          required
        >
          <option
            v-for="cat in categories"
            :key="cat.id"
            :value="cat.id"
          >
            {{ cat.title }}
          </option>
        </select>
      </label>

      <label>
        Заголовок
        <input
          v-model="title"
          type="text"
          maxlength="256"
          required
        >
      </label>

      <label>
        Текст (Markdown)
        <textarea
          v-model="body"
          rows="8"
          maxlength="10000"
          placeholder="**жирный**, *курсив*, списки, ссылки, `код`, ```блоки кода```"
          required
        />
      </label>

      <fieldset class="forum-new__attachments">
        <legend>
          <button
            type="button"
            class="forum-new__attachments-toggle"
            @click="attachmentsExpanded = !attachmentsExpanded"
          >
            3. Вложения
            <span
              v-if="attachmentUpload.count.value > 0"
              class="forum-new__attachments-count"
            >📎 {{ attachmentUpload.count.value }}</span>
            <span>{{ attachmentsExpanded ? '▼' : '▶' }}</span>
          </button>
        </legend>

        <div v-if="attachmentsExpanded">
          <p
            v-if="attachmentUpload.globalError.value"
            class="forum-new__error"
          >
            {{ attachmentUpload.globalError.value }}
          </p>
          <MediaUploader
            :items="attachmentUpload.items.value"
            :accept="attachmentUpload.limits.value?.accept ?? 'image/*,.pdf'"
            :can-add-more="attachmentUpload.canAddMore.value"
            :hint="attachmentHint"
            @select="attachmentUpload.addFiles($event)"
            @remove="attachmentUpload.removeItem"
          />
        </div>
      </fieldset>

      <p
        v-if="error"
        class="forum-new__error"
      >
        {{ error }}
      </p>

      <UiButton
        intent="primary"
        type="submit"
        :disabled="saving"
      >
        {{ saving ? 'Создание…' : 'Опубликовать' }}
      </UiButton>
    </form>
  </section>
</template>

<style scoped>
.forum-new__form {
  display: grid;
  gap: 1rem;
  max-width: 40rem;
}

.forum-new__form label {
  display: grid;
  gap: 0.35rem;
}

.forum-new__form input,
.forum-new__form select,
.forum-new__form textarea {
  width: 100%;
}

.forum-new__attachments {
  border: 1px solid var(--color-border, #ddd);
  border-radius: 8px;
  padding: 0.75rem;
}

.forum-new__attachments-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  font: inherit;
}

.forum-new__attachments-count {
  font-size: 0.9rem;
}

.forum-new__error {
  color: #b42318;
}
</style>
