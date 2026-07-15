import { randomUUID } from 'node:crypto';

export const DOMAIN_EVENTS_EXCHANGE = 'tavrida-lot.events';

export type DomainEventEnvelope<T = unknown> = {
  eventId: string;
  eventType: string;
  eventVersion: string;
  timestamp: string;
  producer: string;
  correlationId?: string;
  payload: T;
};

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

/** Payload for `tag.content_tagged` (RMQ + match). */
export type TagContentTaggedPayload = {
  tagId: string;
  topicId: string;
  contentType: 'topic' | 'comment';
  contentId: string;
  excludeUserIds?: string[];
};
