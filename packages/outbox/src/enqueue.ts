import { randomUUID } from 'node:crypto';
import type { EntityManager } from 'typeorm';
import { OutboxMessageEntity } from './outbox-message.entity';
import type {
  CreateDomainEventInput,
  DomainEventEnvelope,
} from './types';

export function createDomainEvent<T>(
  input: CreateDomainEventInput<T>,
): DomainEventEnvelope<T> {
  return {
    eventId: input.eventId ?? randomUUID(),
    eventType: input.eventType,
    eventVersion: '1',
    timestamp: (input.timestamp ?? new Date()).toISOString(),
    producer: input.producer,
    ...(input.correlationId ? { correlationId: input.correlationId } : {}),
    payload: input.payload,
  };
}

export async function enqueueDomainEvent<T>(
  manager: EntityManager,
  input: CreateDomainEventInput<T>,
): Promise<DomainEventEnvelope<T>> {
  const envelope = createDomainEvent(input);
  const repository = manager.getRepository(OutboxMessageEntity);
  await repository.save(
    repository.create({
      eventId: envelope.eventId,
      eventType: envelope.eventType,
      envelope,
      occurredAt: new Date(envelope.timestamp),
      availableAt: new Date(envelope.timestamp),
      attemptCount: 0,
      publishedAt: null,
      lastError: null,
      lockedUntil: null,
      lockedBy: null,
    }),
  );
  return envelope;
}

export function retryDelayMs(attemptCount: number): number {
  const exponent = Math.max(0, Math.min(attemptCount - 1, 8));
  return Math.min(1_000 * 2 ** exponent, 5 * 60_000);
}
