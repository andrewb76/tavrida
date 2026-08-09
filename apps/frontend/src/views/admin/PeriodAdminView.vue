<script setup lang="ts">
import BceDateInput from '@/components/periods/BceDateInput.vue';
import MediaUploader from '@/components/media/MediaUploader.vue';
import { useMediaUpload } from '@/composables/useMediaUpload';
import { ref, computed, onMounted } from 'vue';
import { adminSavePeriod } from '@/services/periodsAdmin';
import { useRouter } from 'vue-router';

const router = useRouter();

const loading   = ref(true);
const saving    = ref(false);
const error     = ref<string | null>(null);
const filesExpanded = ref(false);
const upload    = useMediaUpload('period');     // <-- наш медиа‑загрузчик
const uploadHint = computed(() => {
  const limits = upload.limits.value;
  if (!limits) return '';
  return `До ${limits.countMax} файлов, макс. ${limits.sizeMaxMb} MB`;
});

const name          = ref('');
const type          = ref('regular' as 'regular' | 'special' | 'holiday');
const startDate     = ref('' as string);
const endDate       = ref('' as string);
const description   = ref('');
const priority      = ref('1' as 1 | 2 | 3);
const calendarVisible = ref(true);
const priorities    = [
  { label: 'Низкий',   value: '1' },
  { label: 'Средний',  value: '2' },
  { label: 'Высокий',  value: '3' },
];

/* ---------- Загрузка данных ---------- */
onMounted(async () => {
  loading.value = true;
  error.value = null;
  try {
    // если понадобится список доступных приоритетов – запрос к API,
    // а пока жёстко задаём массив выше.
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось получить данные';
  } finally {
    loading.value = false;
  }
});

/* ---------- Основная отправка ---------- */
async function submit(status: 'OPEN' | 'DRAFT') {
  if (!name.value.trim() || !startDate.value || !endDate.value) return;

  saving.value = true;
  error.value = null;

  try {
    const created = await adminSavePeriod({
      title:      name.value.trim(),
      startsOn:   startDate.value,
      endsOn:     endDate.value,
      summary:    description.value.trim(),
      metadata:   { priority: Number(priority.value), calendarVisible: calendarVisible.value, status },
    });

    router.push({ name: 'periods-show', params: { id: created.id } });
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка создания периода';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <section class="period-admin">
    <h1>Новый период</h1>

    <p
      v-if="loading"
      class="period-admin__status"
    >Загрузка…</p>

    <!-- Основная форма -->
    <form
      v-else
      class="period-admin__form"
      @submit.prevent="submit('OPEN')"
    >

      <!-- 1️⃣ Поля формы -->
      <label class="period-admin__group">
        <span class="period-admin__label">Название периода</span>
        <input
          v-model="name"
          type="text"
          maxlength="128"
          required
        />
      </label>

      <label class="period-admin__group">
        <span class="period-admin__label">Тип периода</span>
        <select v-model="type" required>
          <option value="regular">Обычный</option>
          <option value="special">Специальный</option>
          <option value="holiday">Праздник</option>
        </select>
      </label>

      <label class="period-admin__group">
        <BceDateInput
          v-model="startDate"
          label="Дата начала"
          :required="true"
        />
      </label>

      <label class="period-admin__group">
        <BceDateInput
          v-model="endDate"
          label="Дата окончания"
          :required="true"
        />
      </label>

      <label class="period-admin__group">
        <span class="period-admin__label">Описание</span>
        <textarea
          v-model="description"
          rows="4"
          maxlength="2000"
          placeholder="Краткое описание периода..."
        ></textarea>
      </label>

      <label class="period-admin__group">
        <span class="period-admin__label">Приоритет</span>
        <select v-model="priority">
          <option v-for="p in priorities" :key="p.value" :value="p.value">
            {{ p.label }}
          </option>
        </select>
      </label>

      <label class="period-admin__group">
        <span class="period-admin__label">Видимость в календаре</span>
        <select v-model="calendarVisible">
          <option value="true">Показывать</option>
          <option value="false">Скрыть</option>
        </select>
      </label>

      <!-- 2️⃣ Прикреплённые файлы (по‑примеру MediaUploader) -->
      <fieldset class="period-admin__attachments">
        <legend>
          <button
            type="button"
            class="forum-new__attachments-toggle"
            @click="filesExpanded = !filesExpanded"
          >
            3. Вложения
            <span v-if="upload.count.value > 0"
                  class="forum-new__attachments-count"
            >📎 {{ upload.count.value }}</span>
            <span>{{ filesExpanded ? '▼' : '▶' }}</span>
          </button>
        </legend>

        <div v-if="filesExpanded">
          <p v-if="upload.globalError.value" class="forum-new__error">
            {{ upload.globalError.value }}
          </p>

          <MediaUploader
            :items="upload.items.value"
            :accept="upload.limits.value?.accept ?? 'image/*,.pdf'"
            :can-add-more="upload.canAddMore.value"
            :hint="uploadHint"
            @select="upload.addFiles($event)"
            @remove="upload.removeItem"
          />
        </div>
      </fieldset>

      <!-- 3️⃣ Ошибки и сообщения -->
      <p v-if="error" class="period-admin__error">{{ error }}</p>

      <!-- 4️⃣ Кнопки действий -->
      <div class="period-admin__actions">
        <UiButton
          intent="secondary"
          type="button"
          :disabled="saving"
          @click="submit('DRAFT')"
        >
          {{ saving ? 'Сохранение…' : 'Сохранить черновик' }}
        </UiButton>

        <UiButton
          intent="primary"
          type="submit"
          :disabled="saving"
        >
          {{ saving ? 'Создание…' : 'Создать период' }}
        </UiButton>
      </div>
    </form>
  </section>
</template>

<style scoped>
.period-admin {
  display: grid;
  gap: 1rem;
  max-width: 42rem;
}

/* Состояние загрузки */
.period-admin__status {
  color: var(--color-text-muted);
}

/* Основная форма */
.period-admin__form {
  display: grid;
  gap: 0.75rem;
}

/* Группы полей (лейбл + input) */
.period-admin__group {
  display: grid;
  gap: 0.35rem;
}

/* Текстовые элементы */
.period-admin__label {
  font-weight: 600;
  color: var(--color-text-primary);
}

/* Поля ввода */
.period-admin__group input,
.period-admin__group select,
.period-admin__group textarea {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font: inherit;
}

/* Текстовые ошибки */
.period-admin__error {
  color: var(--color-error);
}

/* Поле с вложениями (по‑примеру из ForumNew) */
.period-admin__attachments {
  border: none;
  margin: 0;
  padding: 0;
}
.period-admin__attachments-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  font: inherit;
}
</style>