import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { resolve } from 'node:path';
import { TransactionEntity } from './entities/transaction.entity';
import { UserWalletEntity } from './entities/user-wallet.entity';
import { HealthController } from './modules/health/health.controller';
import { WalletsModule } from './modules/wallets/wallets.module';

const repoRootEnv = (file: string) => resolve(__dirname, '../../..', file);

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [repoRootEnv('.env.local'), repoRootEnv('.env')],
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'tavrida_lot',
      schema: 'billing',
      entities: [UserWalletEntity, TransactionEntity],
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    WalletsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
