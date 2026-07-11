<script setup lang="ts">
import {
  createTopic,
  flattenCategories,
  listCategories,
  type CategoryNode,
} from '@/services/forum';
import { UiButton } from '@tavrida/ui';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const categories = ref<CategoryNode[]>([]);
const categoryId = ref('');
const title = ref('');
const body = ref('');
const loading = ref(true);
const saving = ref(false);
const error = ref<string | null>(null);

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

    <p v-if="loading" class="forum-new__status">Загрузка…</p>

    <form v-else class="forum-new__form" @submit.prevent="submit">
      <label>
        Категория
        <select v-model="categoryId" required>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">
            {{ cat.title }}
          </option>
        </select>
      </label>

      <label>
        Заголовок
        <input v-model="title" type="text" maxlength="256" required />
      </label>

      <label>
        Текст
        <textarea v-model="body" rows="8" maxlength="10000" required />
      </label>

      <p v-if="error" class="forum-new__error">{{ error }}</p>

      <UiButton intent="primary" type="submit" :disabled="saving">
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

.forum-new__error {
  color: #b42318;
}
</style>
