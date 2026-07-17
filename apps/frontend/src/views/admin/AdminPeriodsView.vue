<script setup lang="ts">
import PeriodTree from '@/components/periods/PeriodTree.vue';
import { UiButton } from '@tavrida/ui';
import { computed, onMounted, ref, watch } from 'vue';
import { toast } from 'vue-sonner';
import {
  adminDeleteCategory,
  adminDeletePeriod,
  adminListCategories,
  adminListPeriods,
  adminReplaceChildren,
  adminSaveCategory,
  adminSavePeriod,
  type MetadataField,
  type MetadataFieldType,
  type PeriodCategory,
  type PeriodRecord,
} from '@/services/periodsAdmin';

const tab = ref<'categories' | 'periods'>('categories');
const loading = ref(true);
const error = ref('');
const categories = ref<PeriodCategory[]>([]);
const periods = ref<PeriodRecord[]>([]);
const showCategoryForm = ref(false);
const showPeriodForm = ref(false);

const selectedCategoryId = ref<string>('');
const editingCategory = ref<PeriodCategory | null>(null);
const categoryForm = ref({
  slug: '',
  title: '',
  description: '',
  sortOrder: 0,
  isActive: true,
  fields: [] as MetadataField[],
});

const periodParentId = ref<string | null>(null);
const editingPeriod = ref<PeriodRecord | null>(null);
const periodForm = ref({
  title: '',
  startsOn: '',
  endsOn: '',
  summary: '',
  body: '',
  metadata: {} as Record<string, unknown>,
});

const partitionDraft = ref<
  Array<{ id?: string; title: string; startsOn: string; endsOn: string }>
>([]);
const partitionParent = ref<PeriodRecord | null>(null);

const selectedCategory = computed(
  () => categories.value.find((c) => c.id === selectedCategoryId.value) ?? null,
);

const fieldTypes: MetadataFieldType[] = [
  'string',
  'text',
  'integer',
  'number',
  'boolean',
  'enum',
  'string[]',
];

async function loadCategories() {
  categories.value = await adminListCategories();
  if (!selectedCategoryId.value && categories.value[0]) {
    selectedCategoryId.value = categories.value[0].id;
  }
}

let periodsLoadGeneration = 0;

async function loadPeriods() {
  const generation = ++periodsLoadGeneration;
  const categoryId = selectedCategoryId.value;
  if (!categoryId) {
    periods.value = [];
    return;
  }
  const rows = await adminListPeriods({
    categoryId,
    rootsOnly: true,
    view: 'tree',
  });
  if (generation !== periodsLoadGeneration || categoryId !== selectedCategoryId.value) return;
  periods.value = rows;
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    await loadCategories();
    await loadPeriods();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка загрузки';
  } finally {
    loading.value = false;
  }
}

function startNewCategory() {
  editingCategory.value = null;
  categoryForm.value = {
    slug: '',
    title: '',
    description: '',
    sortOrder: 100,
    isActive: true,
    fields: [],
  };
  showCategoryForm.value = true;
}

function startEditCategory(cat: PeriodCategory) {
  editingCategory.value = cat;
  categoryForm.value = {
    slug: cat.slug,
    title: cat.title,
    description: cat.description,
    sortOrder: cat.sortOrder,
    isActive: cat.isActive,
    fields: structuredClone(cat.metadataSchema?.fields ?? []),
  };
  showCategoryForm.value = true;
}

function addSchemaField() {
  categoryForm.value.fields.push({
    key: `field${categoryForm.value.fields.length + 1}`,
    type: 'string',
    label: 'Новое поле',
    required: false,
  });
}

async function saveCategory() {
  try {
    await adminSaveCategory(
      {
        slug: categoryForm.value.slug,
        title: categoryForm.value.title,
        description: categoryForm.value.description,
        sortOrder: Number(categoryForm.value.sortOrder),
        isActive: categoryForm.value.isActive,
        metadataSchema: { fields: categoryForm.value.fields },
      },
      editingCategory.value?.id,
    );
    toast.success('Категория сохранена');
    showCategoryForm.value = false;
    await loadCategories();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  }
}

async function removeCategory(cat: PeriodCategory) {
  if (!window.confirm(`Удалить категорию «${cat.title}»?`)) return;
  try {
    await adminDeleteCategory(cat.id);
    toast.success('Удалено');
    await load();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  }
}

