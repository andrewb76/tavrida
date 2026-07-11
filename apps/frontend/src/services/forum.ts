import { requireBearerToken } from './apiAuth';

export type CategoryNode = {
  id: string;
  slug: string;
  title: string;
  description: string;
  children: CategoryNode[];
};

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
};

export type ForumComment = {
  id: string;
  topicId: string;
  authorId: string;
  parentId: string | null;
  body: string;
  promotedTopicId: string | null;
  createdAt: string;
  updatedAt: string;
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
  input: { body: string; parentId?: string },
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
