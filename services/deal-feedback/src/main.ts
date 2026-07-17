import 'reflect-metadata';
import './config/hydrate-secrets';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { createInternalAuthMiddleware } from '@tavrida/internal-auth';
import { AppModule } from './app.module';
import { ensureDatabaseSchema } from './config/ensure-database';

const DEFAULT_PORT = 3006;

async function bootstrap() {
  await ensureDatabaseSchema();
  const app = await NestFactory.create(AppModule);
  app.use(createInternalAuthMiddleware(process.env));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const port = Number(
    process.env.DEAL_FEEDBACK_PORT ?? process.env.FEEDBACK_PORT ?? process.env.PORT ?? DEFAULT_PORT,
  );
  await app.listen(port);
  Logger.log(`deal-feedback listening on :${port}`, 'Bootstrap');
}

void bootstrap();
