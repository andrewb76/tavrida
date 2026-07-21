import { bffAuthHeaders } from './apiAuth';
import {
  buildCommentTree,
  forumAuthorLabel,
  type CommentTreeNode,
  type ForumAuthor,
  type ForumComment,
} from './forum-tree';

import type { MediaAttachment } from './media';

async function forumAuthHeaders(optional = false): Promise<Record<string, string>> {
  return bffAuthHeaders(undefined, { json: false, optional });
}

async function forumJsonHeaders(): Promise<Record<string, string>> {
  return bffAuthHeaders();
}

export { buildCommentTree, forumAuthorLabel, type CommentTreeNode, type ForumAuthor, type ForumComment };

export type CategoryNode = {
  id: string;
  slug: string;
  title: string;
  description: string;
  parentId: string | null;
  sortOrder: number;
  children: CategoryNode[];
};

export type CategoryRecord = Omit<CategoryNode, 'children'>;

export type ForumTagItem = {
  id: string;
  slug: string;
  displayName: string;
  isOfficial: boolean;
};

export type TopicSummary = {
  id: string;
  categoryId: string;
  authorId: string;
  title: string;
  excerpt: string;
  isPinned: boolean;
  status?: 'DRAFT' | 'PUBLISHED';
  publishedAt?: string | null;
  /** Tag slugs (denormalized). */
  tags?: string[];
  tagItems?: ForumTagItem[];
  author?: ForumAuthor;
  votePlusCount?: number;
  voteMinusCount?: number;
  score?: number;
  createdAt: string;
  updatedAt: string;
};

export type TopicDetail = TopicSummary & {
  body: string;
  attachments: MediaAttachment[];
  author: ForumAuthor;
  tags?: string[];
  tagItems?: ForumTagItem[];
  myVote?: 1 | -1 | null;
  canChangeVote?: boolean;
  addedTagIds?: string[];
};

export type ForumMeta = {
  editWindowMinutes: number;
  voteChangeWindowMinutes: number;
};

function apiBase(): string {
  return import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
}

export async function listCategories(): Promise<CategoryNode[]> {
  const res = await fetch(`${apiBase()}/forum/categories`);
  if (!res.ok) throw new Error('Не удалось загрузить категории');
  const json = (await res.json()) as { data: CategoryNode[] };
  return json.data;
}

export async function listTopics(options?: {
  categoryId?: string;
  status?: 'DRAFT' | 'PUBLISHED';
}): Promise<TopicSummary[]> {
  const params = new URLSearchParams();
  if (options?.categoryId) params.set('categoryId', options.categoryId);
  if (options?.status) params.set('status', options.status);
  const suffix = params.size ? `?${params}` : '';
  const res = await fetch(`${apiBase()}/forum/topics${suffix}`, {
    headers: options?.status === 'DRAFT' ? await forumAuthHeaders() : await forumAuthHeaders(true),
  });
  if (!res.ok) throw new Error('Не удалось загрузить темы');
  const json = (await res.json()) as { data: TopicSummary[] };
  return json.data;
}

export async function fetchForumMeta(): Promise<ForumMeta> {
  const res = await fetch(`${apiBase()}/forum/meta`);
  if (!res.ok) throw new Error('Не удалось загрузить настройки форума');
  return (await res.json()) as ForumMeta;
}

export async function getTopic(topicId: string): Promise<TopicDetail> {
  const res = await fetch(`${apiBase()}/forum/topics/${topicId}`, {
    headers: await forumAuthHeaders(true),
  });
  if (!res.ok) throw new Error('Тема не найдена');
  return (await res.json()) as TopicDetail;
}

