<script setup lang="ts">
import { auctionTypeLabel, formatMoney } from '@/services/auction-format';
import {
  createAuction,
  getAuctionCreateOptions,
  type AuctionCreateOptions,
  type CreateAuctionInput,
} from '@/services/auctions';
import { flattenCategories, listCategories, type CategoryNode } from '@/services/forum';
import { UiButton } from '@tavrida/ui';
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';

const router = useRouter();

const options = ref<AuctionCreateOptions | null>(null);
const categories = ref<CategoryNode[]>([]);
const loading = ref(true);
const submitting = ref(false);
const error = ref<string | null>(null);
const formError = ref<string | null>(null);

const title = ref('');
const description = ref('');
const categoryId = ref('');
const type = ref<'ENGLISH' | 'DUTCH'>('ENGLISH');
const startingPrice = ref(1000);
const bidIncrement = ref(100);
const startsAtLocal = ref('');
const endsAtLocal = ref('');
const reserveEnabled = ref(false);
const reservePrice = ref(1000);
const promote = ref(false);
const imagePreviews = ref<string[]>([]);

const flatCategories = computed(() => flattenCategories(categories.value));

const canSubmit = computed(() => {
  if (!options.value) return false;
  const dl = options.value.dailyLimit;
  if (dl.limit != null && dl.remaining === 0) return false;
  return true;
});

const dailyLimitLabel = computed(() => {
  const dl = options.value?.dailyLimit;
  if (!dl || dl.limit == null) return 'Без лимита на создание лотов';
  return `Осталось лотов сегодня: ${dl.remaining ?? 0} / ${dl.limit}`;
});

function defaultSchedule() {
  const start = new Date();
  const end = new Date(start.getTime() + 48 * 60 * 60 * 1000);
  startsAtLocal.value = toLocalInput(start);
  endsAtLocal.value = toLocalInput(end);
}

function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIso(local: string) {
  return new Date(local).toISOString();
}

onMounted(async () => {
  loading.value = true;
  error.value = null;
  try {
    const [opts, cats] = await Promise.all([getAuctionCreateOptions(), listCategories()]);
    options.value = opts;
    categories.value = cats;
    type.value = opts.allowedTypes[0] ?? 'ENGLISH';
    defaultSchedule();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка загрузки';
  } finally {
    loading.value = false;
  }
});

function onPhotosSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = input.files;
  if (!files?.length) return;

  for (const file of Array.from(files).slice(0, 4)) {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        imagePreviews.value = [...imagePreviews.value, reader.result].slice(0, 4);
      }
    };
    reader.readAsDataURL(file);
  }
  input.value = '';
}

function removePhoto(index: number) {
  imagePreviews.value = imagePreviews.value.filter((_, i) => i !== index);
}

