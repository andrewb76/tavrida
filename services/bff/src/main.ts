import 'reflect-metadata';
import './config/hydrate-secrets';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ensureDatabaseSchema } from './config/ensure-database';

const DEFAULT_PORT = 3000;

function parseCorsOrigins(): string[] | boolean {
  const raw = process.env.CORS_ORIGINS;
  if (!raw) return true;
  return raw.split(',').map((origin) => origin.trim()).filter(Boolean);
}

async function bootstrap() {
  await ensureDatabaseSchema();

  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
  app.enableCors({ origin: parseCorsOrigins(), credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = Number(process.env.BFF_PORT ?? process.env.PORT ?? DEFAULT_PORT);
  await app.listen(port);
  Logger.log(`bff listening on :${port}/api/v1`, 'Bootstrap');
}

void bootstrap();
