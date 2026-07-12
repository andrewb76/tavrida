<script setup lang="ts">
import AttachmentBadge from '@/components/media/AttachmentBadge.vue';
import AttachmentList from '@/components/media/AttachmentList.vue';
import MarkdownBody from '@/components/media/MarkdownBody.vue';
import MediaUploader from '@/components/media/MediaUploader.vue';
import ForumCommentNode from '@/components/forum/ForumCommentNode.vue';
import UserAvatar from '@/components/user/UserAvatar.vue';
import { useMediaUpload } from '@/composables/useMediaUpload';
import {
  buildCommentTree,
  createComment,
  forumAuthorLabel,
  getTopic,
  listComments,
  type ForumComment,
  type TopicDetail,
} from '@/services/forum';
import { UiButton } from '@tavrida/ui';
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const topicId = computed(() => route.params.id as string);

const topic = ref<TopicDetail | null>(null);
const comments = ref<ForumComment[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const commentTree = computed(() => buildCommentTree(comments.value));

const commentBody = ref('');
const posting = ref(false);
const postError = ref<string | null>(null);
const commentAttachmentsExpanded = ref(false);
const commentUpload = useMediaUpload('forum');

onMounted(load);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const [topicRow, commentRows] = await Promise.all([
      getTopic(topicId.value),
      listComments(topicId.value),
    ]);
    topic.value = topicRow;
    comments.value = commentRows;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка загрузки';
  } finally {
    loading.value = false;
  }
}

function onCommentCreated(created: ForumComment) {
  comments.value = [...comments.value, created];
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
        </header>
        <h1>{{ topic.title }}</h1>
        <MarkdownBody :body="topic.body" />
        <AttachmentBadge
          v-if="topic.attachments?.length"
          :count="topic.attachments.length"
        >
          <template #list>
            <AttachmentList :attachments="topic.attachments" />
          </template>
        </AttachmentBadge>
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
            @created="onCommentCreated"
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
