import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InfrastructureModule } from './common/infrastructure.module';
import { InfisicalService } from './common/infisical.service';
import { BidsModule } from './modules/bids/bids.module';
import { AuctionsModule } from './modules/auctions/auctions.module';
import { BullModule } from '@nestjs/bullmq';
import { UsersModule } from './modules/users/users.module';
import { HealthModule } from './modules/health/health.module';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthGuard } from './modules/auth/auth.guard';
import { RolesGuard } from './modules/auth/roles.guard';
import { AuthModule } from './modules/auth/auth.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { MetricsInterceptor } from './common/interceptors/metrics.interceptor';

@Module({
  imports: [
    AuthModule,
    InfrastructureModule,
    BullModule.forRootAsync({
      imports: [InfrastructureModule],
      inject: [InfisicalService],
      useFactory: (infisical: InfisicalService) => ({
        connection: {
          host: infisical.get('REDIS_HOST') || 'localhost',
          port: Number.parseInt(infisical.get('REDIS_PORT'), 10) || 6379,
          password: infisical.get('REDIS_PASSWORD') || undefined,
        },
      }),
    }),
    TypeOrmModule.forRootAsync({
      imports: [InfrastructureModule],
      inject: [InfisicalService],
      useFactory: (infisical: InfisicalService) => ({
        type: 'postgres',
        host: infisical.get('DB_HOST') || 'localhost',
        port: parseInt(infisical.get('DB_PORT'), 10) || 5432,
        username: infisical.get('DB_USERNAME') || 'auction_user',
        password: infisical.get('DB_PASSWORD') || 'auction_password',
        database: infisical.get('DB_DATABASE') || 'auction_db',
        schema: 'auction',
        autoLoadEntities: true, 
        synchronize: true, // только для девелопмента
        logging: false,
      }),
    }),
    
    // Подключаем наши изолированные бизнес-модули
    AuctionsModule,
    BidsModule,
    UsersModule,
    HealthModule,
    MetricsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard, // все эндпоинты защищены по умолчанию
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard, // проверка ролей
    },    
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule {}
