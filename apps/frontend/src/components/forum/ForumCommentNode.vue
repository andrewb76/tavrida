<script setup lang="ts">
import AttachmentList from '@/components/media/AttachmentList.vue';
import MarkdownBody from '@/components/media/MarkdownBody.vue';
import MediaUploader from '@/components/media/MediaUploader.vue';
import ForumVoteBar from '@/components/forum/ForumVoteBar.vue';
import UserAvatar from '@/components/user/UserAvatar.vue';
import { useMediaUpload } from '@/composables/useMediaUpload';
import { createComment, forumAuthorLabel, updateComment, type CommentTreeNode, type ForumComment } from '@/services/forum';
import { UiButton } from '@tavrida/ui';
import { canEditForumContent } from '@tavrida/shared';
import { computed, ref } from 'vue';

const props = defineProps<{
  node: CommentTreeNode;
  topicId: string;
  depth: number;
  editWindowMinutes: number;
  currentUserId?: string | null;
}>();

const emit = defineEmits<{
  created: [ForumComment];
  updated: [ForumComment];
}>();

function onVoteUpdated(result: {
  plusCount: number;
  minusCount: number;
  score: number;
  myVote: 1 | -1 | null;
  canChange: boolean;
}) {
  emit('updated', {
    ...props.node,
    votePlusCount: result.plusCount,
    voteMinusCount: result.minusCount,
    score: result.score,
    myVote: result.myVote,
    canChangeVote: result.canChange,
  });
}

const showReply = ref(false);
const editing = ref(false);
const editBody = ref('');
const savingEdit = ref(false);
const editError = ref<string | null>(null);
const replyBody = ref('');
const posting = ref(false);
const postError = ref<string | null>(null);
const replyAttachmentsExpanded = ref(false);
const replyUpload = useMediaUpload('forum');

const canEdit = computed(() => {
  if (!props.currentUserId || props.node.authorId !== props.currentUserId) return false;
  return canEditForumContent(props.node.createdAt, props.editWindowMinutes);
});

function startEdit() {
  editBody.value = props.node.body;
  editError.value = null;
  editing.value = true;
  showReply.value = false;
}

function cancelEdit() {
  editing.value = false;
  editError.value = null;
}

async function saveEdit() {
  if (!editBody.value.trim()) return;
  savingEdit.value = true;
  editError.value = null;
  try {
    const updated = await updateComment(props.topicId, props.node.id, {
      body: editBody.value.trim(),
    });
    emit('updated', updated);
    editing.value = false;
  } catch (e) {
    editError.value = e instanceof Error ? e.message : 'Не удалось сохранить';
  } finally {
    savingEdit.value = false;
  }
}

async function submitReply() {
  if (!replyBody.value.trim()) return;
  posting.value = true;
  postError.value = null;
  try {
    const created = await createComment(props.topicId, {
      body: replyBody.value.trim(),
      parentId: props.node.id,
      attachments: replyUpload.readyAttachments.value,
    });
    emit('created', created);
    replyBody.value = '';
    replyUpload.reset();
    showReply.value = false;
    replyAttachmentsExpanded.value = false;
  } catch (e) {
    postError.value = e instanceof Error ? e.message : 'Не удалось отправить';
  } finally {
    posting.value = false;
  }
}
</script>

