export interface ConfigClientOptions {
  service: string;
  defaults: Record<string, any>;
  configServiceUrl?: string;
  redisUrl?: string;
  internalToken?: string;
}
