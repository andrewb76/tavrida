import { bffAuthHeaders } from './apiAuth';

export type MetadataFieldType =
  | 'string'
  | 'text'
  | 'integer'
  | 'number'
  | 'boolean'
  | 'enum'
  | 'string[]';

export type MetadataField = {
  key: string;
  type: MetadataFieldType;
  label: string;
  required?: boolean;
  options?: string[];
};

export type MetadataSchema = { fields: MetadataField[] };

export type PeriodCategory = {
  id: string;
  slug: string;
  title: string;
  description: string;
  sortOrder: number;
  metadataSchema: MetadataSchema;
  isActive: boolean;
};

export type PeriodRecord = {
  id: string;
  categoryId: string;
  parentId: string | null;
  rootId: string;
  depth: number;
  sortIndex: number;
  startsOn: string;
  endsOn: string;
  title: string;
  summary: string;
  body: string;
  metadata: Record<string, unknown>;
  children?: PeriodRecord[];
};

function apiBase(): string {
  return import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
}

async function authHeaders(): Promise<HeadersInit> {
  return bffAuthHeaders();
}

async function parseError(res: Response): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { message?: string | { message?: string } };
  if (typeof body.message === 'string') return body.message;
  if (typeof body.message?.message === 'string') return body.message.message;
  return res.statusText || 'Ошибка';
}

export async function adminListCategories(): Promise<PeriodCategory[]> {
  const res = await fetch(`${apiBase()}/admin/periods/categories`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const json = (await res.json()) as { data: PeriodCategory[] };
  return json.data;
}

export async function adminSaveCategory(
  input: Partial<PeriodCategory> & { slug?: string; title: string },
  id?: string,
): Promise<PeriodCategory> {
  const res = await fetch(
    id ? `${apiBase()}/admin/periods/categories/${id}` : `${apiBase()}/admin/periods/categories`,
    {
      method: id ? 'PATCH' : 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(input),
    },
  );
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as PeriodCategory;
}

export async function adminDeleteCategory(id: string): Promise<void> {
  const res = await fetch(`${apiBase()}/admin/periods/categories/${id}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function adminListPeriods(query: {
  categoryId?: string;
  rootsOnly?: boolean;
  parentId?: string;
  view?: 'flat' | 'tree';
}): Promise<PeriodRecord[]> {
  const params = new URLSearchParams();
  if (query.categoryId) params.set('categoryId', query.categoryId);
  if (query.rootsOnly) params.set('rootsOnly', 'true');
  if (query.parentId) params.set('parentId', query.parentId);
  params.set('view', query.view ?? 'tree');
  const res = await fetch(`${apiBase()}/admin/periods?${params}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const json = (await res.json()) as { data: PeriodRecord[] };
  return json.data;
}

export async function adminSavePeriod(
  input: {
    categoryId?: string;
    parentId?: string;
    startsOn: string;
    endsOn: string;
    title: string;
    summary?: string;
    body?: string;
    metadata?: Record<string, unknown>;
  },
  id?: string,
): Promise<PeriodRecord> {
  const res = await fetch(id ? `${apiBase()}/admin/periods/${id}` : `${apiBase()}/admin/periods`, {
    method: id ? 'PATCH' : 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as PeriodRecord;
}

export async function adminDeletePeriod(id: string): Promise<void> {
  const res = await fetch(`${apiBase()}/admin/periods/${id}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function adminReplaceChildren(
  parentId: string,
  children: Array<{
    id?: string;
    startsOn: string;
    endsOn: string;
    title: string;
    summary?: string;
    body?: string;
    metadata?: Record<string, unknown>;
  }>,
): Promise<PeriodRecord[]> {
  const res = await fetch(`${apiBase()}/admin/periods/${parentId}/children`, {
    method: 'PUT',
    headers: await authHeaders(),
    body: JSON.stringify({ children }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const json = (await res.json()) as { data: PeriodRecord[] };
  return json.data;
}
