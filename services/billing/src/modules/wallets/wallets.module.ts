import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionEntity } from '../../entities/transaction.entity';
import { UserWalletEntity } from '../../entities/user-wallet.entity';
import { InternalWalletsController } from './internal-wallets.controller';
import { WalletsService } from './wallets.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserWalletEntity, TransactionEntity])],
  controllers: [InternalWalletsController],
  providers: [WalletsService],
  exports: [WalletsService],
})
export class WalletsModule {}
