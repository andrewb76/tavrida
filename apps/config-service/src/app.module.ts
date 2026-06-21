// src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from './config/config.module';
import { RedisModule } from './redis/redis.module';
import { Config } from './config/entities/config.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: Number.parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || 'auction_user',
      password: process.env.DB_PASSWORD || 'auction_password',
      database: process.env.DB_DATABASE || 'auction_db',

        // host: infisical.get('DB_HOST') || 'localhost',
        // port: parseInt(infisical.get('DB_PORT'), 10) || 5432,
        // username: infisical.get('DB_USERNAME') || 'auction_user',
        // password: infisical.get('DB_PASSWORD') || 'auction_password',
        // database: infisical.get('DB_DATABASE') || 'auction_db',

      schema: 'config',
      entities: [Config],
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    ConfigModule,
    RedisModule,
  ],
})
export class AppModule {}
