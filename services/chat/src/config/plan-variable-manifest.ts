/**
 * Plan variables owned by chat — sync to plan-config at startup (later).
 * TOPIC gate remains forum.author.13topic.chatEnabled.
 * Catalog: docs/05-microservices/PLATFORM-REGISTRY.md
 */
export const CHAT_PLAN_VARIABLE_MANIFEST = [
  {
    key: 'chat.member.dm.enabled',
    valueType: 'feature' as const,
    planValues: { free: false, basic: true, pro: true },
  },
  {
    key: 'chat.member.self.enabled',
    valueType: 'feature' as const,
    planValues: { free: true, basic: true, pro: true },
  },
  {
    key: 'chat.member.group.enabled',
    valueType: 'feature' as const,
    planValues: { free: false, basic: true, pro: true },
  },
  {
    key: 'chat.member.group.inviteEnabled',
    valueType: 'feature' as const,
    planValues: { free: false, basic: true, pro: true },
  },
  {
    key: 'chat.member.attachment.enabled',
    valueType: 'feature' as const,
    planValues: { free: false, basic: true, pro: true },
  },
  {
    key: 'chat.member.mention.enabled',
    valueType: 'feature' as const,
    planValues: { free: false, basic: true, pro: true },
  },
  {
    key: 'chat.member.search.listEnabled',
    valueType: 'feature' as const,
    planValues: { free: true, basic: true, pro: true },
  },
  {
    key: 'chat.member.notify.messagePushEnabled',
    valueType: 'feature' as const,
    planValues: { free: false, basic: false, pro: false },
  },
  {
    key: 'chat.member.notify.messageEmailDigestEnabled',
    valueType: 'feature' as const,
    planValues: { free: false, basic: false, pro: false },
  },
  {
    key: 'chat.member.group.membershipMax',
    valueType: 'limit' as const,
    planValues: { free: 0, basic: 10, pro: -1 },
  },
  {
    key: 'chat.member.group.memberMax',
    valueType: 'limit' as const,
    planValues: { free: 0, basic: 20, pro: 100 },
  },
  {
    key: 'chat.member.group.createDailyMax',
    valueType: 'limit' as const,
    planValues: { free: 0, basic: 3, pro: 20 },
  },
  {
    key: 'chat.member.spawn.copyHistoryMax',
    valueType: 'limit' as const,
    planValues: { free: 0, basic: 50, pro: 100 },
  },
  {
    key: 'chat.member.message.dailyMax',
    valueType: 'limit' as const,
    planValues: { free: 0, basic: 200, pro: -1 },
  },
  {
    key: 'chat.member.message.lengthMax',
    valueType: 'limit' as const,
    planValues: { free: 500, basic: 2000, pro: 5000 },
  },
  {
    key: 'chat.member.attachment.countMax',
    valueType: 'limit' as const,
    planValues: { free: 0, basic: 3, pro: 10 },
  },
  {
    key: 'chat.member.attachment.sizeMaxMb',
    valueType: 'limit' as const,
    planValues: { free: 0, basic: 5, pro: 20 },
  },
] as const;
