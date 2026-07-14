import { requireBearerToken } from './apiAuth';

export type ListingStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

export type ListingCategory =
  | 'restoration'
  | 'appraisal'
  | 'photography'
  | 'packing_delivery'
  | 'storage'
  | 'other';

export type MarketplaceListing = {
  id: string;
  providerId: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: ListingCategory | null;
  status: ListingStatus;
  createdAt: string;
  updatedAt: string;
  portfolio?: PortfolioItem[];
};

export type PortfolioItem = {
  id: string;
  listingId: string;
  title: string;
  description: string | null;
  imageUrl: string;
  sortOrder: number;
};

export type OrderStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISPUTED';

export type MarketplaceOrder = {
  id: string;
  listingId: string;
  providerId: string;
  customerId: string;
  agreedPrice: number;
  currency: string;
  status: OrderStatus;
  note: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt?: string;
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Ожидает',
  ACCEPTED: 'Принят',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Завершён',
  CANCELLED: 'Отменён',
  DISPUTED: 'Спор',
};

/** Mirror of services/marketplace ORDER_TRANSITIONS */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED', 'DISPUTED'],
  COMPLETED: [],
  CANCELLED: [],
  DISPUTED: ['CANCELLED', 'COMPLETED'],
};

export function orderActionsForRole(
  status: OrderStatus,
  role: 'provider' | 'customer',
): OrderStatus[] {
  const next = ORDER_TRANSITIONS[status] ?? [];
  if (role === 'customer') return next.filter((s) => s === 'CANCELLED');
  return next;
}

export const ORDER_ACTION_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Ожидает',
  ACCEPTED: 'Принять',
  IN_PROGRESS: 'В работу',
  COMPLETED: 'Завершить',
  CANCELLED: 'Отменить',
  DISPUTED: 'Спор',
};

export const LISTING_CATEGORY_LABELS: Record<ListingCategory, string> = {
  restoration: 'Реставрация',
  appraisal: 'Экспертиза',
  photography: 'Фотосъёмка',
  packing_delivery: 'Упаковка и доставка',
  storage: 'Хранение',
  other: 'Другое',
};

function apiBase(): string {
  return import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
}

async function authHeaders(): Promise<HeadersInit> {
  const token = await requireBearerToken();
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function parseError(res: Response): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as {
    message?: string | { message?: string };
  };
  if (typeof body.message === 'string') return body.message;
  if (typeof body.message?.message === 'string') return body.message.message;
  return res.statusText || 'Ошибка';
}

export async function listMarketplaceListings(query?: {
  category?: string;
}): Promise<MarketplaceListing[]> {
  const params = new URLSearchParams();
  if (query?.category) params.set('category', query.category);
  const qs = params.toString();
  const res = await fetch(`${apiBase()}/marketplace/listings${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error(await parseError(res));
  const json = (await res.json()) as { data: MarketplaceListing[] };
  return json.data;
}

export async function getMarketplaceListing(id: string): Promise<MarketplaceListing> {
  const res = await fetch(`${apiBase()}/marketplace/listings/${id}`);
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as MarketplaceListing;
}

export async function listMyListings(status?: string): Promise<MarketplaceListing[]> {
  const params = new URLSearchParams({ mine: 'ignored' });
  if (status) params.set('status', status);
  const res = await fetch(`${apiBase()}/marketplace/my/listings?${params}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const json = (await res.json()) as { data: MarketplaceListing[] };
  return json.data;
}

export async function createListing(input: {
  title: string;
  description?: string;
  price: number;
  category?: string;
  status?: ListingStatus;
}): Promise<MarketplaceListing> {
  const res = await fetch(`${apiBase()}/marketplace/listings`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as MarketplaceListing;
}

export async function updateListing(
  id: string,
  input: Partial<{
    title: string;
    description: string;
    price: number;
    category: string | null;
    status: ListingStatus;
  }>,
): Promise<MarketplaceListing> {
  const res = await fetch(`${apiBase()}/marketplace/listings/${id}`, {
    method: 'PATCH',
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as MarketplaceListing;
}

export async function deleteListing(id: string): Promise<void> {
  const res = await fetch(`${apiBase()}/marketplace/listings/${id}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function addPortfolioItem(
  listingId: string,
  input: { title: string; description?: string; imageUrl: string },
): Promise<PortfolioItem> {
  const res = await fetch(`${apiBase()}/marketplace/listings/${listingId}/portfolio`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as PortfolioItem;
}

export async function removePortfolioItem(listingId: string, itemId: string): Promise<void> {
  const res = await fetch(
    `${apiBase()}/marketplace/listings/${listingId}/portfolio/${itemId}`,
    {
      method: 'DELETE',
      headers: await authHeaders(),
    },
  );
  if (!res.ok) throw new Error(await parseError(res));
}

export async function createOrder(listingId: string, note?: string): Promise<MarketplaceOrder> {
  const res = await fetch(`${apiBase()}/marketplace/orders`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ listingId, note }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as MarketplaceOrder;
}

export async function listOrders(
  role: 'provider' | 'customer' = 'customer',
): Promise<MarketplaceOrder[]> {
  const params = new URLSearchParams({ role });
  const res = await fetch(`${apiBase()}/marketplace/orders?${params}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const json = (await res.json()) as { data: MarketplaceOrder[] };
  return json.data;
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<MarketplaceOrder> {
  const res = await fetch(`${apiBase()}/marketplace/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: await authHeaders(),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as MarketplaceOrder;
}
