import { requireBearerToken } from './apiAuth';
import {
  buildCommentTree,
  type CommentTreeNode,
  type ForumComment,
} from './forum-tree';

import type { MediaAttachment } from './media';

export { buildCommentTree, type CommentTreeNode, type ForumComment };

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
  createdAt: string;
  updatedAt: string;
};

export type TopicDetail = TopicSummary & {
  body: string;
  attachments: MediaAttachment[];
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

export async function getTopic(topicId: string): Promise<TopicDetail> {
  const res = await fetch(`${apiBase()}/forum/topics/${topicId}`);
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

export async function listComments(topicId: string): Promise<ForumComment[]> {
  const res = await fetch(`${apiBase()}/forum/topics/${topicId}/comments`);
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
