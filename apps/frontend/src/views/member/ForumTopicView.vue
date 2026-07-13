<script setup lang="ts">
import AttachmentList from '@/components/media/AttachmentList.vue';
import MarkdownBody from '@/components/media/MarkdownBody.vue';
import MediaUploader from '@/components/media/MediaUploader.vue';
import ForumCommentNode from '@/components/forum/ForumCommentNode.vue';
import EventSubscribeButton from '@/components/subscriptions/EventSubscribeButton.vue';
import UserAvatar from '@/components/user/UserAvatar.vue';
import { useMediaUpload } from '@/composables/useMediaUpload';
import {
  buildCommentTree,
  createComment,
  fetchForumMeta,
  forumAuthorLabel,
  getTopic,
  listComments,
  updateTopic,
  type ForumComment,
  type ForumMeta,
  type TopicDetail,
} from '@/services/forum';
import { UiButton } from '@tavrida/ui';
import { canEditForumContent } from '@tavrida/shared';
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useSessionStore } from '@/stores/session';

const route = useRoute();
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
const postError = ref<string | null>(null);
const commentAttachmentsExpanded = ref(false);
const commentUpload = useMediaUpload('forum');

const canEditTopic = computed(() => {
  if (!topic.value || !session.userId || !forumMeta.value) return false;
  if (topic.value.authorId !== session.userId) return false;
  return canEditForumContent(topic.value.createdAt, forumMeta.value.editWindowMinutes);
});

onMounted(load);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const [topicRow, commentRows, meta] = await Promise.all([
      getTopic(topicId.value),
      listComments(topicId.value),
      fetchForumMeta(),
    ]);
    topic.value = topicRow;
    comments.value = commentRows;
    forumMeta.value = meta;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка загрузки';
  } finally {
    loading.value = false;
  }
}

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

function onCommentCreated(created: ForumComment) {
  comments.value = [...comments.value, created];
}

function onCommentUpdated(updated: ForumComment) {
  comments.value = comments.value.map((row) => (row.id === updated.id ? updated : row));
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
            :avatar-url="topic.author.avatarUrl"
            :label="forumAuthorLabel(topic.author)"
            :user-id="topic.author.userId"
            size="md"
          />
          <div class="forum-topic__author-text">
            <span class="forum-topic__author-name">{{ forumAuthorLabel(topic.author) }}</span>
            <time class="forum-topic__meta">{{ new Date(topic.createdAt).toLocaleString('ru-RU') }}</time>
          </div>
          <div
            v-if="session.isMember || (canEditTopic && !editingTopic)"
            class="forum-topic__actions"
          >
            <EventSubscribeButton
              source-domain="forum"
              target-type="FORUM_TOPIC"
              :target-id="topic.id"
            />
            <UiButton
              v-if="canEditTopic && !editingTopic"
              intent="ghost"
              size="sm"
              type="button"
              @click="startTopicEdit"
            >
              Редактировать
            </UiButton>
          </div>
        </header>

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
          <h1>{{ topic.title }}</h1>
          <MarkdownBody :body="topic.body" />
        </template>
        <AttachmentList
          v-if="topic.attachments?.length"
          :attachments="topic.attachments"
          variant="forum"
        />
      </article>

      <section class="forum-topic__comments">
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
            :depth="0"
            :edit-window-minutes="forumMeta?.editWindowMinutes ?? 0"
            :current-user-id="session.userId"
            @created="onCommentCreated"
            @updated="onCommentUpdated"
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

.forum-topic__actions {
  margin-left: auto;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 0.5rem;
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

.forum-topic__author-text {
  display: grid;
  gap: 0.15rem;
  min-width: 0;
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
