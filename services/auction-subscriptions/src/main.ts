import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

const DEFAULT_PORT = 3004;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(
    process.env.AUCTION_SUBSCRIPTIONS_PORT ?? process.env.PORT ?? DEFAULT_PORT,
  );
  await app.listen(port);
  Logger.log(`auction-subscriptions listening on :${port}`, 'Bootstrap');
}

void bootstrap();