<template>
  <li
    class="forum-comment"
    :style="{ marginLeft: `${depth * 1.25}rem` }"
  >
    <article class="forum-comment__card">
      <header class="forum-comment__header">
        <UserAvatar
          :avatar-url="node.author.avatarUrl"
          :label="forumAuthorLabel(node.author)"
          :user-id="node.author.userId"
          size="sm"
        />
        <div class="forum-comment__header-text">
          <span class="forum-comment__author">{{ forumAuthorLabel(node.author) }}</span>
          <time class="forum-comment__time">{{ new Date(node.createdAt).toLocaleString('ru-RU') }}</time>
        </div>
        <UiButton
          intent="ghost"
          size="sm"
          type="button"
          class="forum-comment__reply-btn"
          @click="showReply = !showReply"
        >
          {{ showReply ? 'Отмена' : 'Ответить' }}
        </UiButton>
        <UiButton
          v-if="canEdit && !editing"
          intent="ghost"
          size="sm"
          type="button"
          @click="startEdit"
        >
          Редактировать
        </UiButton>
      </header>

      <form
        v-if="editing"
        class="forum-comment__edit-form"
        @submit.prevent="saveEdit"
      >
        <label>
          Редактирование комментария
          <textarea
            v-model="editBody"
            rows="4"
            required
          />
        </label>
        <p
          v-if="editError"
          class="forum-comment__error"
        >
          {{ editError }}
        </p>
        <div class="forum-comment__edit-actions">
          <UiButton
            intent="primary"
            size="sm"
            type="submit"
            :disabled="savingEdit"
          >
            {{ savingEdit ? 'Сохранение…' : 'Сохранить' }}
          </UiButton>
          <UiButton
            intent="secondary"
            size="sm"
            type="button"
            :disabled="savingEdit"
            @click="cancelEdit"
          >
            Отмена
          </UiButton>
        </div>
      </form>
      <MarkdownBody
        v-else
        :body="node.body"
      />
      <AttachmentList
        v-if="node.attachments?.length"
        :attachments="node.attachments"
        variant="forum"
      />

      <ForumVoteBar
        class="mt-2"
        content-type="comment"
        :content-id="node.id"
        :plus-count="node.votePlusCount ?? 0"
        :minus-count="node.voteMinusCount ?? 0"
        :my-vote="node.myVote ?? null"
        :can-change="node.canChangeVote ?? true"
        :disabled="!currentUserId || node.authorId === currentUserId"
        @updated="onVoteUpdated"
      />

      <form
        v-if="showReply"
        class="forum-comment__reply-form"
        @submit.prevent="submitReply"
      >
        <label>
          Ответ на комментарий
          <textarea
            v-model="replyBody"
            rows="3"
            required
          />
        </label>

        <div class="forum-comment__attachments">
          <button
            type="button"
            class="forum-comment__attachments-toggle"
            @click="replyAttachmentsExpanded = !replyAttachmentsExpanded"
          >
            Вложения
            <span
              v-if="replyUpload.count.value > 0"
            >📎 {{ replyUpload.count.value }}</span>
            <span>{{ replyAttachmentsExpanded ? '▼' : '▶' }}</span>
          </button>
          <div v-if="replyAttachmentsExpanded">
            <MediaUploader
              :items="replyUpload.items.value"
              :accept="replyUpload.limits.value?.accept ?? 'image/*,.pdf'"
              :can-add-more="replyUpload.canAddMore.value"
              @select="replyUpload.addFiles($event)"
              @remove="replyUpload.removeItem"
            />
          </div>
        </div>

        <p
          v-if="postError"
          class="forum-comment__error"
        >
          {{ postError }}
        </p>
        <UiButton
          intent="primary"
          size="sm"
          type="submit"
          :disabled="posting"
        >
          {{ posting ? 'Отправка…' : 'Отправить ответ' }}
        </UiButton>
      </form>
    </article>

    <ul
      v-if="node.children.length"
      class="forum-comment__children"
    >
      <ForumCommentNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :topic-id="topicId"
        :depth="depth + 1"
        :edit-window-minutes="editWindowMinutes"
        :current-user-id="currentUserId"
        @created="emit('created', $event)"
        @updated="emit('updated', $event)"
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

.forum-comment__header {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-bottom: 0.5rem;
}

.forum-comment__header-text {
  display: grid;
  gap: 0.1rem;
  min-width: 0;
  flex: 1;
}

.forum-comment__author {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text, #111);
}

.forum-comment__time {
  font-size: 0.75rem;
  color: var(--color-text-muted, #666);
}

.forum-comment__reply-btn {
  margin-left: auto;
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

.forum-comment__edit-form {
  display: grid;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.forum-comment__edit-form textarea,
.forum-comment__reply-form textarea {
  width: 100%;
  margin-top: 0.25rem;
}

.forum-comment__edit-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.forum-comment__attachments {
  display: grid;
  gap: 0.5rem;
}

.forum-comment__attachments-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  font: inherit;
}

.forum-comment__error {
  color: #b42318;
  margin: 0;
}
</style>
