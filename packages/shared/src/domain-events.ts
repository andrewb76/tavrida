import { randomUUID } from 'node:crypto';

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

export function createDomainEvent<T>(input: {
  eventType: string;
  producer: string;
  payload: T;
  correlationId?: string;
  eventId?: string;
}): DomainEventEnvelope<T> {
  return {
    eventId: input.eventId ?? randomUUID(),
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
