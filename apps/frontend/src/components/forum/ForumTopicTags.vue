<script setup lang="ts">
import { updateTopicTags } from '@/services/forum';
import { UiButton, UiIcon } from '@tavrida/ui';
import { computed, ref, watch } from 'vue';
import { toast } from 'vue-sonner';

const props = defineProps<{
  topicId: string;
  tags: string[];
  canEdit: boolean;
}>();

const emit = defineEmits<{
  updated: [string[]];
}>();

const draft = ref('');
const localTags = ref<string[]>([...props.tags]);
const saving = ref(false);

watch(
  () => props.tags,
  (next) => {
    localTags.value = [...next];
  },
);

const canAdd = computed(() => {
  const t = draft.value.trim().replace(/^#/, '');
  return t.length > 0 && localTags.value.length < 10 && !localTags.value.includes(t);
});

async function persist(next: string[]) {
  saving.value = true;
  try {
    const topic = await updateTopicTags(props.topicId, next);
    localTags.value = topic.tags ?? next;
    emit('updated', localTags.value);
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Не удалось сохранить теги');
    localTags.value = [...props.tags];
  } finally {
    saving.value = false;
  }
}

async function addTag() {
  if (!canAdd.value || !props.canEdit) return;
  const t = draft.value.trim().replace(/^#/, '').slice(0, 32);
  draft.value = '';
  await persist([...localTags.value, t]);
}

async function removeTag(tag: string) {
  if (!props.canEdit) return;
  await persist(localTags.value.filter((t) => t !== tag));
}
</script>

<template>
  <div class="forum-tags">
    <UiIcon
      name="tag"
      :size="16"
      class="forum-tags__icon"
      label="Теги"
    />
    <ul
      v-if="localTags.length"
      class="forum-tags__list"
    >
      <li
        v-for="tag in localTags"
        :key="tag"
        class="forum-tags__chip"
      >
        <span>#{{ tag }}</span>
        <button
          v-if="canEdit"
          type="button"
          class="forum-tags__remove"
          :disabled="saving"
          :aria-label="`Убрать тег ${tag}`"
          @click="removeTag(tag)"
        >
          ×
        </button>
      </li>
    </ul>
    <span
      v-else-if="!canEdit"
      class="forum-tags__empty"
    >Без тегов</span>

    <form
      v-if="canEdit"
      class="forum-tags__add"
      @submit.prevent="addTag"
    >
      <input
        v-model="draft"
        type="text"
        maxlength="32"
        placeholder="тег"
        :disabled="saving"
        aria-label="Новый тег"
      >
      <UiButton
        intent="ghost"
        size="sm"
        type="submit"
        :disabled="!canAdd || saving"
      >
        Добавить
      </UiButton>
    </form>
  </div>
</template>

<style scoped>
.forum-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.forum-tags__icon {
  color: var(--color-text-muted, #666);
}

.forum-tags__list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.forum-tags__chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.15rem 0.5rem;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 0.375rem;
  font-size: 0.8125rem;
  color: var(--color-text-muted, #555);
}

.forum-tags__remove {
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  color: inherit;
  opacity: 0.7;
}

.forum-tags__remove:hover {
  opacity: 1;
}

.forum-tags__empty {
  font-size: 0.8125rem;
  color: var(--color-text-muted, #888);
}

.forum-tags__add {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.forum-tags__add input {
  width: 7rem;
  height: 2rem;
  padding: 0 0.5rem;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 0.375rem;
  font: inherit;
  font-size: 0.8125rem;
}
</style>
