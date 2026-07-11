import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { resolve } from 'node:path';
import { PlanVariableEntity } from './entities/plan-variable.entity';
import { PlanVariableTierEntity } from './entities/plan-variable-tier.entity';
import { PlanEntity } from './entities/plan.entity';
import { UserSubscriptionEntity } from './entities/user-subscription.entity';
import { HealthController } from './modules/health/health.controller';
import { LimitsModule } from './modules/limits/limits.module';
import { PlanVariablesModule } from './modules/plan-variables/plan-variables.module';
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
      schema: 'plan_config',
      entities: [PlanEntity, PlanVariableEntity, PlanVariableTierEntity, UserSubscriptionEntity],
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    SeedModule,
    PlanVariablesModule,
    LimitsModule,
    PlansModule,
    SubscriptionsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
