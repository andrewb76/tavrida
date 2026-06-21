// src/config/config.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Config } from './entities/config.entity';
import { RedisPubSubService } from '../redis/redis-pubsub.service';

@Injectable()
export class ConfigService {
  constructor(
    @InjectRepository(Config)
    private readonly configRepo: Repository<Config>,
    private readonly redisPubSub: RedisPubSubService,
  ) {}

  // Получить все активные настройки для сервиса
  async findActiveByService(service: string): Promise<Config[]> {
    return await this.configRepo.find({
      where: { service, isActive: true },
    });
  }

  // Получить одну настройку
  async findOne(service: string, key: string): Promise<Config | null> {
    return await this.configRepo.findOne({
      where: { service, key, isActive: true },
    });
  }

  // Синхронизация: создаёт отсутствующие записи, возвращает все активные
  async sync(service: string, defaults: Record<string, any>): Promise<Config[]> {
    const existing = await this.configRepo.find({
      where: { service, isActive: true },
    });
    const existingKeys = new Set(existing.map(c => c.key));

    // Создаём новые записи для ключей, которых ещё нет
    for (const [key, value] of Object.entries(defaults)) {
      if (!existingKeys.has(key)) {
        const newConfig = this.configRepo.create({
          service,
          key,
          value,
          isActive: true,
          // key_description и value_description оставляем null, админ заполнит позже
        });
        await this.configRepo.save(newConfig);
      }
    }

    // Возвращаем все активные (включая существующие)
    return await this.findActiveByService(service);
  }

  // Обновление (только value и value_description) – для админки
  async update(id: string, data: Partial<Pick<Config, 'value' | 'value_description'>>): Promise<Config> {
    const config = await this.configRepo.findOne({ where: { id } });
    if (!config) throw new NotFoundException('Настройка не найдена');

    if (data.value !== undefined) {
      config.value = data.value;
    }
    if (data.value_description !== undefined) {
      config.value_description = data.value_description;
    }

    const cfg = await this.configRepo.save(config);
    
    await this.redisPubSub.publish('config-updates', {
      service: config.service,
      key: config.key,
      updatedAt: new Date(),
    });

    return cfg;
  }

  // Мягкое удаление (админ может отключить)
  async deactivate(id: string): Promise<void> {
    const config = await this.configRepo.findOne({ where: { id } });
    if (!config) throw new NotFoundException('Настройка не найдена');
    config.isActive = false;
    await this.configRepo.save(config);
  }

  // Получить все настройки (для админа, включая неактивные)
  async findAll(): Promise<Config[]> {
    return await this.configRepo.find({ order: { service: 'ASC', key: 'ASC' } });
  }
}
