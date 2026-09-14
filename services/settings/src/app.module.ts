import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { resolve } from 'node:path';

import { ParameterEntity } from './entities/parameter.entity';
import { PlanEntity } from './entities/plan.entity';
import { SystemValueEntity } from './entities/system-value.entity';
import { UserValueEntity } from './entities/user-value.entity';
import { PlanValueEntity } from './entities/plan-value.entity';
import { UserLimitEntity } from './entities/user-limit.entity';
import { LimitUsageLogEntity } from './entities/limit-usage-log.entity';
import { LimitPurchaseEntity } from './entities/limit-purchase.entity';
import { UserSubscriptionEntity } from './entities/user-subscription.entity';

import { HealthController } from './modules/health/health.controller';
import { ParameterModule } from './modules/parameters/parameter.module';
import { SystemValueModule } from './modules/system-values/system-value.module';
import { UserValueModule } from './modules/user-values/user-value.module';
import { PlanValuesModule } from './modules/plan-values/plan-values.module';
import { LimitsModule } from './modules/limits/limits.module';
import { SubscriptionModule } from './modules/subscriptions/subscription.module';

const repoRootEnv = (file: string) => resolve(__dirname, '../../..', file);

const entities = [
  ParameterEntity,
  PlanEntity,
  SystemValueEntity,
  UserValueEntity,
  PlanValueEntity,
  UserLimitEntity,
  LimitUsageLogEntity,
  LimitPurchaseEntity,
  UserSubscriptionEntity,
];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [repoRootEnv('.env.local'), repoRootEnv('.env')],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('DATABASE_URL')?.trim();
        return {
          type: 'postgres' as const,
          ...(url
            ? { url }
            : {
                host: String(config.get('DB_HOST', 'localhost')),
                port: Number(config.get('DB_PORT', 5432)),
                username: String(config.get('DB_USER', 'postgres')),
                password: String(config.get('DB_PASSWORD', 'postgres')),
                database: String(config.get('DB_NAME', 'tavrida_lot')),
              }),
          schema: 'settings',
          entities,
          migrations: [resolve(__dirname, 'migrations', '*.{js,ts}')],
          migrationsTableName: 'settings_migrations',
          migrationsRun: config.get('NODE_ENV') === 'production',
          synchronize: config.get('NODE_ENV') !== 'production',
        };
      },
    }),
    ParameterModule,
    SystemValueModule,
    UserValueModule,
    PlanValuesModule,
    LimitsModule,
    SubscriptionModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
