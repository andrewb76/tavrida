import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MedalEntity } from '../../entities/medal.entity';
import { UserMedalEntity } from '../../entities/user-medal.entity';
import { InternalMedalsController } from './internal-medals.controller';
import { MedalsService } from './medals.service';

@Module({
  imports: [TypeOrmModule.forFeature([MedalEntity, UserMedalEntity])],
  controllers: [InternalMedalsController],
  providers: [MedalsService],
  exports: [MedalsService],
})
export class MedalsModule {}
