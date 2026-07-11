import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { resolve } from 'node:path';
import { ParameterEntity } from './entities/parameter.entity';
import { PlanParameterEntity } from './entities/plan-parameter.entity';
import { PlanEntity } from './entities/plan.entity';
import { UserSubscriptionEntity } from './entities/user-subscription.entity';
import { HealthController } from './modules/health/health.controller';
import { LimitsModule } from './modules/limits/limits.module';
import { ParametersModule } from './modules/parameters/parameters.module';
import { PlansModule } from './modules/plans/plans.module';
import { SeedModule } from './modules/seed/seed.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';

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
      schema: 'financial_policy',
      entities: [PlanEntity, ParameterEntity, PlanParameterEntity, UserSubscriptionEntity],
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    SeedModule,
    ParametersModule,
    LimitsModule,
    PlansModule,
    SubscriptionsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
