import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ensureDatabaseSchema } from './config/ensure-database';

const DEFAULT_PORT = 3007;

async function bootstrap() {
  await ensureDatabaseSchema();

  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = Number(process.env.USER_PROFILE_PORT ?? process.env.PORT ?? DEFAULT_PORT);
  await app.listen(port);
  console.log(`user-profile listening on :${port}`);
}

void bootstrap();
