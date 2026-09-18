<script setup lang="ts">
import MarkdownBody from '@/components/media/MarkdownBody.vue';
import MediaUploader from '@/components/media/MediaUploader.vue';
import ForumCommentNode from '@/components/forum/ForumCommentNode.vue';
import ForumBreadcrumbs from '@/components/forum/ForumBreadcrumbs.vue';
import ForumReactionBar from '@/components/forum/ForumReactionBar.vue';
import ForumTopicTags from '@/components/forum/ForumTopicTags.vue';
import ForumVoteBar from '@/components/forum/ForumVoteBar.vue';
import EventSubscribeButton from '@/components/subscriptions/EventSubscribeButton.vue';
import TopicChatSheet from '@/components/chat/TopicChatSheet.vue';
import MedalBadges from '@/components/profile/MedalBadges.vue';
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
  recordTopicView,
  toggleTopicPin,
  updateTopic,
  type ForumComment,
  type ForumMeta,
  type ForumTagItem,
  type TopicDetail,
} from '@/services/forum';
import { UiButton, UiIcon } from '@tavrida/ui';
import { canEditForumContent } from '@tavrida/shared';
import { syncAttachmentMarkdown, allAttachmentUrlsPresent } from '@/services/media';
import { computed, onBeforeUnmount, ref, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessionStore } from '@/stores/session';
import { useWs } from '@/composables/useWs';
import { toast } from 'vue-sonner';

const route = useRoute();
const router = useRouter();
const session = useSessionStore();
const ws = useWs();
const topicId = computed(() => route.params.id as string);

