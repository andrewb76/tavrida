<script setup lang="ts">
import AttachmentList from '@/components/media/AttachmentList.vue';
import MarkdownBody from '@/components/media/MarkdownBody.vue';
import MediaUploader from '@/components/media/MediaUploader.vue';
import ForumCommentNode from '@/components/forum/ForumCommentNode.vue';
import ForumReactionBar from '@/components/forum/ForumReactionBar.vue';
import ForumTopicTags from '@/components/forum/ForumTopicTags.vue';
import ForumVoteBar from '@/components/forum/ForumVoteBar.vue';
import EventSubscribeButton from '@/components/subscriptions/EventSubscribeButton.vue';
import TopicChatSheet from '@/components/chat/TopicChatSheet.vue';
import UserAvatar from '@/components/user/UserAvatar.vue';
import { useMediaUpload } from '@/composables/useMediaUpload';
import {
  buildCommentTree,
  createComment,
  deleteTopic,
  fetchForumMeta,
  forumAuthorLabel,
  getTopic,
  listComments,
  updateTopic,
  type ForumComment,
  type ForumMeta,
  type ForumTagItem,
  type TopicDetail,
} from '@/services/forum';
import { UiButton, UiIcon } from '@tavrida/ui';
import { canEditForumContent } from '@tavrida/shared';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessionStore } from '@/stores/session';
import { toast } from 'vue-sonner';

const route = useRoute();
const router = useRouter();
const session = useSessionStore();
const topicId = computed(() => route.params.id as string);

