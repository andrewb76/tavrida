import { InfisicalService } from './infisical.service';

export const getRedisConnectionOptions = (infisical: InfisicalService) => ({
  host: infisical.get('REDIS_HOST') || 'localhost',
  port: parseInt(infisical.get('REDIS_PORT'), 10) || 6379,
  password: infisical.get('REDIS_PASSWORD') || undefined,
});