const topic = ref<TopicDetail | null>(null);
const forumMeta = ref<ForumMeta | null>(null);
const comments = ref<ForumComment[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
/** Bumps when WS reaction events arrive — ForumReactionBar refreshes. */
const reactionEpoch = ref(0);
const commentsTotal = ref(0);
const commentsLoadingMore = ref(false);
const COMMENTS_PAGE = 100;

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
const topicMenuOpen = ref(false);
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

const canPinTopic = computed(() => session.isModerator);

async function togglePin() {
  if (!topic.value) return;
  try {
    const result = await toggleTopicPin(topic.value.id);
    topic.value.isPinned = result.isPinned;
  } catch { /* ignore */ }
}

const deletingTopic = ref(false);

const isDraft = computed(() => topic.value?.status === 'DRAFT');
const publishing = ref(false);

let loadGeneration = 0;
let wsUnsub: (() => void) | null = null;

function unbindWs() {
  wsUnsub?.();
  wsUnsub = null;
}

function applyForumWsEvent(ev: { event: string; payload: Record<string, unknown> }) {
  const p = ev.payload;
  if (ev.event === 'message.new') {
    const id = String(p.commentId ?? '');
    if (!id || comments.value.some((c) => c.id === id)) return;
    if (p.authorId === session.userId) return;
    comments.value = [
      ...comments.value,
      {
        id,
        topicId: String(p.topicId ?? topicId.value),
        authorId: String(p.authorId ?? ''),
        author: (p.author as ForumComment['author']) ?? {
          userId: String(p.authorId ?? ''),
          displayName: null,
          username: null,
          avatarUrl: null,
        },
        parentId: (p.parentId as string | null) ?? null,
        body: String(p.body ?? ''),
        attachments: (p.attachments as ForumComment['attachments']) ?? [],
        promotedTopicId: null,
        votePlusCount: Number(p.votePlusCount ?? 0),
        voteMinusCount: Number(p.voteMinusCount ?? 0),
        score: Number(p.score ?? 0),
        myVote: null,
        canChangeVote: true,
        createdAt: String(p.createdAt ?? new Date().toISOString()),
        updatedAt: String(p.updatedAt ?? p.createdAt ?? new Date().toISOString()),
      },
    ];
    return;
  }

  if (ev.event === 'topic.promoted') {
    void onCommentPromoted();
    return;
  }

  if (ev.event === 'reaction.added') {
    reactionEpoch.value += 1;
  }
}

function bindWs(id: string) {
  unbindWs();
  if (!session.isMember || !id) return;
  void ws
    .subscribe(`forum:${id}`, (ev) => applyForumWsEvent(ev))
    .then((fn) => {
      wsUnsub = fn;
    })
    .catch(() => {
      /* REST-only fallback */
    });
}

async function load(id: string) {
  const generation = ++loadGeneration;
  loading.value = true;
  error.value = null;
  topic.value = null;
  comments.value = [];
  commentsTotal.value = 0;
  editingTopic.value = false;
  postError.value = null;
  unbindWs();
  try {
    const [topicRow, commentResult, meta] = await Promise.all([
      getTopic(id),
      listComments(id, { limit: COMMENTS_PAGE, offset: 0 }),
      fetchForumMeta(),
    ]);
    if (generation !== loadGeneration || id !== topicId.value) return;
    topic.value = topicRow;
    comments.value = commentResult.data;
    commentsTotal.value = commentResult.total;
    forumMeta.value = meta;
    bindWs(id);
    recordTopicView(id).catch(() => {});
  } catch (e) {
    if (generation !== loadGeneration) return;
    error.value = e instanceof Error ? e.message : 'Ошибка загрузки';
  } finally {
    if (generation === loadGeneration) loading.value = false;
  }
}

async function loadMoreComments() {
  const id = topicId.value;
  if (!id || commentsLoadingMore.value) return;
  commentsLoadingMore.value = true;
  try {
    const result = await listComments(id, {
      limit: COMMENTS_PAGE,
      offset: comments.value.length,
    });
    if (topicId.value !== id) return;
    comments.value = [...comments.value, ...result.data];
    commentsTotal.value = result.total;
  } catch {
    /* silent */
  } finally {
    commentsLoadingMore.value = false;
  }
}

watch(topicId, (id) => void load(id), { immediate: true });

onBeforeUnmount(() => {
  unbindWs();
});

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

function restoreTopicAttachments() {
  if (!topic.value) return;
  const attachments = topic.value.attachments ?? [];
  const before = topicBodyDraft.value;
  topicBodyDraft.value = syncAttachmentMarkdown(before, attachments);
  if (topicHasAllLinks.value) {
    toast.success('Все вложения присутствуют в документе');
  } else {
    const missing = attachments.filter(a => !allAttachmentUrlsPresent(before, [a])).length;
    toast.success(`Добавлено ${missing} отсутствующих вложений`);
  }
}

const topicHasAllLinks = computed(() => {
  if (!topic.value) return true;
  return allAttachmentUrlsPresent(topicBodyDraft.value, topic.value.attachments ?? []);
});

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
    comments.value = (await listComments(topicId.value)).data;
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

function closeTopicMenu(e: MouseEvent) {
  const wrapper = (e.target as HTMLElement)?.closest?.('.forum-topic__menu-wrapper');
  if (!wrapper) topicMenuOpen.value = false;
}

onMounted(() => document.addEventListener('click', closeTopicMenu));
onBeforeUnmount(() => document.removeEventListener('click', closeTopicMenu));

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
      <ForumBreadcrumbs
        :category-id="topic.categoryId"
        :topic-title="topic.title"
      />
      <article class="forum-topic__head">
        <header class="forum-topic__author-row">
          <UserAvatar
            class="forum-topic__avatar"
            :avatar-url="topic.author?.avatarUrl"
            :label="forumAuthorLabel(topic.author)"
            :user-id="topic.author?.userId ?? topic.authorId"
            size="md"
          />
          <div class="forum-topic__author-name">
            {{ forumAuthorLabel(topic.author) }}
            <MedalBadges
              v-if="topic.author?.userId"
              :user-id="topic.author.userId"
              :limit="3"
            />
          </div>
          <span class="forum-topic__meta">
            <UiIcon
              v-if="topic?.isPinned"
              name="pin"
              :size="14"
              class="forum-topic__pin-icon"
            />
            <time>{{ new Date(topic.createdAt).toLocaleString('ru-RU') }}</time>
          </span>
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
              v-if="canPinTopic && !editingTopic"
              intent="ghost"
              size="icon"
              type="button"
              :aria-label="topic?.isPinned ? 'Открепить' : 'Закрепить'"
              :title="topic?.isPinned ? 'Открепить' : 'Закрепить'"
              @click="togglePin"
            >
              <UiIcon
                name="pin"
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
          <div class="forum-topic__menu-wrapper">
            <UiButton
              intent="ghost"
              size="icon"
              type="button"
              aria-label="Ещё"
              title="Ещё"
              @click="topicMenuOpen = !topicMenuOpen"
            >
              <UiIcon
                name="more"
                :size="18"
              />
            </UiButton>
            <div
              v-if="topicMenuOpen"
              class="forum-topic__menu"
            >
              <button
                v-if="session.isMember && !isDraft"
                class="forum-topic__menu-item"
                @click="topicChatOpen = true; topicMenuOpen = false"
              >
                <UiIcon name="chat" :size="16" /> Чат темы
              </button>
              <button
                v-if="session.isMember && !isDraft"
                class="forum-topic__menu-item"
                @click="focusCommentForm(); topicMenuOpen = false"
              >
                <UiIcon name="reply" :size="16" /> Ответить
              </button>
              <button
                v-if="canEditTopic && !editingTopic"
                class="forum-topic__menu-item"
                @click="startTopicEdit(); topicMenuOpen = false"
              >
                <UiIcon name="edit" :size="16" /> Редактировать
              </button>
              <button
                v-if="canDeleteTopic && !editingTopic"
                class="forum-topic__menu-item"
                :disabled="deletingTopic"
                @click="onDeleteTopic(); topicMenuOpen = false"
              >
                <UiIcon name="trash" :size="16" /> Удалить тему
              </button>
              <button
                v-if="canPinTopic && !editingTopic"
                class="forum-topic__menu-item"
                @click="togglePin(); topicMenuOpen = false"
              >
                <UiIcon name="pin" :size="16" /> {{ topic?.isPinned ? 'Открепить' : 'Закрепить' }}
              </button>
            </div>
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
              class="w-full rounded-md border border-border bg-surface px-3 py-2 text-text transition-colors placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Введите заголовок темы"
            >
          </label>
          <label class="forum-topic__edit-field">
            Текст (Markdown)
            <textarea
              v-model="topicBodyDraft"
              rows="8"
              :maxlength="session.isAdmin ? undefined : 10000"
              required
              class="w-full rounded-md border border-border bg-surface px-3 py-2 text-text transition-colors placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="**жирный**, *курсив*, списки, ссылки, `код`, ```блоки кода```"
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
              v-if="(topic.attachments?.length ?? 0) > 0"
              intent="secondary"
              size="sm"
              type="button"
              @click="restoreTopicAttachments"
            >
              {{ topicHasAllLinks ? 'Все вложения в тексте' : 'Восстановить ссылки на вложения' }}
            </UiButton>
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
        <ForumTopicTags
          :topic-id="topic.id"
          :tags="topic.tags ?? []"
          :tag-items="topic.tagItems"
          :can-edit="Boolean(session.userId && (topic.authorId === session.userId || session.isModerator))"
          :editing="editingTopic"
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
            :refresh-epoch="reactionEpoch"
          />
        </div>
      </article>

      <section
        v-if="!isDraft"
        class="forum-topic__comments"
      >
        <h2>
          Комментарии ({{ commentsTotal }})
          <span
            v-if="comments.length < commentsTotal"
            class="forum-topic__comments-loaded"
          >
            · показано {{ comments.length }}
          </span>
        </h2>

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
            :reaction-epoch="reactionEpoch"
            @created="onCommentCreated"
            @updated="onCommentUpdated"
            @deleted="onCommentDeleted"
            @promoted="onCommentPromoted"
          />
        </ul>

        <div
          v-if="comments.length < commentsTotal"
          class="forum-topic__load-more"
        >
          <UiButton
            intent="secondary"
            :disabled="commentsLoadingMore"
            @click="loadMoreComments"
          >
            {{ commentsLoadingMore ? 'Загрузка…' : `Показать ещё (${comments.length} из ${commentsTotal})` }}
          </UiButton>
        </div>
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
          <label class="grid gap-1.5 text-sm text-text">
            Комментарий к теме
            <textarea
              id="forum-topic-comment"
              v-model="commentBody"
              rows="4"
              required
              class="w-full rounded-md border border-border bg-surface px-3 py-2 text-text transition-colors placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Напишите комментарий..."
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
              <p
                v-if="commentUpload.globalError.value"
                class="forum-topic__error"
              >
                {{ commentUpload.globalError.value }}
              </p>
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
  grid-template-columns: minmax(0, 1fr);
  gap: 1.5rem;
  min-width: 0;
}

