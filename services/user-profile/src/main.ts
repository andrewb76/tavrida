import 'reflect-metadata';
import './config/hydrate-secrets';
import { attachSentryToNestApp, initSentryNode } from '@tavrida/sentry';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { createInternalAuthMiddleware } from '@tavrida/internal-auth';
import { AppModule } from './app.module';
import { ensureDatabaseSchema } from './config/ensure-database';

const DEFAULT_PORT = 3007;

async function bootstrap() {
  initSentryNode({ service: 'user-profile' });
  await ensureDatabaseSchema();

  const app = await NestFactory.create(AppModule);
  attachSentryToNestApp(app);
  app.use(createInternalAuthMiddleware(process.env));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = Number(process.env.USER_PROFILE_PORT ?? process.env.PORT ?? DEFAULT_PORT);
  await app.listen(port);
  Logger.log(`user-profile listening on :${port}`, 'Bootstrap');
}

void bootstrap();
