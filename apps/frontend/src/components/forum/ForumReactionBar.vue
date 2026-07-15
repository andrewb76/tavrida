<script setup lang="ts">
import { listForumReactions, upsertForumReaction, type ForumReactionBucket } from '@/services/forum';
import { onMounted, ref, watch } from 'vue';
import { toast } from 'vue-sonner';

const FREE_REACTIONS = [
  { key: '+1', label: '👍' },
  { key: '-1', label: '👎' },
  { key: 'heart', label: '❤️' },
  { key: 'surprised', label: '😮' },
  { key: 'thinking', label: '🤔' },
] as const;

const props = defineProps<{
  contentId: string;
  contentType: 'topic' | 'comment';
  currentUserId?: string | null;
  disabled?: boolean;
}>();

const buckets = ref<ForumReactionBucket[]>([]);
const myEmoji = ref<string | null>(null);
const busy = ref(false);

async function refresh() {
  try {
    const res = await listForumReactions(props.contentId, props.contentType);
    buckets.value = res.reactions;
    myEmoji.value = null;
    if (props.currentUserId) {
      for (const bucket of res.reactions) {
        if (bucket.userIds.includes(props.currentUserId)) {
          myEmoji.value = bucket.emojiKey;
          break;
        }
      }
    }
  } catch {
    /* silent — bar stays empty until next interaction */
  }
}

onMounted(refresh);
watch(
  () => [props.contentId, props.contentType, props.currentUserId] as const,
  () => {
    void refresh();
  },
);

function countFor(key: string): number {
  return buckets.value.find((b) => b.emojiKey === key)?.count ?? 0;
}

async function toggle(emojiKey: string) {
  if (props.disabled || busy.value || !props.currentUserId) return;
  busy.value = true;
  try {
    await upsertForumReaction({
      contentId: props.contentId,
      contentType: props.contentType,
      emojiKey,
    });
    await refresh();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Не удалось поставить реакцию');
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div
    class="forum-reactions"
    role="group"
    aria-label="Реакции"
  >
    <button
      v-for="item in FREE_REACTIONS"
      :key="item.key"
      type="button"
      class="forum-reactions__btn"
      :class="{ 'is-active': myEmoji === item.key }"
      :disabled="disabled || busy || !currentUserId"
      :aria-pressed="myEmoji === item.key"
      :title="item.key"
      @click="toggle(item.key)"
    >
      <span aria-hidden="true">{{ item.label }}</span>
      <span
        v-if="countFor(item.key) > 0"
        class="forum-reactions__count"
      >{{ countFor(item.key) }}</span>
    </button>
  </div>
</template>

<style scoped>
.forum-reactions {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
}

.forum-reactions__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  min-height: 2rem;
  padding: 0.15rem 0.4rem;
  border: 1px solid var(--color-border, #ccc);
  border-radius: 0.375rem;
  background: transparent;
  color: inherit;
  font-size: 0.875rem;
  line-height: 1;
  cursor: pointer;
}

.forum-reactions__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.forum-reactions__btn.is-active {
  border-color: var(--color-primary, #2563eb);
  background: color-mix(in srgb, var(--color-primary, #2563eb) 14%, transparent);
}

.forum-reactions__count {
  font-variant-numeric: tabular-nums;
  font-size: 0.75rem;
  color: var(--color-text-muted, #666);
}
</style>
