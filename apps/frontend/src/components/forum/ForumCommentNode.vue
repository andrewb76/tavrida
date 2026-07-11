<script setup lang="ts">
import { createComment, type CommentTreeNode, type ForumComment } from '@/services/forum';
import { UiButton } from '@tavrida/ui';
import { ref } from 'vue';

const props = defineProps<{
  node: CommentTreeNode;
  topicId: string;
  depth: number;
}>();

const emit = defineEmits<{
  created: [ForumComment];
}>();

const showReply = ref(false);
const replyBody = ref('');
const posting = ref(false);
const postError = ref<string | null>(null);

async function submitReply() {
  if (!replyBody.value.trim()) return;
  posting.value = true;
  postError.value = null;
  try {
    const created = await createComment(props.topicId, {
      body: replyBody.value.trim(),
      parentId: props.node.id,
    });
    emit('created', created);
    replyBody.value = '';
    showReply.value = false;
  } catch (e) {
    postError.value = e instanceof Error ? e.message : 'Не удалось отправить';
  } finally {
    posting.value = false;
  }
}
</script>

<template>
  <li class="forum-comment" :style="{ marginLeft: `${depth * 1.25}rem` }">
    <article class="forum-comment__card">
      <p class="forum-comment__body">{{ node.body }}</p>
      <footer class="forum-comment__meta">
        <small>{{ new Date(node.createdAt).toLocaleString('ru-RU') }}</small>
        <UiButton intent="ghost" size="sm" type="button" @click="showReply = !showReply">
          {{ showReply ? 'Отмена' : 'Ответить' }}
        </UiButton>
      </footer>

      <form v-if="showReply" class="forum-comment__reply-form" @submit.prevent="submitReply">
        <label>
          Ответ на комментарий
          <textarea v-model="replyBody" rows="3" required />
        </label>
        <p v-if="postError" class="forum-comment__error">{{ postError }}</p>
        <UiButton intent="primary" size="sm" type="submit" :disabled="posting">
          {{ posting ? 'Отправка…' : 'Отправить ответ' }}
        </UiButton>
      </form>
    </article>

    <ul v-if="node.children.length" class="forum-comment__children">
      <ForumCommentNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :topic-id="topicId"
        :depth="depth + 1"
        @created="emit('created', $event)"
      />
    </ul>
  </li>
</template>

<style scoped>
.forum-comment {
  list-style: none;
}

.forum-comment__card {
  border: 1px solid var(--color-border, #ddd);
  border-radius: 8px;
  padding: 0.75rem;
  background: var(--color-surface, #fff);
}

.forum-comment__body {
  margin: 0 0 0.5rem;
  white-space: pre-wrap;
}

.forum-comment__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  color: var(--color-text-muted, #666);
}

.forum-comment__children {
  list-style: none;
  margin: 0.75rem 0 0;
  padding: 0;
  display: grid;
  gap: 0.75rem;
}

.forum-comment__reply-form {
  display: grid;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.forum-comment__reply-form textarea {
  width: 100%;
  margin-top: 0.25rem;
}

.forum-comment__error {
  color: #b42318;
  margin: 0;
}
</style>
