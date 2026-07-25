export type DomainEventEnvelope<T = unknown> = {
  eventId: string;
  eventType: string;
  eventVersion: string;
  timestamp: string;
  producer: string;
  correlationId?: string;
  payload: T;
};

export const DOMAIN_EVENTS_EXCHANGE = 'tavrida-lot.events';

function createEventId(): string {
  const c = globalThis.crypto;
  if (typeof c?.randomUUID === 'function') {
    return c.randomUUID();
  }
  if (typeof c?.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);
    return `evt-${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
  }
  throw new Error('crypto.randomUUID / getRandomValues unavailable');
}

export function createDomainEvent<T>(input: {
  eventType: string;
  producer: string;
  payload: T;
  correlationId?: string;
  eventId?: string;
}): DomainEventEnvelope<T> {
  const eventId = input.eventId ?? createEventId();

  return {
    eventId,
    eventType: input.eventType,
    eventVersion: '1',
    timestamp: new Date().toISOString(),
    producer: input.producer,
    ...(input.correlationId ? { correlationId: input.correlationId } : {}),
    payload: input.payload,
  };
}

/** Stars 1–5 → rating Δ (−2 … +2). Neutral = 3. */
export function dealFeedbackRatingDelta(stars: number): number {
  const n = Math.round(stars);
  if (n < 1 || n > 5) {
    throw new RangeError('stars must be 1..5');
  }
  return n - 3;
}