export async function createTopic(input: {
  categoryId: string;
  title: string;
  body: string;
  status?: 'DRAFT' | 'PUBLISHED';
  attachments?: MediaAttachment[];
}): Promise<TopicDetail> {
  const res = await fetch(`${apiBase()}/forum/topics`, {
    method: 'POST',
    headers: await forumJsonHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(err?.detail ?? 'Не удалось создать тему');
  }
  return (await res.json()) as TopicDetail;
}

export async function updateTopic(
  topicId: string,
  input: {
    title?: string;
    body?: string;
    status?: 'DRAFT' | 'PUBLISHED';
    attachments?: MediaAttachment[];
  },
): Promise<TopicDetail> {
  const res = await fetch(`${apiBase()}/forum/topics/${encodeURIComponent(topicId)}`, {
    method: 'PATCH',
    headers: await forumJsonHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(err?.detail ?? 'Не удалось обновить тему');
  }
  return (await res.json()) as TopicDetail;
}

export async function listComments(topicId: string): Promise<ForumComment[]> {
  const res = await fetch(`${apiBase()}/forum/topics/${topicId}/comments`, {
    headers: await forumAuthHeaders(true),
  });
  if (!res.ok) throw new Error('Не удалось загрузить комментарии');
  const json = (await res.json()) as { data: ForumComment[] };
  return json.data;
}

export async function createComment(
  topicId: string,
  input: { body: string; parentId?: string; attachments?: MediaAttachment[] },
): Promise<ForumComment> {
  const res = await fetch(`${apiBase()}/forum/topics/${topicId}/comments`, {
    method: 'POST',
    headers: await forumJsonHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(err?.detail ?? 'Не удалось отправить комментарий');
  }
  return (await res.json()) as ForumComment;
}

export async function updateComment(
  topicId: string,
  commentId: string,
  input: { body?: string; attachments?: MediaAttachment[] },
): Promise<ForumComment> {
  const res = await fetch(
    `${apiBase()}/forum/topics/${encodeURIComponent(topicId)}/comments/${encodeURIComponent(commentId)}`,
    {
      method: 'PATCH',
      headers: await forumJsonHeaders(),
      body: JSON.stringify(input),
    },
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(err?.detail ?? 'Не удалось обновить комментарий');
  }
  return (await res.json()) as ForumComment;
}

export type ForumVoteResult = {
  contentId: string;
  contentType: 'topic' | 'comment';
  plusCount: number;
  minusCount: number;
  score: number;
  myVote: 1 | -1 | null;
  canChange: boolean;
};

export async function castForumVote(input: {
  contentId: string;
  contentType: 'topic' | 'comment';
  value: 1 | -1;
}): Promise<ForumVoteResult> {
  const res = await fetch(`${apiBase()}/forum/votes`, {
    method: 'POST',
    headers: await forumJsonHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(err?.detail ?? 'Не удалось проголосовать');
  }
  return (await res.json()) as ForumVoteResult;
}

export async function clearForumVote(input: {
  contentId: string;
  contentType: 'topic' | 'comment';
}): Promise<ForumVoteResult> {
  const res = await fetch(`${apiBase()}/forum/votes/clear`, {
    method: 'POST',
    headers: await forumJsonHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(err?.detail ?? 'Не удалось снять голос');
  }
  return (await res.json()) as ForumVoteResult;
}

export type ForumReactionBucket = {
  emojiKey: string;
  count: number;
  userIds: string[];
};

export type ForumReactionsResponse = {
  contentId: string;
  contentType: 'topic' | 'comment';
  reactions: ForumReactionBucket[];
};

export async function listForumReactions(
  contentId: string,
  contentType: 'topic' | 'comment',
): Promise<ForumReactionsResponse> {
  const params = new URLSearchParams({ contentId, contentType });
  const res = await fetch(`${apiBase()}/forum/reactions?${params}`);
  if (!res.ok) throw new Error('Не удалось загрузить реакции');
  return (await res.json()) as ForumReactionsResponse;
}

export async function upsertForumReaction(input: {
  contentId: string;
  contentType: 'topic' | 'comment';
  emojiKey: string;
}): Promise<{ emojiKey: string | null; cleared?: boolean; updated?: boolean; allowed?: boolean }> {
  const res = await fetch(`${apiBase()}/forum/reactions`, {
    method: 'POST',
    headers: await forumJsonHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(err?.detail ?? 'Не удалось поставить реакцию');
  }
  return (await res.json()) as {
    emojiKey: string | null;
    cleared?: boolean;
    updated?: boolean;
    allowed?: boolean;
  };
}

export async function promoteCommentToTopic(
  topicId: string,
  commentId: string,
  input?: { title?: string },
): Promise<{
  commentId: string;
  sourceTopicId: string;
  promotedTopicId: string;
  title: string;
  movedCommentCount?: number;
}> {
  const res = await fetch(
    `${apiBase()}/forum/topics/${encodeURIComponent(topicId)}/comments/${encodeURIComponent(commentId)}/promote-to-topic`,
    {
      method: 'POST',
      headers: await forumJsonHeaders(),
      body: JSON.stringify(input ?? {}),
    },
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(err?.detail ?? 'Не удалось выделить в тему');
  }
  return (await res.json()) as {
    commentId: string;
    sourceTopicId: string;
    promotedTopicId: string;
    title: string;
    movedCommentCount?: number;
  };
}

export async function updateTopicTags(topicId: string, tags: string[]): Promise<TopicDetail> {
  const res = await fetch(`${apiBase()}/forum/topics/${encodeURIComponent(topicId)}/tags`, {
    method: 'PUT',
    headers: await forumJsonHeaders(),
    body: JSON.stringify({ tags }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(err?.detail ?? 'Не удалось обновить теги');
  }
  return (await res.json()) as TopicDetail;
}

export async function listForumTags(q?: string): Promise<ForumTagItem[]> {
  const params = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
  const res = await fetch(`${apiBase()}/forum/tags${params}`);
  if (!res.ok) throw new Error('Не удалось загрузить теги');
  const json = (await res.json()) as { data: ForumTagItem[] };
  return json.data;
}

export async function getForumTag(slug: string): Promise<
  ForumTagItem & { description: string | null; usageCount: number; topicIds: string[] }
> {
  const res = await fetch(`${apiBase()}/forum/tags/${encodeURIComponent(slug)}`);
  if (!res.ok) throw new Error('Тег не найден');
  return (await res.json()) as ForumTagItem & {
    description: string | null;
    usageCount: number;
    topicIds: string[];
  };
}

export function flattenCategories(nodes: CategoryNode[]): CategoryNode[] {
  const out: CategoryNode[] = [];
  const walk = (list: CategoryNode[]) => {
    for (const node of list) {
      out.push(node);
      walk(node.children);
    }
  };
  walk(nodes);
  return out;
}

export type CategoryFormInput = {
  slug: string;
  title: string;
  description: string;
  parentId: string | null;
  sortOrder: number;
};

export async function createCategory(input: CategoryFormInput): Promise<CategoryRecord> {
  const res = await fetch(`${apiBase()}/admin/forum/categories`, {
    method: 'POST',
    headers: await forumJsonHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(err?.detail ?? 'Не удалось создать категорию');
  }
  return (await res.json()) as CategoryRecord;
}

export async function updateCategory(
  categoryId: string,
  input: Partial<CategoryFormInput>,
): Promise<CategoryRecord> {
  const res = await fetch(`${apiBase()}/admin/forum/categories/${encodeURIComponent(categoryId)}`, {
    method: 'PATCH',
    headers: await forumJsonHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(err?.detail ?? 'Не удалось обновить категорию');
  }
  return (await res.json()) as CategoryRecord;
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const res = await fetch(`${apiBase()}/admin/forum/categories/${encodeURIComponent(categoryId)}`, {
    method: 'DELETE',
    headers: await forumAuthHeaders(),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(err?.detail ?? 'Не удалось удалить категорию');
  }
}
