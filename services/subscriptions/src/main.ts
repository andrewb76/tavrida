import 'reflect-metadata';
import './config/hydrate-secrets';
import { attachHawkToNestApp, initHawkNode } from '@tavrida/hawk';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { createInternalAuthMiddleware } from '@tavrida/internal-auth';
import { AppModule } from './app.module';
import { ensureDatabaseSchema } from './config/ensure-database';

const DEFAULT_PORT = 3004;

async function bootstrap() {
  initHawkNode({ service: 'subscriptions' });
  await ensureDatabaseSchema();

  const app = await NestFactory.create(AppModule);
  attachHawkToNestApp(app);
  app.use(createInternalAuthMiddleware(process.env));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = Number(
    process.env.SUBSCRIPTIONS_PORT ?? process.env.AUCTION_SUBSCRIPTIONS_PORT ?? process.env.PORT ?? DEFAULT_PORT,
  );
  await app.listen(port);
  Logger.log(`subscriptions listening on :${port}`, 'Bootstrap');
}

void bootstrap();
