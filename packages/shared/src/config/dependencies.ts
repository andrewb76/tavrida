export const DEPENDENCIES = {
  auction: ['pgsql', 'redis', 'rabbitmq'],
  notifications: ['pgsql', 'rabbitmq', 'logto'],
  subscriptions: ['pgsql', 'rabbitmq'],
  bff: ['pgsql', 'nginx'],  // Assuming BFF needs nginx for routing
  forum: ['pgsql', 'redis'],
  marketplace: ['pgsql', 'minio'],
  chapters: [],  // Placeholder for future services
  'user-profile': ['pgsql', 'logto'],
  keto: [],  // Ory Keto might have internal dependencies
  chat: ['pgsql', 'rabbitmq', 'logto'],
  measure: [],  // Placeholder for measurement service
  audit: [],  // Placeholder for audit service
};
