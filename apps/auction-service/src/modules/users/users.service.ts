import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { UserBanHistory } from './entities/ban-history.entity';
import { BanUserDto } from './dto/ban-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly dataSource: DataSource) {}
  async findByLogtoId(logtoId: string): Promise<User> {
    return new User();
  }

  /**
   * Заблокировать пользователя и залогировать действие в аудит
   */
  async banUser(dto: BanUserDto, moderatorLogtoId: string): Promise<User> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(User, { 
        where: { id: dto.userId },
        lock: { mode: 'pessimistic_write' } // защищаем профиль от параллельных изменений
      });
      if (!user) throw new NotFoundException('Пользователь не найден.');

      const banEndDate = new Date(dto.bannedUntil);
      if (banEndDate <= new Date()) {
        throw new BadRequestException('Дата окончания бана должна быть в будущем.');
      }

      // 1. Обновляем статус в профиле пользователя
      user.bannedUntil = banEndDate;
      user.banReason = dto.reason;
      const updatedUser = await queryRunner.manager.save(User, user);

      // 2. Создаем запись в истории для аудита
      const log = new UserBanHistory();
      log.user = updatedUser;
      log.reason = dto.reason;
      log.startedAt = new Date();
      log.endedAt = banEndDate;
      log.moderatorLogtoId = moderatorLogtoId;
      await queryRunner.manager.save(UserBanHistory, log);

      await queryRunner.commitTransaction();
      return updatedUser;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Досрочно разблокировать пользователя
   */
  async unbanUser(userId: string): Promise<User> {
    const repository = this.dataSource.getRepository(User);
    const user = await repository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Пользователь не найден.');

    user.bannedUntil = null;
    user.banReason = null;
    
    return await repository.save(user);
  }
}
