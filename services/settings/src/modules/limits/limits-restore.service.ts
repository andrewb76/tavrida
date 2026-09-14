import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { UserLimitEntity } from '../../entities/user-limit.entity';
import { LimitsService } from './limits.service';

@Injectable()
export class LimitsRestoreService {
  private readonly logger = new Logger(LimitsRestoreService.name);

  constructor(
    @InjectRepository(UserLimitEntity)
    private readonly userLimits: Repository<UserLimitEntity>,
    private readonly limitsService: LimitsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredCycles(): Promise<{ restored: number; errors: number }> {
    const now = new Date();

    const expired = await this.userLimits.find({
      where: { cycleEnd: LessThanOrEqual(now) },
    });

    if (expired.length === 0) return { restored: 0, errors: 0 };

    this.logger.log(`Restoring ${expired.length} expired limit cycles`);

    let restored = 0;
    let errors = 0;

    for (const entity of expired) {
      try {
        await this.limitsService.restoreIfNeeded(entity);
        restored++;
      } catch (err) {
        errors++;
        this.logger.error(
          `Failed to restore limit ${entity.userId}/${entity.paramKey}/${entity.period}: ${err}`,
        );
      }
    }

    return { restored, errors };
  }
}
