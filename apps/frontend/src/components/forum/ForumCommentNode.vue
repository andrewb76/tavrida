<script setup lang="ts">
import AttachmentList from '@/components/media/AttachmentList.vue';
import MarkdownBody from '@/components/media/MarkdownBody.vue';
import MediaUploader from '@/components/media/MediaUploader.vue';
import ForumReactionBar from '@/components/forum/ForumReactionBar.vue';
import ForumVoteBar from '@/components/forum/ForumVoteBar.vue';
import UserAvatar from '@/components/user/UserAvatar.vue';
import { useMediaUpload } from '@/composables/useMediaUpload';
import {
  createComment,
  deleteComment,
  forumAuthorLabel,
  promoteCommentToTopic,
  updateComment,
  type CommentTreeNode,
  type ForumComment,
} from '@/services/forum';
import { useSessionStore } from '@/stores/session';
import { UiButton, UiIcon } from '@tavrida/ui';
import { canEditForumContent } from '@tavrida/shared';
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { toast } from 'vue-sonner';

const props = defineProps<{
  node: CommentTreeNode;
  topicId: string;
  topicAuthorId?: string | null;
  depth: number;
  editWindowMinutes: number;
  currentUserId?: string | null;
}>();

const emit = defineEmits<{
  created: [ForumComment];
  updated: [ForumComment];
  deleted: [string];
  promoted: [{ commentId: string; promotedTopicId: string; movedCommentCount: number }];
}>();

const session = useSessionStore();

const isDeleted = computed(() => Boolean(props.node.deletedAt));

const canEdit = computed(() => {
  if (!props.currentUserId || isDeleted.value) return false;
  if (session.isModerator) return true;
  if (props.node.authorId !== props.currentUserId) return false;
  return canEditForumContent(props.node.createdAt, props.editWindowMinutes);
});

const canPromote = computed(() => {
  if (!props.currentUserId || props.node.promotedTopicId || isDeleted.value) return false;
  return session.isModerator;
});

const canDelete = computed(() => {
  if (!props.currentUserId || isDeleted.value) return false;
  return session.isModerator;
});

const deleting = ref(false);

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
const promoting = ref(false);
const replyAttachmentsExpanded = ref(false);
const replyUpload = useMediaUpload('forum');

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

async function onPromote() {
  if (!canPromote.value || promoting.value) return;
  promoting.value = true;
  try {
    const result = await promoteCommentToTopic(props.topicId, props.node.id);
    emit('updated', { ...props.node, promotedTopicId: result.promotedTopicId });
    emit('promoted', {
      commentId: result.commentId,
      promotedTopicId: result.promotedTopicId,
      movedCommentCount: result.movedCommentCount ?? 0,
    });
    const moved = result.movedCommentCount ?? 0;
    toast.success(
      moved > 0
        ? `Тема создана, перенесено ответов: ${moved}`
        : 'Комментарий выделен в тему',
    );
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Не удалось выделить в тему');
  } finally {
    promoting.value = false;
  }
}

async function onDelete() {
  if (!canDelete.value || deleting.value) return;
  if (!window.confirm('Удалить комментарий?')) return;
  deleting.value = true;
  try {
    await deleteComment(props.topicId, props.node.id);
    emit('updated', {
      ...props.node,
      body: 'Комментарий удалён',
      attachments: [],
      deletedAt: new Date().toISOString(),
      canChangeVote: false,
    });
    emit('deleted', props.node.id);
    toast.success('Комментарий удалён');
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Не удалось удалить');
  } finally {
    deleting.value = false;
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
          class="forum-comment__avatar"
          :avatar-url="node.author?.avatarUrl"
          :label="forumAuthorLabel(node.author)"
          :user-id="node.author?.userId ?? node.authorId"
          size="sm"
        />
        <div class="forum-comment__header-text">
          <span class="forum-comment__author">{{ forumAuthorLabel(node.author) }}</span>
          <time class="forum-comment__time">{{ new Date(node.createdAt).toLocaleString('ru-RU') }}</time>
        </div>
        <div
          class="forum-comment__actions"
          role="group"
          aria-label="Действия с комментарием"
        >
          <UiButton
            v-if="!isDeleted"
            intent="ghost"
            size="icon"
            type="button"
            :aria-label="showReply ? 'Закрыть ответ' : 'Ответить'"
            :title="showReply ? 'Закрыть ответ' : 'Ответить'"
            @click="showReply = !showReply"
          >
            <UiIcon
              name="reply"
              :size="18"
            />
          </UiButton>
          <UiButton
            v-if="canEdit && !editing"
            intent="ghost"
            size="icon"
            type="button"
            aria-label="Редактировать"
            title="Редактировать"
            @click="startEdit"
          >
            <UiIcon
              name="edit"
              :size="18"
            />
          </UiButton>
          <UiButton
            v-if="canPromote"
            intent="ghost"
            size="icon"
            type="button"
            aria-label="Выделить в тему"
            title="Выделить в тему"
            :disabled="promoting"
            @click="onPromote"
          >
            <UiIcon
              name="promote"
              :size="18"
            />
          </UiButton>
          <UiButton
            v-if="canDelete"
            intent="ghost"
            size="icon"
            type="button"
            aria-label="Удалить"
            title="Удалить"
            :disabled="deleting"
            @click="onDelete"
          >
            <UiIcon
              name="trash"
              :size="18"
            />
          </UiButton>
          <RouterLink
            v-else-if="node.promotedTopicId"
            :to="{ name: 'forum-topic', params: { id: node.promotedTopicId } }"
            class="forum-comment__promoted-link"
            title="Открыть выделенную тему"
          >
            <UiIcon
              name="promote"
              :size="18"
              label="Открыть выделенную тему"
            />
          </RouterLink>
        </div>
      </header>

      <template v-if="isDeleted">
        <p class="forum-comment__deleted">
          Комментарий удалён
        </p>
      </template>
      <template v-else>
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

        <div class="forum-comment__toolbar">
          <ForumVoteBar
            content-type="comment"
            :content-id="node.id"
            :plus-count="node.votePlusCount ?? 0"
            :minus-count="node.voteMinusCount ?? 0"
            :my-vote="node.myVote ?? null"
            :can-change="node.canChangeVote ?? true"
            :disabled="!currentUserId || node.authorId === currentUserId"
            @updated="onVoteUpdated"
          />
          <ForumReactionBar
            content-type="comment"
            :content-id="node.id"
            :current-user-id="currentUserId"
            :disabled="!currentUserId"
          />
        </div>

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
      </template>
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
        :topic-author-id="topicAuthorId"
        :depth="depth + 1"
        :edit-window-minutes="editWindowMinutes"
        :current-user-id="currentUserId"
        @created="emit('created', $event)"
        @updated="emit('updated', $event)"
        @deleted="emit('deleted', $event)"
        @promoted="emit('promoted', $event)"
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

.forum-comment__avatar {
  flex: none;
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

.forum-comment__actions {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
}

.forum-comment__promoted-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  color: var(--color-primary, #2563eb);
}

.forum-comment__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
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

.forum-comment__deleted {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-muted, #666);
  font-style: italic;
}
</style>
