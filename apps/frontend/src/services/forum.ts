import { optionalBearerToken, requireBearerToken } from './apiAuth';
import {
  buildCommentTree,
  forumAuthorLabel,
  type CommentTreeNode,
  type ForumAuthor,
  type ForumComment,
} from './forum-tree';

import type { MediaAttachment } from './media';

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

export type TopicSummary = {
  id: string;
  categoryId: string;
  authorId: string;
  title: string;
  excerpt: string;
  isPinned: boolean;
  tags?: string[];
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
  myVote?: 1 | -1 | null;
  canChangeVote?: boolean;
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

export async function listTopics(categoryId?: string): Promise<TopicSummary[]> {
  const params = categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : '';
  const res = await fetch(`${apiBase()}/forum/topics${params}`);
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
  const token = await optionalBearerToken();
  const res = await fetch(`${apiBase()}/forum/topics/${topicId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error('Тема не найдена');
  return (await res.json()) as TopicDetail;
}

export async function createTopic(input: {
  categoryId: string;
  title: string;
  body: string;
  attachments?: MediaAttachment[];
}): Promise<TopicDetail> {
  const token = await requireBearerToken();
  const res = await fetch(`${apiBase()}/forum/topics`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
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
  input: { title?: string; body?: string; attachments?: MediaAttachment[] },
): Promise<TopicDetail> {
  const token = await requireBearerToken();
  const res = await fetch(`${apiBase()}/forum/topics/${encodeURIComponent(topicId)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(err?.detail ?? 'Не удалось обновить тему');
  }
  return (await res.json()) as TopicDetail;
}

export async function listComments(topicId: string): Promise<ForumComment[]> {
  const token = await optionalBearerToken();
  const res = await fetch(`${apiBase()}/forum/topics/${topicId}/comments`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error('Не удалось загрузить комментарии');
  const json = (await res.json()) as { data: ForumComment[] };
  return json.data;
}

export async function createComment(
  topicId: string,
  input: { body: string; parentId?: string; attachments?: MediaAttachment[] },
): Promise<ForumComment> {
  const token = await requireBearerToken();
  const res = await fetch(`${apiBase()}/forum/topics/${topicId}/comments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
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
  const token = await requireBearerToken();
  const res = await fetch(
    `${apiBase()}/forum/topics/${encodeURIComponent(topicId)}/comments/${encodeURIComponent(commentId)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
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
  const token = await requireBearerToken();
  const res = await fetch(`${apiBase()}/forum/votes`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
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
  const token = await requireBearerToken();
  const res = await fetch(`${apiBase()}/forum/votes/clear`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
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
  const token = await requireBearerToken();
  const res = await fetch(`${apiBase()}/forum/reactions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
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
  const token = await requireBearerToken();
  const res = await fetch(
    `${apiBase()}/forum/topics/${encodeURIComponent(topicId)}/comments/${encodeURIComponent(commentId)}/promote-to-topic`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
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
  const token = await requireBearerToken();
  const res = await fetch(`${apiBase()}/forum/topics/${encodeURIComponent(topicId)}/tags`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tags }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(err?.detail ?? 'Не удалось обновить теги');
  }
  return (await res.json()) as TopicDetail;
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
  const token = await requireBearerToken();
  const res = await fetch(`${apiBase()}/admin/forum/categories`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
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
  const token = await requireBearerToken();
  const res = await fetch(`${apiBase()}/admin/forum/categories/${encodeURIComponent(categoryId)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(err?.detail ?? 'Не удалось обновить категорию');
  }
  return (await res.json()) as CategoryRecord;
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const token = await requireBearerToken();
  const res = await fetch(`${apiBase()}/admin/forum/categories/${encodeURIComponent(categoryId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(err?.detail ?? 'Не удалось удалить категорию');
  }
}
