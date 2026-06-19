import { Injectable, OnModuleInit } from '@nestjs/common';
import { InfisicalSDK } from '@infisical/sdk';

@Injectable()
export class InfisicalService implements OnModuleInit {
  private client: InfisicalSDK;
  private readonly secretsCache: Map<string, string> = new Map();

  async onModuleInit() {
    // 1. Инициализация экземпляра SDK
    this.client = new InfisicalSDK({
      siteUrl: process.env.INFISICAL_SITE_URL || 'https://infisical.fobos.andrewb.cloudns.ph'
    });

    // 2. Исправленный метод Universal Auth логина по цепочке методов SDK
    await this.client.auth().universalAuth.login({
      clientId: process.env.INFISICAL_CLIENT_ID || '47d39e42-0c95-4fe8-91b1-a398afa089f8',
      clientSecret: process.env.INFISICAL_CLIENT_SECRET || '0247116e06432ce54a2cf8e39f1b9b5ab648150e6791ce8c41fc2018eac0a6a6'
    });

    // 3. Скачивание секретов проекта
    const projectId = process.env.INFISICAL_PROJECT_ID || '8caeca97-b523-46a2-8a9b-8b82b81f9060';
    const environment = process.env.NODE_ENV || 'dev';

    const { secrets } = await this.client.secrets().listSecrets({
      projectId: projectId,
      environment: environment,
      secretPath: '/',
      viewSecretValue: true
    });

    // 4. Кэширование секретов в память NestJS
    if (secrets && Array.isArray(secrets)) {
      for (const secret of secrets) {
        this.secretsCache.set(secret.secretKey, secret.secretValue);
      }
    }
  }

  /**
   * Получить секрет из кэша Infisical
   */
  get(key: string): string {
    const value = this.secretsCache.get(key);
    if (!value) {
      return process.env[key] || '';
    }
    return value;
  }
}
