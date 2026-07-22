/**
 * Scalar keys owned by chat — sync to scalar-config at startup (later).
 * Catalog: docs/05-microservices/PLATFORM-REGISTRY.md
 */
export const CHAT_SCALAR_MANIFEST = [
  { key: 'chat.spawn.copyHistoryMax', type: 'number', default: 100 },
  { key: 'chat.message.editWindowMinutes', type: 'number', default: 15 },
  { key: 'chat.message.deleteOwnWindowMinutes', type: 'number', default: 60 },
  { key: 'chat.message.lengthHardMax', type: 'number', default: 10000 },
  { key: 'chat.markdown.sanitizeLevel', type: 'enum', default: 'strict' },
  { key: 'chat.moderation.bannedWordsList', type: 'string[]', default: [] },
  { key: 'chat.history.retentionDays', type: 'number', default: 0 },
  { key: 'chat.unread.markReadOnOpen', type: 'boolean', default: true },
  { key: 'chat.realtime.typingTtlSeconds', type: 'number', default: 5 },
  { key: 'chat.media.presignTtlSeconds', type: 'number', default: 900 },
  { key: 'chat.topic.authorJoinOnPublish', type: 'boolean', default: true },
  { key: 'chat.topic.joinOnComment', type: 'boolean', default: true },
  { key: 'chat.dm.selfAutoCreate', type: 'boolean', default: true },
  { key: 'chat.list.defaultFilter', type: 'enum', default: 'ALL' },
  { key: 'chat.group.leaveKeepsHistory', type: 'boolean', default: true },
] as const;