const topic = ref<TopicDetail | null>(null);
const forumMeta = ref<ForumMeta | null>(null);
const comments = ref<ForumComment[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const editingTopic = ref(false);
const topicTitleDraft = ref('');
const topicBodyDraft = ref('');
const savingTopic = ref(false);
const topicEditError = ref<string | null>(null);

const commentTree = computed(() => buildCommentTree(comments.value));

const commentBody = ref('');
const posting = ref(false);
const topicChatOpen = ref(false);
const postError = ref<string | null>(null);
const commentAttachmentsExpanded = ref(false);
const commentUpload = useMediaUpload('forum');

const canEditTopic = computed(() => {
  if (!topic.value || !session.userId || !forumMeta.value) return false;
  if (session.isModerator) return true;
  if (topic.value.authorId !== session.userId) return false;
  if (topic.value.status === 'DRAFT') return true;
  return canEditForumContent(
    topic.value.publishedAt ?? topic.value.createdAt,
    forumMeta.value.editWindowMinutes,
  );
});

const canDeleteTopic = computed(() => {
  if (!topic.value || !session.userId) return false;
  return session.isModerator;
});

const deletingTopic = ref(false);

const isDraft = computed(() => topic.value?.status === 'DRAFT');
const publishing = ref(false);

let loadGeneration = 0;

async function load(id: string) {
  const generation = ++loadGeneration;
  loading.value = true;
  error.value = null;
  topic.value = null;
  comments.value = [];
  editingTopic.value = false;
  postError.value = null;
  try {
    const [topicRow, commentRows, meta] = await Promise.all([
      getTopic(id),
      listComments(id),
      fetchForumMeta(),
    ]);
    if (generation !== loadGeneration || id !== topicId.value) return;
    topic.value = topicRow;
    comments.value = commentRows;
    forumMeta.value = meta;
  } catch (e) {
    if (generation !== loadGeneration) return;
    error.value = e instanceof Error ? e.message : 'Ошибка загрузки';
  } finally {
    if (generation === loadGeneration) loading.value = false;
  }
}

watch(topicId, (id) => void load(id), { immediate: true });

function startTopicEdit() {
  if (!topic.value) return;
  topicTitleDraft.value = topic.value.title;
  topicBodyDraft.value = topic.value.body;
  topicEditError.value = null;
  editingTopic.value = true;
}

function cancelTopicEdit() {
  editingTopic.value = false;
  topicEditError.value = null;
}

async function saveTopicEdit() {
  if (!topic.value || !topicTitleDraft.value.trim() || !topicBodyDraft.value.trim()) return;
  savingTopic.value = true;
  topicEditError.value = null;
  try {
    topic.value = await updateTopic(topicId.value, {
      title: topicTitleDraft.value.trim(),
      body: topicBodyDraft.value.trim(),
    });
    editingTopic.value = false;
  } catch (e) {
    topicEditError.value = e instanceof Error ? e.message : 'Не удалось сохранить';
  } finally {
    savingTopic.value = false;
  }
}

async function publishDraft() {
  if (!topic.value || !isDraft.value || publishing.value) return;
  publishing.value = true;
  topicEditError.value = null;
  try {
    topic.value = await updateTopic(topicId.value, { status: 'PUBLISHED' });
  } catch (e) {
    topicEditError.value = e instanceof Error ? e.message : 'Не удалось опубликовать';
  } finally {
    publishing.value = false;
  }
}

async function onDeleteTopic() {
  if (!canDeleteTopic.value || deletingTopic.value) return;
  if (!window.confirm('Удалить тему? Она исчезнет из списков.')) return;
  deletingTopic.value = true;
  try {
    await deleteTopic(topicId.value);
    toast.success('Тема удалена');
    await router.push({ name: 'forum' });
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Не удалось удалить тему');
  } finally {
    deletingTopic.value = false;
  }
}

function onCommentCreated(created: ForumComment) {
  comments.value = [...comments.value, created];
}

function onCommentUpdated(updated: ForumComment) {
  comments.value = comments.value.map((row) => (row.id === updated.id ? updated : row));
}

function onCommentDeleted(commentId: string) {
  comments.value = comments.value.map((row) =>
    row.id === commentId
      ? {
          ...row,
          body: 'Комментарий удалён',
          attachments: [],
          deletedAt: row.deletedAt ?? new Date().toISOString(),
          canChangeVote: false,
        }
      : row,
  );
}

async function onCommentPromoted() {
  // Subtree moved to the new topic — reload flat list from API.
  try {
    comments.value = await listComments(topicId.value);
  } catch {
    /* keep local state if refresh fails */
  }
}

function onTopicVoteUpdated(result: {
  plusCount: number;
  minusCount: number;
  score: number;
  myVote: 1 | -1 | null;
  canChange: boolean;
}) {
  if (!topic.value) return;
  topic.value = {
    ...topic.value,
    votePlusCount: result.plusCount,
    voteMinusCount: result.minusCount,
    score: result.score,
    myVote: result.myVote,
    canChangeVote: result.canChange,
  };
}

function onTopicTagsUpdated(payload: { tags: string[]; tagItems: ForumTagItem[] }) {
  if (!topic.value) return;
  topic.value = { ...topic.value, tags: payload.tags, tagItems: payload.tagItems };
}

function focusCommentForm() {
  const el = document.getElementById('forum-topic-comment');
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el?.focus();
}

async function submitTopicComment() {
  if (!commentBody.value.trim()) return;
  posting.value = true;
  postError.value = null;
  try {
    const created = await createComment(topicId.value, {
      body: commentBody.value.trim(),
      attachments: commentUpload.readyAttachments.value,
    });
    onCommentCreated(created);
    commentBody.value = '';
    commentUpload.reset();
    commentAttachmentsExpanded.value = false;
  } catch (e) {
    postError.value = e instanceof Error ? e.message : 'Не удалось отправить';
  } finally {
    posting.value = false;
  }
}
</script>

<template>
  <section class="forum-topic">
    <p
      v-if="loading"
      class="forum-topic__status"
    >
      Загрузка…
    </p>
    <p
      v-else-if="error"
      class="forum-topic__error"
    >
      {{ error }}
    </p>

    <template v-else-if="topic">
      <article class="forum-topic__head">
        <header class="forum-topic__author-row">
          <UserAvatar
            class="forum-topic__avatar"
            :avatar-url="topic.author?.avatarUrl"
            :label="forumAuthorLabel(topic.author)"
            :user-id="topic.author?.userId ?? topic.authorId"
            size="md"
          />
          <div class="forum-topic__author-text">
            <span class="forum-topic__author-name">{{ forumAuthorLabel(topic.author) }}</span>
            <time class="forum-topic__meta">{{ new Date(topic.createdAt).toLocaleString('ru-RU') }}</time>
          </div>
          <div
            class="forum-topic__actions"
            role="group"
            aria-label="Действия с темой"
          >
            <EventSubscribeButton
              v-if="session.isMember && !isDraft"
              source-domain="forum"
              target-type="FORUM_TOPIC"
              :target-id="topic.id"
              compact
            />
            <UiButton
              v-if="session.isMember && !isDraft"
              intent="ghost"
              size="icon"
              type="button"
              aria-label="Чат темы"
              title="Чат темы"
              @click="topicChatOpen = true"
            >
              <UiIcon
                name="chat"
                :size="18"
              />
            </UiButton>
            <UiButton
              v-if="session.isMember && !isDraft"
              intent="ghost"
              size="icon"
              type="button"
              aria-label="Ответить"
              title="Ответить"
              @click="focusCommentForm"
            >
              <UiIcon
                name="reply"
                :size="18"
              />
            </UiButton>
            <UiButton
              v-if="canEditTopic && !editingTopic"
              intent="ghost"
              size="icon"
              type="button"
              aria-label="Редактировать"
              title="Редактировать"
              @click="startTopicEdit"
            >
              <UiIcon
                name="edit"
                :size="18"
              />
            </UiButton>
            <UiButton
              v-if="canDeleteTopic && !editingTopic"
              intent="ghost"
              size="icon"
              type="button"
              aria-label="Удалить тему"
              title="Удалить тему"
              :disabled="deletingTopic"
              @click="onDeleteTopic"
            >
              <UiIcon
                name="trash"
                :size="18"
              />
            </UiButton>
            <UiButton
              v-if="isDraft && canEditTopic && !editingTopic"
              intent="primary"
              size="sm"
              type="button"
              :disabled="publishing"
              @click="publishDraft"
            >
              {{ publishing ? 'Публикация…' : 'Опубликовать' }}
            </UiButton>
          </div>
        </header>

        <p
          v-if="isDraft"
          class="forum-topic__draft-banner"
        >
          Черновик — виден только вам. Комментарии и голоса недоступны, пока не опубликуете.
        </p>
        <p
          v-if="topicEditError && !editingTopic"
          class="forum-topic__error"
        >
          {{ topicEditError }}
        </p>

        <template v-if="editingTopic">
          <label class="forum-topic__edit-field">
            Заголовок
            <input
              v-model="topicTitleDraft"
              type="text"
              maxlength="256"
              required
            >
          </label>
          <label class="forum-topic__edit-field">
            Текст (Markdown)
            <textarea
              v-model="topicBodyDraft"
              rows="8"
              maxlength="10000"
              required
            />
          </label>
          <p
            v-if="topicEditError"
            class="forum-topic__error"
          >
            {{ topicEditError }}
          </p>
          <div class="forum-topic__edit-actions">
            <UiButton
              intent="primary"
              size="sm"
              type="button"
              :disabled="savingTopic"
              @click="saveTopicEdit"
            >
              {{ savingTopic ? 'Сохранение…' : 'Сохранить' }}
            </UiButton>
            <UiButton
              intent="secondary"
              size="sm"
              type="button"
              :disabled="savingTopic"
              @click="cancelTopicEdit"
            >
              Отмена
            </UiButton>
          </div>
        </template>
        <template v-else>
          <h1>
            <span
              v-if="isDraft"
              class="forum-topic__draft-badge"
            >Черновик</span>
            {{ topic.title }}
          </h1>
          <MarkdownBody :body="topic.body" />
        </template>
        <AttachmentList
          v-if="topic.attachments?.length"
          :attachments="topic.attachments"
          variant="forum"
        />
        <ForumTopicTags
          :topic-id="topic.id"
          :tags="topic.tags ?? []"
          :tag-items="topic.tagItems"
          :can-edit="Boolean(session.userId && (topic.authorId === session.userId || session.isModerator))"
          @updated="onTopicTagsUpdated"
        />
        <div
          v-if="!isDraft"
          class="forum-topic__toolbar"
        >
          <ForumVoteBar
            content-type="topic"
            :content-id="topic.id"
            :plus-count="topic.votePlusCount ?? 0"
            :minus-count="topic.voteMinusCount ?? 0"
            :my-vote="topic.myVote ?? null"
            :can-change="topic.canChangeVote ?? true"
            :disabled="!session.userId || topic.authorId === session.userId"
            @updated="onTopicVoteUpdated"
          />
          <ForumReactionBar
            content-type="topic"
            :content-id="topic.id"
            :current-user-id="session.userId"
            :disabled="!session.userId"
          />
        </div>
      </article>

      <section
        v-if="!isDraft"
        class="forum-topic__comments"
      >
        <h2>Комментарии ({{ comments.length }})</h2>

        <ul
          v-if="commentTree.length"
          class="forum-topic__comment-list"
        >
          <ForumCommentNode
            v-for="node in commentTree"
            :key="node.id"
            :node="node"
            :topic-id="topicId"
            :topic-author-id="topic.authorId"
            :depth="0"
            :edit-window-minutes="forumMeta?.editWindowMinutes ?? 0"
            :current-user-id="session.userId"
            @created="onCommentCreated"
            @updated="onCommentUpdated"
            @deleted="onCommentDeleted"
            @promoted="onCommentPromoted"
          />
        </ul>
        <p
          v-else
          class="forum-topic__empty"
        >
          Пока нет комментариев — будьте первым.
        </p>

        <form
          class="forum-topic__form"
          @submit.prevent="submitTopicComment"
        >
          <label>
            Комментарий к теме
            <textarea
              id="forum-topic-comment"
              v-model="commentBody"
              rows="4"
              required
            />
          </label>

          <div class="forum-topic__attachments">
            <button
              type="button"
              class="forum-topic__attachments-toggle"
              @click="commentAttachmentsExpanded = !commentAttachmentsExpanded"
            >
              Вложения
              <span
                v-if="commentUpload.count.value > 0"
              >📎 {{ commentUpload.count.value }}</span>
              <span>{{ commentAttachmentsExpanded ? '▼' : '▶' }}</span>
            </button>
            <div v-if="commentAttachmentsExpanded">
              <MediaUploader
                :items="commentUpload.items.value"
                :accept="commentUpload.limits.value?.accept ?? 'image/*,.pdf'"
                :can-add-more="commentUpload.canAddMore.value"
                @select="commentUpload.addFiles($event)"
                @remove="commentUpload.removeItem"
              />
            </div>
          </div>

          <p
            v-if="postError"
            class="forum-topic__error"
          >
            {{ postError }}
          </p>
          <UiButton
            intent="primary"
            type="submit"
            :disabled="posting"
          >
            {{ posting ? 'Отправка…' : 'Опубликовать' }}
          </UiButton>
        </form>
      </section>
    </template>

    <TopicChatSheet
      v-if="topic"
      v-model:open="topicChatOpen"
      :forum-topic-id="topic.id"
      :topic-title="topic.title"
    />
  </section>
</template>

<style scoped>
.forum-topic {
  display: grid;
  gap: 1.5rem;
}

.forum-topic__head,
.forum-topic__comments {
  border: 1px solid var(--color-border, #ddd);
  border-radius: 8px;
  padding: 1rem;
}

.forum-topic__author-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.forum-topic__avatar {
  flex: none;
}

.forum-topic__author-text {
  display: grid;
  gap: 0.15rem;
  min-width: 0;
  flex: 1;
}

.forum-topic__actions {
  margin-left: auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.25rem;
}

.forum-topic__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.forum-topic__edit-field {
  display: grid;
  gap: 0.35rem;
  margin-bottom: 0.75rem;
}

.forum-topic__edit-field input,
.forum-topic__edit-field textarea {
  width: 100%;
}

.forum-topic__edit-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.forum-topic__head h1,
.forum-topic__comments h2 {
  color: var(--color-text, #111);
}

.forum-topic__draft-badge {
  display: inline-block;
  margin-right: 0.5rem;
  vertical-align: middle;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-warning, #b8860b);
  border: 1px solid color-mix(in srgb, var(--color-warning, #b8860b) 40%, transparent);
  border-radius: 4px;
  padding: 0.15rem 0.4rem;
}

.forum-topic__draft-banner {
  margin: 0 0 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  background: color-mix(in srgb, var(--color-warning, #b8860b) 12%, transparent);
  color: var(--color-text, #111);
  font-size: 0.875rem;
}

.forum-topic__author-name {
  font-weight: 600;
  color: var(--color-text, #111);
}

.forum-topic__meta {
  color: var(--color-text-muted, #666);
  font-size: 0.875rem;
}

.forum-topic__comment-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.75rem;
}

.forum-topic__empty {
  color: var(--color-text-muted, #666);
}

.forum-topic__form {
  display: grid;
  gap: 0.75rem;
  margin-top: 1rem;
}

.forum-topic__form textarea {
  width: 100%;
  margin-top: 0.25rem;
}

.forum-topic__attachments {
  display: grid;
  gap: 0.5rem;
}

.forum-topic__attachments-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  font: inherit;
}

.forum-topic__error {
  color: #b42318;
}
</style>
