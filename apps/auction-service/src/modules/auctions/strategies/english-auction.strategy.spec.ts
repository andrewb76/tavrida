import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { EnglishAuctionStrategy } from './english-auction.strategy';
import { EnglishAuctionConfig } from '../entities/english-config.entity';
import { Auction, AuctionStatus, AuctionType } from '../entities/auction.entity';
import { Bid } from '../../bids/entities/bid.entity';

// Мок для репозитория
const mockConfigRepository = () => ({
  findOne: jest.fn(),
});

// Вспомогательная функция для создания аукциона
const createMockAuction = (overrides: Partial<Auction> = {}): Auction => {
  const auction = new Auction();
  auction.id = 'test-auction-id';
  auction.type = AuctionType.ENGLISH;
  auction.status = AuctionStatus.ACTIVE;
  auction.currentPrice = 1000;
  auction.startTime = new Date();
  auction.endTime = new Date(Date.now() + 3600000);
  auction.plannedEndTime = auction.endTime;
  auction.seller = { id: 'seller-id' } as any;
  auction.title = 'Test Auction';
  auction.description = 'Test description';
  auction.category = { id: 'cat-id' } as any;
  auction.images = [];
  auction.createdAt = new Date();
  Object.assign(auction, overrides);
  return auction;
};

describe('EnglishAuctionStrategy', () => {
  let strategy: EnglishAuctionStrategy;
  let configRepo: Repository<EnglishAuctionConfig>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnglishAuctionStrategy,
        {
          provide: getRepositoryToken(EnglishAuctionConfig),
          useFactory: mockConfigRepository,
        },
      ],
    }).compile();

    strategy = module.get<EnglishAuctionStrategy>(EnglishAuctionStrategy);
    configRepo = module.get<Repository<EnglishAuctionConfig>>(getRepositoryToken(EnglishAuctionConfig));
  });

  describe('validateBid', () => {
    it('should throw BadRequestException if config not found', async () => {
      (configRepo.findOne as jest.Mock).mockResolvedValue(null);
      const auction = createMockAuction();

      await expect(strategy.validateBid(auction, 1500, 'user-id'))
        .rejects
        .toThrow(BadRequestException);
      expect(configRepo.findOne).toHaveBeenCalledWith({ where: { auction } });
    });

    it('should accept first bid equal to startPrice', async () => {
      const config = new EnglishAuctionConfig();
      config.startPrice = 1000;
      config.minStep = 50;
      (configRepo.findOne as jest.Mock).mockResolvedValue(config);

      const auction = createMockAuction({ currentPrice: 1000 }); // стартовая цена
      const result = await strategy.validateBid(auction, 1000, 'user-id');
      expect(result).toBe(true);
    });

    it('should reject first bid below startPrice', async () => {
      const config = new EnglishAuctionConfig();
      config.startPrice = 1000;
      config.minStep = 50;
      (configRepo.findOne as jest.Mock).mockResolvedValue(config);

      const auction = createMockAuction({ currentPrice: 1000 });
      await expect(strategy.validateBid(auction, 900, 'user-id'))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should accept bid above currentPrice + minStep', async () => {
      const config = new EnglishAuctionConfig();
      config.startPrice = 1000;
      config.minStep = 50;
      (configRepo.findOne as jest.Mock).mockResolvedValue(config);

      const auction = createMockAuction({ currentPrice: 1200 }); // уже есть ставки
      const result = await strategy.validateBid(auction, 1300, 'user-id'); // 1200 + 50 = 1250, 1300 > 1250
      expect(result).toBe(true);
    });

    it('should reject bid below currentPrice + minStep', async () => {
      const config = new EnglishAuctionConfig();
      config.startPrice = 1000;
      config.minStep = 50;
      (configRepo.findOne as jest.Mock).mockResolvedValue(config);

      const auction = createMockAuction({ currentPrice: 1200 });
      await expect(strategy.validateBid(auction, 1240, 'user-id'))
        .rejects
        .toThrow(BadRequestException);
    });
  });

  describe('processBid', () => {
    it('should update currentPrice to bid amount', async () => {
      const config = new EnglishAuctionConfig();
      config.startPrice = 1000;
      config.minStep = 50;
      (configRepo.findOne as jest.Mock).mockResolvedValue(config);

      const auction = createMockAuction({ currentPrice: 1200 });
      const bid = new Bid();
      bid.amount = 1300;
      bid.user = { id: 'bidder-id' } as any;

      const result = await strategy.processBid(auction, bid);
      expect(result.currentPrice).toBe(1300);
    });

    it('should extend endTime if bid placed within antiSniper window', async () => {
      const now = new Date();
      const config = new EnglishAuctionConfig();
      config.antiSniperSeconds = 180;
      (configRepo.findOne as jest.Mock).mockResolvedValue(config);

      const auction = createMockAuction({
        currentPrice: 1200,
        endTime: new Date(now.getTime() + 100000), // 100 секунд до конца (меньше 180)
      });
      const bid = new Bid();
      bid.amount = 1300;
      bid.user = { id: 'bidder-id' } as any;

      const result = await strategy.processBid(auction, bid);
      const newEndTime = result.endTime.getTime();
      const expectedEndTime = new Date(now.getTime() + 180000).getTime();
      // Допускаем погрешность в пару миллисекунд
      expect(newEndTime).toBeGreaterThanOrEqual(expectedEndTime - 10);
      expect(newEndTime).toBeLessThanOrEqual(expectedEndTime + 10);
    });

    it('should NOT extend endTime if bid placed after antiSniper window', async () => {
      const now = new Date();
      const config = new EnglishAuctionConfig();
      config.antiSniperSeconds = 180;
      (configRepo.findOne as jest.Mock).mockResolvedValue(config);

      const auction = createMockAuction({
        currentPrice: 1200,
        endTime: new Date(now.getTime() + 300000), // 300 секунд до конца (>180)
      });
      const bid = new Bid();
      bid.amount = 1300;
      bid.user = { id: 'bidder-id' } as any;

      const originalEnd = auction.endTime;
      const result = await strategy.processBid(auction, bid);
      expect(result.endTime.getTime()).toBe(originalEnd.getTime());
    });

    it('should finish auction if bid amount >= buyNowPrice', async () => {
      const config = new EnglishAuctionConfig();
      config.startPrice = 1000;
      config.minStep = 50;
      config.buyNowPrice = 2000;
      (configRepo.findOne as jest.Mock).mockResolvedValue(config);

      const auction = createMockAuction({ currentPrice: 1200 });
      const bid = new Bid();
      bid.amount = 2000;
      bid.user = { id: 'bidder-id' } as any;

      const result = await strategy.processBid(auction, bid);
      expect(result.status).toBe(AuctionStatus.FINISHED);
      expect(result.currentPrice).toBe(2000);
    });

    it('should NOT finish auction if bid amount < buyNowPrice', async () => {
      const config = new EnglishAuctionConfig();
      config.startPrice = 1000;
      config.minStep = 50;
      config.buyNowPrice = 2000;
      (configRepo.findOne as jest.Mock).mockResolvedValue(config);

      const auction = createMockAuction({ currentPrice: 1200 });
      const bid = new Bid();
      bid.amount = 1500;
      bid.user = { id: 'bidder-id' } as any;

      const result = await strategy.processBid(auction, bid);
      expect(result.status).toBe(AuctionStatus.ACTIVE);
    });
  });
});