.forum-topic__head,
.forum-topic__comments {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.forum-topic__head :deep(.markdown-body),
.forum-topic__comments :deep(.markdown-body) {
  min-width: 0;
  max-width: none;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.forum-topic__head :deep(.markdown-body > *),
.forum-topic__comments :deep(.markdown-body > *) {
  max-width: 100%;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.forum-topic__head :deep(.markdown-body pre),
.forum-topic__comments :deep(.markdown-body pre) {
  max-width: 100%;
}

.forum-topic__head :deep(.markdown-body table),
.forum-topic__comments :deep(.markdown-body table) {
  max-width: 100%;
}

.forum-topic__head :deep(.markdown-body img),
.forum-topic__comments :deep(.markdown-body img) {
  max-width: 100%;
}

.forum-topic__author-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-rows: auto auto;
  align-items: start;
  gap: 0.35rem 0.75rem;
  margin-bottom: 0.75rem;
}

.forum-topic__avatar {
  grid-row: 1 / 3;
  grid-column: 1;
  align-self: center;
}

.forum-topic__author-name {
  grid-row: 1;
  grid-column: 2;
  font-weight: 600;
  color: var(--color-text);
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.forum-topic__meta {
  grid-row: 2;
  grid-column: 2;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.forum-topic__pin-icon {
  color: var(--color-accent);
  vertical-align: middle;
}

.forum-topic__actions {
  grid-row: 1 / 3;
  grid-column: 3;
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.25rem;
}

.forum-topic__menu-wrapper {
  display: none;
  grid-row: 1 / 3;
  grid-column: 3;
  position: relative;
}

.forum-topic__menu {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 50;
  min-width: 10rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  padding: 0.25rem;
}

.forum-topic__menu-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: none;
  background: transparent;
  color: var(--color-text);
  font: inherit;
  font-size: 0.875rem;
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
}

.forum-topic__menu-item:hover {
  background: var(--color-border);
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
  color: var(--color-text);
}

.forum-topic__draft-badge {
  display: inline-block;
  margin-right: 0.5rem;
  vertical-align: middle;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-warning);
  border: 1px solid color-mix(in srgb, var(--color-warning) 40%, transparent);
  border-radius: 4px;
  padding: 0.15rem 0.4rem;
}

.forum-topic__draft-banner {
  margin: 0 0 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  background: color-mix(in srgb, var(--color-warning) 12%, transparent);
  color: var(--color-text);
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
  color: var(--color-text-muted);
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
  color: var(--color-error);
}

.forum-topic__comments-loaded {
  font-size: 0.875rem;
  font-weight: 400;
  color: var(--color-text-muted);
}

.forum-topic__load-more {
  display: flex;
  justify-content: center;
  padding: 0.75rem 0;
}

@media (max-width: 480px) {
  .forum-topic__author-row {
    grid-template-columns: auto 1fr auto;
  }

  .forum-topic__actions {
    display: none;
  }

  .forum-topic__menu-wrapper {
    display: block;
  }
}
</style>
