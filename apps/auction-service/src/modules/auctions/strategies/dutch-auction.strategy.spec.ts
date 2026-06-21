import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { DutchAuctionStrategy } from './dutch-auction.strategy';
import { DutchAuctionConfig } from '../entities/dutch-config.entity';
import { Auction, AuctionStatus, AuctionType } from '../entities/auction.entity';
import { Bid } from '../../bids/entities/bid.entity';

const mockConfigRepository = () => ({
  findOne: jest.fn(),
});

const createMockAuction = (overrides: Partial<Auction> = {}): Auction => {
  const auction = new Auction();
  auction.id = 'test-auction-id';
  auction.type = AuctionType.DUTCH;
  auction.status = AuctionStatus.ACTIVE;
  auction.currentPrice = 5000;
  auction.startTime = new Date();
  auction.endTime = new Date(Date.now() + 3600000);
  auction.plannedEndTime = auction.endTime;
  auction.seller = { id: 'seller-id' } as any;
  auction.title = 'Test Dutch Auction';
  auction.description = 'Test description';
  auction.category = { id: 'cat-id' } as any;
  auction.images = [];
  auction.createdAt = new Date();
  Object.assign(auction, overrides);
  return auction;
};

describe('DutchAuctionStrategy', () => {
  let strategy: DutchAuctionStrategy;
  let configRepo: Repository<DutchAuctionConfig>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DutchAuctionStrategy,
        {
          provide: getRepositoryToken(DutchAuctionConfig),
          useFactory: mockConfigRepository,
        },
      ],
    }).compile();

    strategy = module.get<DutchAuctionStrategy>(DutchAuctionStrategy);
    configRepo = module.get<Repository<DutchAuctionConfig>>(getRepositoryToken(DutchAuctionConfig));
  });

  describe('validateBid', () => {
    it('should accept bid exactly equal to currentPrice', async () => {
      const auction = createMockAuction({ currentPrice: 3500 });
      const result = await strategy.validateBid(auction, 3500, 'user-id');
      expect(result).toBe(true);
    });

    it('should reject bid not equal to currentPrice (lower)', async () => {
      const auction = createMockAuction({ currentPrice: 3500 });
      await expect(strategy.validateBid(auction, 3400, 'user-id'))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should reject bid not equal to currentPrice (higher)', async () => {
      const auction = createMockAuction({ currentPrice: 3500 });
      await expect(strategy.validateBid(auction, 3600, 'user-id'))
        .rejects
        .toThrow(BadRequestException);
    });
  });

  describe('processBid', () => {
    it('should finish auction and set final price equal to bid amount', async () => {
      const auction = createMockAuction({ currentPrice: 3500 });
      const bid = new Bid();
      bid.amount = 3500;
      bid.user = { id: 'bidder-id' } as any;

      const result = await strategy.processBid(auction, bid);
      expect(result.status).toBe(AuctionStatus.FINISHED);
      expect(result.currentPrice).toBe(3500);
    });
  });

  describe('handleTick', () => {
    it('should decrease price according to elapsed intervals', async () => {
      const config = new DutchAuctionConfig();
      config.startPrice = 5000;
      config.floorPrice = 1000;
      config.decreaseStep = 200;
      config.decreaseIntervalMinutes = 10;
      (configRepo.findOne as jest.Mock).mockResolvedValue(config);

      const start = new Date();
      // Прошло 25 минут => 2 полных интервала (20 минут), цена должна снизиться на 2*200 = 400
      const auction = createMockAuction({
        currentPrice: 5000,
        startTime: new Date(start.getTime() - 25 * 60000),
        endTime: new Date(start.getTime() + 3600000),
        status: AuctionStatus.ACTIVE,
      });

      await strategy.handleTick(auction);
      expect(auction.currentPrice).toBe(4600); // 5000 - 400
    });

    it('should floor price at floorPrice', async () => {
      const config = new DutchAuctionConfig();
      config.startPrice = 5000;
      config.floorPrice = 1000;
      config.decreaseStep = 200;
      config.decreaseIntervalMinutes = 10;
      (configRepo.findOne as jest.Mock).mockResolvedValue(config);

      // Прошло 210 минут => 21 шаг, цена должна быть 5000 - 4200 = 800, но floor = 1000
      const start = new Date();
      const auction = createMockAuction({
        currentPrice: 5000,
        startTime: new Date(start.getTime() - 210 * 60000),
        endTime: new Date(start.getTime() + 3600000),
        status: AuctionStatus.ACTIVE,
      });

      await strategy.handleTick(auction);
      expect(auction.currentPrice).toBe(1000);
    });

    it('should not change price if less than one interval elapsed', async () => {
      const config = new DutchAuctionConfig();
      config.startPrice = 5000;
      config.floorPrice = 1000;
      config.decreaseStep = 200;
      config.decreaseIntervalMinutes = 10;
      (configRepo.findOne as jest.Mock).mockResolvedValue(config);

      const start = new Date();
      // Прошло 5 минут (меньше интервала)
      const auction = createMockAuction({
        currentPrice: 5000,
        startTime: new Date(start.getTime() - 5 * 60000),
        endTime: new Date(start.getTime() + 3600000),
        status: AuctionStatus.ACTIVE,
      });

      await strategy.handleTick(auction);
      expect(auction.currentPrice).toBe(5000);
    });

    it('should finish auction if endTime passed', async () => {
      const config = new DutchAuctionConfig();
      config.startPrice = 5000;
      config.floorPrice = 1000;
      config.decreaseStep = 200;
      config.decreaseIntervalMinutes = 10;
      (configRepo.findOne as jest.Mock).mockResolvedValue(config);

      const now = new Date();
      const auction = createMockAuction({
        currentPrice: 5000,
        startTime: new Date(now.getTime() - 30 * 60000),
        endTime: new Date(now.getTime() - 1000), // уже прошло
        status: AuctionStatus.ACTIVE,
      });

      await strategy.handleTick(auction);
      expect(auction.status).toBe(AuctionStatus.FINISHED);
    });
  });
});
