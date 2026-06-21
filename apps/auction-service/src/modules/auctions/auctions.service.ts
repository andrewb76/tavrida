import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
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
import { ConfigClientService } from '@app/config-client';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class AuctionsService {
  private technicalCategorySlug: string;
  private technicalCategoryId: string;

  constructor(
    private readonly dataSource: DataSource,
    private readonly configClient: ConfigClientService,
    private readonly metrics: MetricsService,
  ) {}

  async onModuleInit() {
    // Загружаем слаг из настроек
    this.technicalCategorySlug = this.configClient.get<string>('technicalCategorySlug') || '_archived_auctions';
    // Создаём техническую категорию, если её нет
    await this.ensureTechnicalCategory();
  }

  private async ensureTechnicalCategory() {
    const categoryRepo = this.dataSource.getRepository(Category);
    let techCategory = await categoryRepo.findOne({ where: { slug: this.technicalCategorySlug } });
    if (!techCategory) {
      techCategory = new Category();
      techCategory.name = 'Архив (техническая категория)';
      techCategory.slug = this.technicalCategorySlug;
      // parent = null (корневая)
      techCategory.parent = null;
      await categoryRepo.save(techCategory);
      console.log(`Technical category created with slug: ${this.technicalCategorySlug}`);
    }
    // Сохраняем ID для быстрого доступа
    this.technicalCategoryId = techCategory.id;
  }

  private async validateCategory(category: Category, manager) {
    if (!category) throw new NotFoundException('Указанная категория не найдена.');

    if (category.slug === this.technicalCategorySlug) 
      throw new BadRequestException('Нельзя создавать лоты в технической категории.');
    
    const isLeaf = await manager
      .getRepository(Category)
      .count({ where: { parent: { id: category.id } } }) === 0;

    if (!isLeaf) {
      throw new BadRequestException(
        'Лот можно создавать только в конечной категории (без подкатегорий). ' +
        'Выберите более конкретную категорию.'
      );
    }
  }

  async createEnglishAuction(dto: CreateEnglishAuctionDto, logtoUserId: string): Promise<Auction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Проверяем категорию
      const category = await queryRunner.manager.findOne(Category, { where: { id: dto.categoryId } });
      await this.validateCategory(category, queryRunner.manager);

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
      this.metrics.incrementAuctionCreation(auction.type);

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
      await this.validateCategory(category, queryRunner.manager);

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
      this.metrics.incrementAuctionCreation(auction.type);

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
    if (user.bannedUntil && user.bannedUntil > new Date()) throw new BadRequestException('Вы забанены, невозможно установить автобид.');
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
