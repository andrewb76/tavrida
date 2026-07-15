<script setup lang="ts">
import EventSubscribeButton from '@/components/subscriptions/EventSubscribeButton.vue';
import {
  listForumTags,
  updateTopicTags,
  type ForumTagItem,
} from '@/services/forum';
import { UiButton, UiIcon } from '@tavrida/ui';
import { computed, onMounted, ref, watch } from 'vue';
import { toast } from 'vue-sonner';

const props = defineProps<{
  topicId: string;
  tags: string[];
  tagItems?: ForumTagItem[];
  canEdit: boolean;
}>();

const emit = defineEmits<{
  updated: [payload: { tags: string[]; tagItems: ForumTagItem[] }];
}>();

const draft = ref('');
const localItems = ref<ForumTagItem[]>([...(props.tagItems ?? [])]);
const suggestions = ref<ForumTagItem[]>([]);
const saving = ref(false);

function itemsFromProps(): ForumTagItem[] {
  if (props.tagItems?.length) return [...props.tagItems];
  return (props.tags ?? []).map((slug) => ({
    id: '',
    slug,
    displayName: slug,
    isOfficial: false,
  }));
}

watch(
  () => [props.tags, props.tagItems] as const,
  () => {
    localItems.value = itemsFromProps();
  },
);

onMounted(() => {
  localItems.value = itemsFromProps();
});

const canAdd = computed(() => {
  const t = draft.value.trim().replace(/^#/, '');
  if (!t || localItems.value.length >= 10) return false;
  const slugHint = t.toLowerCase();
  return !localItems.value.some(
    (item) => item.displayName.toLowerCase() === slugHint || item.slug === slugHint,
  );
});

async function persist(nextLabels: string[]) {
  saving.value = true;
  try {
    const topic = await updateTopicTags(props.topicId, nextLabels);
    localItems.value = topic.tagItems ?? itemsFromLabels(topic.tags ?? nextLabels);
    emit('updated', {
      tags: topic.tags ?? nextLabels,
      tagItems: localItems.value,
    });
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Не удалось сохранить теги');
    localItems.value = itemsFromProps();
  } finally {
    saving.value = false;
  }
}

function itemsFromLabels(labels: string[]): ForumTagItem[] {
  return labels.map((slug) => ({
    id: '',
    slug,
    displayName: slug,
    isOfficial: false,
  }));
}

async function addTag() {
  if (!canAdd.value || !props.canEdit) return;
  const t = draft.value.trim().replace(/^#/, '').slice(0, 32);
  draft.value = '';
  suggestions.value = [];
  await persist([...localItems.value.map((i) => i.displayName), t]);
}

async function removeTag(item: ForumTagItem) {
  if (!props.canEdit) return;
  await persist(
    localItems.value.filter((t) => t.slug !== item.slug).map((t) => t.displayName),
  );
}

async function onDraftInput() {
  const q = draft.value.trim().replace(/^#/, '');
  if (q.length < 1) {
    suggestions.value = [];
    return;
  }
  try {
    suggestions.value = (await listForumTags(q)).slice(0, 6);
  } catch {
    suggestions.value = [];
  }
}

function pickSuggestion(item: ForumTagItem) {
  draft.value = item.displayName;
  suggestions.value = [];
  void addTag();
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
      v-if="localItems.length"
      class="forum-tags__list"
    >
      <li
        v-for="item in localItems"
        :key="item.id || item.slug"
        class="forum-tags__chip"
        :class="{ 'is-official': item.isOfficial }"
      >
        <span>#{{ item.displayName }}</span>
        <EventSubscribeButton
          v-if="item.id"
          source-domain="platform"
          target-type="TAG"
          :target-id="item.id"
          compact
        />
        <button
          v-if="canEdit"
          type="button"
          class="forum-tags__remove"
          :disabled="saving"
          :aria-label="`Убрать тег ${item.displayName}`"
          @click="removeTag(item)"
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
      <div class="forum-tags__input-wrap">
        <input
          v-model="draft"
          type="text"
          maxlength="32"
          placeholder="тег"
          :disabled="saving"
          aria-label="Новый тег"
          autocomplete="off"
          @input="onDraftInput"
        >
        <ul
          v-if="suggestions.length"
          class="forum-tags__suggest"
          role="listbox"
        >
          <li
            v-for="s in suggestions"
            :key="s.id"
          >
            <button
              type="button"
              @click="pickSuggestion(s)"
            >
              #{{ s.displayName }}
              <span
                v-if="s.isOfficial"
                class="forum-tags__official"
              >офиц.</span>
            </button>
          </li>
        </ul>
      </div>
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

.forum-tags__chip.is-official {
  border-color: color-mix(in srgb, var(--color-primary, #2563eb) 45%, var(--color-border, #ddd));
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

.forum-tags__input-wrap {
  position: relative;
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

.forum-tags__suggest {
  position: absolute;
  z-index: 5;
  top: 100%;
  left: 0;
  margin: 0.15rem 0 0;
  padding: 0.25rem;
  list-style: none;
  min-width: 10rem;
  background: var(--color-surface, #fff);
  border: 1px solid var(--color-border, #ddd);
  border-radius: 0.375rem;
  box-shadow: 0 4px 12px rgb(0 0 0 / 8%);
}

.forum-tags__suggest button {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.5rem;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 0.8125rem;
  text-align: left;
  cursor: pointer;
  border-radius: 0.25rem;
}

.forum-tags__suggest button:hover {
  background: color-mix(in srgb, var(--color-primary, #2563eb) 10%, transparent);
}

.forum-tags__official {
  font-size: 0.7rem;
  color: var(--color-primary, #2563eb);
}
</style>
