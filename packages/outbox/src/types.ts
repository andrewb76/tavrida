export type DomainEventEnvelope<T = unknown> = {
  eventId: string;
  eventType: string;
  eventVersion: '1';
  timestamp: string;
  producer: string;
  correlationId?: string;
  payload: T;
};

export type CreateDomainEventInput<T> = {
  eventType: string;
  producer: string;
  payload: T;
  correlationId?: string;
  eventId?: string;
  timestamp?: Date;
};

export type OutboxLogger = {
  log(message: string): void;
  warn(message: string): void;
  error?(message: string): void;
};