function startNewPeriod(parent: PeriodRecord | null) {
  periodParentId.value = parent?.id ?? null;
  editingPeriod.value = null;
  periodForm.value = {
    title: '',
    startsOn: parent?.startsOn ? String(parent.startsOn).slice(0, 10) : '1000-01-01',
    endsOn: parent?.endsOn ? String(parent.endsOn).slice(0, 10) : '2000-12-31',
    summary: '',
    body: '',
    metadata: {},
  };
  showPeriodForm.value = true;
}

function startEditPeriod(period: PeriodRecord) {
  periodParentId.value = period.parentId;
  editingPeriod.value = period;
  periodForm.value = {
    title: period.title,
    startsOn: String(period.startsOn).slice(0, 10),
    endsOn: String(period.endsOn).slice(0, 10),
    summary: period.summary,
    body: period.body,
    metadata: { ...period.metadata },
  };
  showPeriodForm.value = true;
}

async function savePeriod() {
  try {
    await adminSavePeriod(
      {
        categoryId: periodParentId.value ? undefined : selectedCategoryId.value,
        parentId: periodParentId.value ?? undefined,
        title: periodForm.value.title,
        startsOn: periodForm.value.startsOn,
        endsOn: periodForm.value.endsOn,
        summary: periodForm.value.summary,
        body: periodForm.value.body,
        metadata: periodForm.value.metadata,
      },
      editingPeriod.value?.id,
    );
    toast.success('Период сохранён');
    showPeriodForm.value = false;
    await loadPeriods();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  }
}

async function removePeriod(period: PeriodRecord) {
  if (!window.confirm(`Удалить «${period.title}»?`)) return;
  try {
    await adminDeletePeriod(period.id);
    toast.success('Удалено');
    await loadPeriods();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  }
}

function openPartition(parent: PeriodRecord) {
  partitionParent.value = parent;
  const kids = parent.children ?? [];
  partitionDraft.value =
    kids.length > 0
      ? kids.map((c) => ({
          id: c.id,
          title: c.title,
          startsOn: String(c.startsOn).slice(0, 10),
          endsOn: String(c.endsOn).slice(0, 10),
        }))
      : [
          {
            title: 'Часть 1',
            startsOn: String(parent.startsOn).slice(0, 10),
            endsOn: String(parent.endsOn).slice(0, 10),
          },
        ];
}

function addPartitionRow() {
  const last = partitionDraft.value[partitionDraft.value.length - 1];
  partitionDraft.value.push({
    title: `Часть ${partitionDraft.value.length + 1}`,
    startsOn: last?.endsOn ?? '',
    endsOn: partitionParent.value ? String(partitionParent.value.endsOn).slice(0, 10) : '',
  });
}

async function savePartition() {
  if (!partitionParent.value) return;
  try {
    await adminReplaceChildren(partitionParent.value.id, partitionDraft.value);
    toast.success('Разбиение сохранено');
    partitionParent.value = null;
    await loadPeriods();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка partition');
  }
}

function metaFieldValue(key: string): string | number | boolean {
  const v = periodForm.value.metadata[key];
  if (typeof v === 'boolean' || typeof v === 'number') return v;
  if (Array.isArray(v)) return v.join(', ');
  return v == null ? '' : String(v);
}

function setMetaField(field: MetadataField, raw: string | boolean) {
  if (field.type === 'boolean') {
    periodForm.value.metadata[field.key] = Boolean(raw);
    return;
  }
  if (field.type === 'integer') {
    periodForm.value.metadata[field.key] =
      raw === '' ? undefined : Number.parseInt(String(raw), 10);
    return;
  }
  if (field.type === 'number') {
    periodForm.value.metadata[field.key] = raw === '' ? undefined : Number(raw);
    return;
  }
  if (field.type === 'string[]') {
    periodForm.value.metadata[field.key] = String(raw)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return;
  }
  periodForm.value.metadata[field.key] = raw;
}

watch(selectedCategoryId, () => {
  void loadPeriods();
});

