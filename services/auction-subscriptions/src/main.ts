import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

const DEFAULT_PORT = 3004;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(
    process.env.AUCTION_SUBSCRIPTIONS_PORT ?? process.env.PORT ?? DEFAULT_PORT,
  );
  await app.listen(port);
  console.log(`auction-subscriptions listening on :${port}`);
}

void bootstrap();
