import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateEnglishAuctionDto } from './dto/create-english-auction.dto';
import { Auction, AuctionStatus, AuctionType } from './entities/auction.entity';
import { EnglishAuctionConfig } from './entities/english-config.entity';
import { Category } from './entities/category.entity';
import { User } from '../users/entities/user.entity';
import { AutoBid } from './entities/autobid.entity';
import { SetAutoBidDto } from './dto/set-autobid.dto';
import { CreateDutchAuctionDto } from './dto/create-dutch-auction.dto';
import { DutchAuctionConfig } from './entities/dutch-config.entity';

@Injectable()
export class AuctionsService {
  constructor(private readonly dataSource: DataSource) {}

  async createEnglishAuction(dto: CreateEnglishAuctionDto, logtoUserId: string): Promise<Auction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Проверяем категорию
      const category = await queryRunner.manager.findOne(Category, { where: { id: dto.categoryId } });
      if (!category) throw new NotFoundException('Указанная категория не найдена.');

      // 2. Ищем продавца
      const seller = await queryRunner.manager.findOne(User, { where: { logtoId: logtoUserId } });
      if (!seller) throw new NotFoundException('Продавец не найден в системе.');

      // 3. Валидация дат
      const start = new Date(dto.startTime);
      const end = new Date(dto.plannedEndTime);
      if (start >= end) throw new BadRequestException('Время начала не может быть позже времени окончания.');

      // Определяем начальный статус: если startTime в будущем — PENDING, если уже наступило — ACTIVE
      const initialStatus = start > new Date() ? AuctionStatus.PENDING : AuctionStatus.ACTIVE;

      // 4. Создаем базовый аукцион
      const auction = new Auction();
      auction.title = dto.title;
      auction.description = dto.description;
      auction.category = category;
      auction.seller = seller;
      auction.type = AuctionType.ENGLISH;
      auction.status = initialStatus;
      auction.currentPrice = dto.startPrice;
      auction.startTime = start;
      auction.plannedEndTime = end;
      auction.endTime = end; // на старте совпадает с запланированным

      const savedAuction = await queryRunner.manager.save(Auction, auction);

      // 5. Создаем специфичную конфигурацию английской стратегии
      const config = new EnglishAuctionConfig();
      config.auction = savedAuction;
      config.startPrice = dto.startPrice;
      config.minStep = dto.minStep;
      if (dto.buyNowPrice) config.buyNowPrice = dto.buyNowPrice;

      await queryRunner.manager.save(EnglishAuctionConfig, config);

      await queryRunner.commitTransaction();
      return savedAuction;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
  
  async createDutchAuction(dto: CreateDutchAuctionDto, logtoUserId: string): Promise<Auction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const category = await queryRunner.manager.findOne(Category, { where: { id: dto.categoryId } });
      if (!category) throw new NotFoundException('Указанная категория не найдена.');

      const seller = await queryRunner.manager.findOne(User, { where: { logtoId: logtoUserId } });
      if (!seller) throw new NotFoundException('Продавец не найден в системе.');

      const start = new Date(dto.startTime);
      const end = new Date(dto.endTime);
      if (start >= end) throw new BadRequestException('Время начала не может быть позже времени окончания.');
      if (dto.floorPrice >= dto.startPrice) throw new BadRequestException('Минимальная цена должна быть строго ниже стартовой.');

      const initialStatus = start > new Date() ? AuctionStatus.PENDING : AuctionStatus.ACTIVE;

      // 1. Создаем базовый аукцион
      const auction = new Auction();
      auction.title = dto.title;
      auction.description = dto.description;
      auction.category = category;
      auction.seller = seller;
      auction.type = AuctionType.DUTCH; // Жестко указываем тип
      auction.status = initialStatus;
      auction.currentPrice = dto.startPrice; // Стартуем со стартовой стоимости
      auction.startTime = start;
      auction.plannedEndTime = end; // Для голландского овертаймов нет, они совпадают
      auction.endTime = end;

      const savedAuction = await queryRunner.manager.save(Auction, auction);

      // 2. Создаем конфигурацию голландской стратегии
      const config = new DutchAuctionConfig();
      config.auction = savedAuction;
      config.startPrice = dto.startPrice;
      config.floorPrice = dto.floorPrice;
      config.decreaseStep = dto.decreaseStep;
      config.decreaseIntervalMinutes = dto.decreaseIntervalMinutes;

      await queryRunner.manager.save(DutchAuctionConfig, config);

      await queryRunner.commitTransaction();
      return savedAuction;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
  async setAutoBid(dto: SetAutoBidDto, logtoUserId: string): Promise<AutoBid> {
    const user = await this.dataSource.getRepository(User).findOne({ where: { logtoId: logtoUserId } });
    const auction = await this.dataSource.getRepository(Auction).findOne({ where: { id: dto.auctionId } });
    
    if (!user || !auction) throw new NotFoundException('Пользователь или аукцион не найден.');
    if (auction.status !== AuctionStatus.ACTIVE) throw new BadRequestException('Автобид можно ставить только на активные торги.');
    if (dto.maxAmount <= Number(auction.currentPrice)) throw new BadRequestException('Максимальная цена должна быть строго выше текущей.');

    const autoBidRepository = this.dataSource.getRepository(AutoBid);
    
    // Если у пользователя уже стоял автобид на этот лот — обновляем его лимит, если нет — создаем новый
    let autoBid = await autoBidRepository.findOne({ where: { auction: { id: auction.id }, user: { id: user.id } } });
    if (!autoBid) {
      autoBid = new AutoBid();
      autoBid.auction = auction;
      autoBid.user = user;
    }
    autoBid.maxAmount = dto.maxAmount;
    
    return await autoBidRepository.save(autoBid);
  }
}