onMounted(load);
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap gap-2">
      <UiButton
        :intent="tab === 'categories' ? 'primary' : 'secondary'"
        size="sm"
        type="button"
        @click="tab = 'categories'"
      >
        Категории
      </UiButton>
      <UiButton
        :intent="tab === 'periods' ? 'primary' : 'secondary'"
        size="sm"
        type="button"
        @click="tab = 'periods'"
      >
        Периоды
      </UiButton>
    </div>

    <p
      v-if="loading"
      class="text-sm text-text-muted"
    >
      Загрузка…
    </p>
    <p
      v-else-if="error"
      class="text-sm text-error"
    >
      {{ error }}
    </p>

    <template v-else-if="tab === 'categories'">
      <div class="flex justify-between gap-3">
        <p class="text-sm text-text-muted">
          Слои классификации и схема метаданных.
        </p>
        <UiButton
          size="sm"
          type="button"
          @click="startNewCategory"
        >
          Новая категория
        </UiButton>
      </div>

      <ul class="divide-y divide-border rounded-md border border-border">
        <li
          v-for="cat in categories"
          :key="cat.id"
          class="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
        >
          <div>
            <div class="font-medium">
              {{ cat.title }}
              <span class="font-normal text-text-muted"> ({{ cat.slug }}) </span>
            </div>
            <div class="text-xs text-text-muted">
              полей схемы: {{ cat.metadataSchema?.fields?.length ?? 0 }}
            </div>
          </div>
          <div class="flex gap-2">
            <UiButton
              intent="ghost"
              size="sm"
              type="button"
              @click="startEditCategory(cat)"
            >
              Изменить
            </UiButton>
            <UiButton
              intent="danger"
              size="sm"
              type="button"
              @click="removeCategory(cat)"
            >
              Удалить
            </UiButton>
          </div>
        </li>
      </ul>

      <form
        v-if="showCategoryForm"
        class="space-y-3 rounded-md border border-border p-4"
        @submit.prevent="saveCategory"
      >
        <h2 class="text-lg font-medium">
          {{ editingCategory ? 'Редактировать категорию' : 'Новая категория' }}
        </h2>
        <label class="grid gap-1 text-sm">
          Slug
          <input
            v-model="categoryForm.slug"
            class="rounded border border-border px-2 py-1"
            :disabled="Boolean(editingCategory)"
            required
          >
        </label>
        <label class="grid gap-1 text-sm">
          Название
          <input
            v-model="categoryForm.title"
            class="rounded border border-border px-2 py-1"
            required
          >
        </label>
        <label class="grid gap-1 text-sm">
          Описание
          <textarea
            v-model="categoryForm.description"
            class="rounded border border-border px-2 py-1"
            rows="2"
          />
        </label>
        <label class="grid gap-1 text-sm">
          Порядок
          <input
            v-model.number="categoryForm.sortOrder"
            class="rounded border border-border px-2 py-1"
            type="number"
          >
        </label>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <h3 class="font-medium">
              Схема метаданных
            </h3>
            <UiButton
              intent="secondary"
              size="sm"
              type="button"
              @click="addSchemaField"
            >
              Поле
            </UiButton>
          </div>
          <div
            v-for="(field, idx) in categoryForm.fields"
            :key="idx"
            class="grid gap-2 rounded border border-border p-2 md:grid-cols-4"
          >
            <input
              v-model="field.key"
              class="rounded border border-border px-2 py-1 text-sm"
              placeholder="key"
            >
            <input
              v-model="field.label"
              class="rounded border border-border px-2 py-1 text-sm"
              placeholder="label"
            >
            <select
              v-model="field.type"
              class="rounded border border-border px-2 py-1 text-sm"
            >
              <option
                v-for="t in fieldTypes"
                :key="t"
                :value="t"
              >
                {{ t }}
              </option>
            </select>
            <input
              v-if="field.type === 'enum'"
              :value="(field.options ?? []).join(',')"
              class="rounded border border-border px-2 py-1 text-sm md:col-span-4"
              placeholder="options через запятую"
              @input="
                field.options = ($event.target as HTMLInputElement).value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
              "
            >
          </div>
        </div>

        <div class="flex gap-2">
          <UiButton
            type="submit"
            size="sm"
          >
            Сохранить
          </UiButton>
          <UiButton
            intent="secondary"
            size="sm"
            type="button"
            @click="showCategoryForm = false"
          >
            Отмена
          </UiButton>
        </div>
      </form>
    </template>

    <template v-else>
      <div class="flex flex-wrap items-end gap-3">
        <label class="grid gap-1 text-sm">
          Категория
          <select
            v-model="selectedCategoryId"
            class="rounded border border-border px-2 py-1"
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
        <UiButton
          size="sm"
          type="button"
          @click="startNewPeriod(null)"
        >
          Корневой период
        </UiButton>
      </div>

      <PeriodTree
        :nodes="periods"
        @edit="startEditPeriod"
        @add-child="startNewPeriod"
        @partition="openPartition"
        @remove="removePeriod"
      />

      <form
        v-if="showPeriodForm"
        class="space-y-3 rounded-md border border-border p-4"
        @submit.prevent="savePeriod"
      >
        <h2 class="text-lg font-medium">
          {{
            editingPeriod
              ? 'Редактировать период'
              : periodParentId
                ? 'Дочерний период'
                : 'Корневой период'
          }}
        </h2>
        <label class="grid gap-1 text-sm">
          Название
          <input
            v-model="periodForm.title"
            class="rounded border border-border px-2 py-1"
            required
          >
        </label>
        <div class="grid gap-3 md:grid-cols-2">
          <label class="grid gap-1 text-sm">
            Начало
            <input
              v-model="periodForm.startsOn"
              class="rounded border border-border px-2 py-1"
              type="date"
              required
            >
          </label>
          <label class="grid gap-1 text-sm">
            Конец
            <input
              v-model="periodForm.endsOn"
              class="rounded border border-border px-2 py-1"
              type="date"
              required
            >
          </label>
        </div>
        <label class="grid gap-1 text-sm">
          Кратко
          <textarea
            v-model="periodForm.summary"
            class="rounded border border-border px-2 py-1"
            rows="2"
          />
        </label>
        <label class="grid gap-1 text-sm">
          Полное описание
          <textarea
            v-model="periodForm.body"
            class="rounded border border-border px-2 py-1"
            rows="4"
          />
        </label>

        <div
          v-if="selectedCategory?.metadataSchema?.fields?.length"
          class="space-y-2"
        >
          <h3 class="font-medium">
            Метаданные
          </h3>
          <label
            v-for="field in selectedCategory.metadataSchema.fields"
            :key="field.key"
            class="grid gap-1 text-sm"
          >
            {{ field.label }}
            <select
              v-if="field.type === 'enum'"
              class="rounded border border-border px-2 py-1"
              :value="String(metaFieldValue(field.key))"
              @change="setMetaField(field, ($event.target as HTMLSelectElement).value)"
            >
              <option value="">
                —
              </option>
              <option
                v-for="opt in field.options ?? []"
                :key="opt"
                :value="opt"
              >
                {{ opt }}
              </option>
            </select>
            <input
              v-else-if="field.type === 'boolean'"
              type="checkbox"
              :checked="Boolean(metaFieldValue(field.key))"
              @change="setMetaField(field, ($event.target as HTMLInputElement).checked)"
            >
            <textarea
              v-else-if="field.type === 'text'"
              class="rounded border border-border px-2 py-1"
              rows="2"
              :value="String(metaFieldValue(field.key))"
              @input="setMetaField(field, ($event.target as HTMLTextAreaElement).value)"
            />
            <input
              v-else
              class="rounded border border-border px-2 py-1"
              :type="field.type === 'integer' || field.type === 'number' ? 'number' : 'text'"
              :value="String(metaFieldValue(field.key))"
              @input="setMetaField(field, ($event.target as HTMLInputElement).value)"
            >
          </label>
        </div>

        <div class="flex gap-2">
          <UiButton
            type="submit"
            size="sm"
          >
            Сохранить
          </UiButton>
          <UiButton
            intent="secondary"
            size="sm"
            type="button"
            @click="showPeriodForm = false"
          >
            Отмена
          </UiButton>
        </div>
      </form>

      <div
        v-if="partitionParent"
        class="space-y-3 rounded-md border border-border p-4"
      >
        <h2 class="text-lg font-medium">
          Разбиение: {{ partitionParent.title }}
        </h2>
        <p class="text-sm text-text-muted">
          Дети покрывают родителя без дыр: стык end = start соседа.
        </p>
        <div
          v-for="(row, idx) in partitionDraft"
          :key="idx"
          class="grid gap-2 md:grid-cols-3"
        >
          <input
            v-model="row.title"
            class="rounded border border-border px-2 py-1"
            placeholder="Название"
          >
          <input
            v-model="row.startsOn"
            class="rounded border border-border px-2 py-1"
            type="date"
          >
          <input
            v-model="row.endsOn"
            class="rounded border border-border px-2 py-1"
            type="date"
          >
        </div>
        <div class="flex flex-wrap gap-2">
          <UiButton
            intent="secondary"
            size="sm"
            type="button"
            @click="addPartitionRow"
          >
            + сегмент
          </UiButton>
          <UiButton
            size="sm"
            type="button"
            @click="savePartition"
          >
            Сохранить partition
          </UiButton>
          <UiButton
            intent="ghost"
            size="sm"
            type="button"
            @click="partitionParent = null"
          >
            Отмена
          </UiButton>
        </div>
      </div>
    </template>
  </div>
</template>