async function submit() {
  if (!options.value || !canSubmit.value) return;
  formError.value = null;
  submitting.value = true;

  const payload: CreateAuctionInput = {
    title: title.value.trim(),
    description: description.value.trim(),
    categoryId: categoryId.value || undefined,
    type: type.value,
    startingPrice: startingPrice.value,
    bidIncrement: bidIncrement.value,
    startsAt: toIso(startsAtLocal.value),
    endsAt: toIso(endsAtLocal.value),
    images: imagePreviews.value.length ? imagePreviews.value : undefined,
    promote: promote.value,
  };

  if (options.value.reserveEnabled && reserveEnabled.value) {
    payload.reservePrice = reservePrice.value;
  }

  try {
    const created = await createAuction(payload);
    await router.push(`/auctions/${created.id}`);
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Не удалось создать лот';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <section class="create-lot">
    <header class="create-lot__header">
      <RouterLink
        to="/auctions"
        class="create-lot__back"
      >
        ← Каталог
      </RouterLink>
      <span class="create-lot__tag">W04</span>
    </header>

    <h1>Новый лот</h1>
    <p class="create-lot__lead">
      Заполните карточку лота и опубликуйте аукцион.
    </p>

    <p
      v-if="loading"
      class="create-lot__status"
    >
      Загрузка…
    </p>
    <p
      v-else-if="error"
      class="create-lot__error"
    >
      {{ error }}
    </p>

    <form
      v-else-if="options"
      class="create-lot__form"
      @submit.prevent="submit"
    >
      <fieldset class="create-lot__section">
        <legend>1. Фото</legend>
        <p class="create-lot__hint">
          Загрузка в MinIO — в разработке; сейчас превью хранится локально.
        </p>
        <div class="create-lot__photos">
          <label class="create-lot__upload">
            <span>+ Добавить</span>
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              @change="onPhotosSelected"
            >
          </label>
          <div
            v-for="(src, idx) in imagePreviews"
            :key="idx"
            class="create-lot__photo"
          >
            <img
              :src="src"
              alt=""
            >
            <button
              type="button"
              @click="removePhoto(idx)"
            >
              ×
            </button>
          </div>
        </div>
      </fieldset>

      <fieldset class="create-lot__section">
        <legend>2. Описание</legend>
        <label>
          Название
          <input
            v-model="title"
            type="text"
            required
            minlength="3"
            maxlength="256"
            placeholder="Монета 1787"
          >
        </label>
        <label>
          Описание
          <textarea
            v-model="description"
            rows="5"
            required
            minlength="10"
            placeholder="Состояние, происхождение, размеры…"
          />
        </label>
        <label>
          Категория
          <select v-model="categoryId">
            <option value="">
              Без категории
            </option>
            <option
              v-for="cat in flatCategories"
              :key="cat.id"
              :value="cat.id"
            >
              {{ cat.title }}
            </option>
          </select>
        </label>
      </fieldset>

      <fieldset class="create-lot__section">
        <legend>3. Тип аукциона</legend>
        <label>
          Формат
          <select v-model="type">
            <option
              v-for="t in options.allowedTypes"
              :key="t"
              :value="t"
            >
              {{ auctionTypeLabel(t) }}
            </option>
          </select>
        </label>
        <p
          v-if="options.allowedTypes.length === 1"
          class="create-lot__hint"
        >
          Голландский аукцион доступен на Basic и Pro.
          <RouterLink to="/plans">Тарифы →</RouterLink>
        </p>
      </fieldset>

      <fieldset class="create-lot__section">
        <legend>4. Цена и расписание</legend>
        <div class="create-lot__row">
          <label>
            Стартовая цена (₽)
            <input
              v-model.number="startingPrice"
              type="number"
              min="1"
              required
            >
          </label>
          <label>
            Шаг ставки (₽)
            <input
              v-model.number="bidIncrement"
              type="number"
              min="1"
              required
            >
          </label>
        </div>
        <div class="create-lot__row">
          <label>
            Начало
            <input
              v-model="startsAtLocal"
              type="datetime-local"
              required
            >
          </label>
          <label>
            Окончание
            <input
              v-model="endsAtLocal"
              type="datetime-local"
              required
            >
          </label>
        </div>
        <p
          v-if="options.maxDurationHours"
          class="create-lot__hint"
        >
          Макс. длительность по тарифу: {{ options.maxDurationHours }} ч
        </p>
      </fieldset>

      <fieldset class="create-lot__section">
        <legend>5. Дополнительно</legend>
        <template v-if="options.reserveEnabled">
          <label class="create-lot__check">
            <input
              v-model="reserveEnabled"
              type="checkbox"
            >
            Резервная цена ({{ formatMoney(options.reserveUnitPrice) }} при публикации)
          </label>
          <label v-if="reserveEnabled">
            Минимальная цена продажи (₽)
            <input
              v-model.number="reservePrice"
              type="number"
              :min="startingPrice"
            >
          </label>
        </template>
        <label
          v-else
          class="create-lot__check create-lot__check--disabled"
        >
          <input
            type="checkbox"
            disabled
          >
          🔒 Резервная цена — Pro
          <RouterLink to="/plans">Тарифы</RouterLink>
        </label>

        <label
          v-if="options.promotionEnabled"
          class="create-lot__check"
        >
          <input
            v-model="promote"
            type="checkbox"
          >
          Продвижение в каталоге ({{ formatMoney(options.promotionUnitPrice) }})
        </label>
        <label
          v-else
          class="create-lot__check create-lot__check--disabled"
        >
          <input
            type="checkbox"
            disabled
          >
          🔒 Продвижение — Pro
        </label>
      </fieldset>

      <p class="create-lot__limit">
        {{ dailyLimitLabel }}
      </p>
      <p
        v-if="formError"
        class="create-lot__error"
      >
        {{ formError }}
      </p>

      <UiButton
        intent="primary"
        type="submit"
        class="create-lot__submit"
        :disabled="submitting || !canSubmit"
      >
        {{ submitting ? 'Создание…' : 'Создать аукцион' }}
      </UiButton>
    </form>
  </section>
</template>

<style scoped>
.create-lot {
  display: grid;
  gap: 1rem;
  max-width: 720px;
}

.create-lot__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.create-lot__back {
  color: var(--color-primary, #2563eb);
  text-decoration: none;
}

.create-lot__tag {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--color-text-muted, #666);
}

.create-lot__lead {
  margin: 0;
  color: var(--color-text-muted, #666);
}

.create-lot__form {
  display: grid;
  gap: 1rem;
}

.create-lot__section {
  border: 1px solid var(--color-border, #ddd);
  border-radius: 10px;
  padding: 1rem;
  display: grid;
  gap: 0.75rem;
}

.create-lot__section legend {
  font-weight: 600;
  padding: 0 0.25rem;
}

.create-lot__section label {
  display: grid;
  gap: 0.25rem;
  font-size: 0.9rem;
}

.create-lot__section input,
.create-lot__section textarea,
.create-lot__section select {
  padding: 0.5rem 0.65rem;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 8px;
}

.create-lot__row {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.create-lot__hint {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-text-muted, #666);
}

.create-lot__photos {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.create-lot__upload {
  width: 88px;
  height: 88px;
  border: 1px dashed var(--color-border, #ddd);
  border-radius: 8px;
  display: grid;
  place-items: center;
  cursor: pointer;
  font-size: 0.85rem;
}

.create-lot__photo {
  position: relative;
  width: 88px;
  height: 88px;
}

.create-lot__photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}

.create-lot__photo button {
  position: absolute;
  top: 2px;
  right: 2px;
  border: 0;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  cursor: pointer;
}

.create-lot__check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.create-lot__check--disabled {
  opacity: 0.75;
}

.create-lot__limit {
  margin: 0;
  font-weight: 600;
}

.create-lot__submit {
  width: 100%;
}

.create-lot__status {
  color: var(--color-text-muted, #666);
}

.create-lot__error {
  color: #b42318;
}
</style>
