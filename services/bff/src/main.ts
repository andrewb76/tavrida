import 'reflect-metadata';
import './config/hydrate-secrets';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { assertInternalAuthConfigured } from '@tavrida/internal-auth';
import { AppModule } from './app.module';
import { ensureDatabaseSchema } from './config/ensure-database';
import { resolveAuthMode } from './modules/auth/auth-config';

const DEFAULT_PORT = 3000;

function parseCorsOrigins(): string[] | boolean {
  const raw = process.env.CORS_ORIGINS;
  if (!raw) return true;
  return raw.split(',').map((origin) => origin.trim()).filter(Boolean);
}

async function bootstrap() {
  await ensureDatabaseSchema();

  const app = await NestFactory.create(AppModule, { rawBody: true });
  assertInternalAuthConfigured(process.env);
  const config = app.get(ConfigService);
  const authMode = resolveAuthMode({
    NODE_ENV: config.get<string>('NODE_ENV'),
    BFF_ALLOW_DEV_TOKENS: config.get<string>('BFF_ALLOW_DEV_TOKENS'),
    LOGTO_ENDPOINT: config.get<string>('LOGTO_ENDPOINT'),
    LOGTO_JWKS_URL: config.get<string>('LOGTO_JWKS_URL'),
    LOGTO_AUDIENCE: config.get<string>('LOGTO_AUDIENCE'),
  });
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
  app.enableCors({ origin: parseCorsOrigins(), credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = Number(process.env.BFF_PORT ?? process.env.PORT ?? DEFAULT_PORT);
  await app.listen(port);
  Logger.log(`bff listening on :${port}/api/v1 (auth=${authMode})`, 'Bootstrap');
}

void bootstrap();
