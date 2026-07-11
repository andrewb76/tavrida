import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { AuctionEntity } from '../../entities/auction.entity';
import { BidEntity } from '../../entities/bid.entity';
import { ExpertAppraisalEntity } from '../../entities/expert-appraisal.entity';

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    @InjectRepository(AuctionEntity)
    private readonly auctions: Repository<AuctionEntity>,
    @InjectRepository(BidEntity)
    private readonly bids: Repository<BidEntity>,
    @InjectRepository(ExpertAppraisalEntity)
    private readonly expertAppraisals: Repository<ExpertAppraisalEntity>,
  ) {}

  async onModuleInit() {
    const count = await this.auctions.count();
    if (count > 0) return;

    const now = Date.now();
    const hour = 60 * 60 * 1000;
    const day = 24 * hour;

    const coinId = randomUUID();
    const ringId = randomUUID();
    const amphoraId = randomUUID();
    const crossId = randomUUID();
    const buttonId = randomUUID();

    const lots: Array<Partial<AuctionEntity>> = [
      {
        id: coinId,
        sellerId: 'seed-seller-1',
        categoryId: null,
        title: 'Монета 1787',
        description:
          'Медная монета периода Екатерины II с характерным чёрным слоем патины.\n\n' +
          'Диаметр ~2.1 см, вес 5.8 г. Сохранность: хорошая, рельеф читается.\n' +
          'Происхождение: частная коллекция, Крымский регион.',
        type: 'ENGLISH',
        status: 'ACTIVE',
        startingPrice: '1000',
        currentPrice: '1500',
        bidIncrement: '100',
        startsAt: new Date(now - day),
        endsAt: new Date(now + 2 * day),
        promotedUntil: new Date(now + day),
        bidCount: 5,
        images: [],
      },
      {
        id: ringId,
        sellerId: 'seed-seller-2',
        categoryId: null,
        title: 'Кольцо византийское',
        description:
          'Бронзовое кольцо с геометрическим орнаментом. Находка 2024, раскопки частного участка.\n\n' +
          'Внутренний диаметр 18 мм. Есть следы износа, без реставрации.\n' +
          'Экспертная оценка подтверждает подлинность периода.',
        type: 'ENGLISH',
        status: 'ACTIVE',
        startingPrice: '5000',
        currentPrice: '8200',
        bidIncrement: '200',
        startsAt: new Date(now - 2 * day),
        endsAt: new Date(now + 12 * hour),
        bidCount: 4,
        hasExpertAppraisal: true,
        images: [],
      },
      {
        id: amphoraId,
        sellerId: 'seed-seller-1',
        categoryId: null,
        title: 'Фрагмент амфоры',
        description:
          'Древнегреческая керамика: черепок с фрагментом росписи.\n\n' +
          'Размер 8×6 см. Торги начнутся после публикации в каталоге.',
        type: 'ENGLISH',
        status: 'ACTIVE',
        startingPrice: '300',
        currentPrice: '450',
        bidIncrement: '50',
        startsAt: new Date(now + day),
        endsAt: new Date(now + 5 * day),
        bidCount: 0,
        images: [],
      },
      {
        id: crossId,
        sellerId: 'seed-seller-3',
        categoryId: null,
        title: 'Серебряный крест',
        description:
          'Нательный крест, серебро 84 пробы. Завершённые торги — победитель определён.\n\n' +
          'Высота 3.2 см, цепочка не сохранилась.',
        type: 'ENGLISH',
        status: 'ENDED',
        startingPrice: '2000',
        currentPrice: '3100',
        bidIncrement: '100',
        startsAt: new Date(now - 10 * day),
        endsAt: new Date(now - day),
        bidCount: 3,
        images: [],
      },
      {
        id: buttonId,
        sellerId: 'seed-seller-2',
        categoryId: null,
        title: 'Пуговица гвардейская',
        description:
          'Медная пуговица XIX века, редкий тип крепления.\n\n' +
          'Голландский аукцион — цена будет снижаться до первой ставки.',
        type: 'DUTCH',
        status: 'SCHEDULED',
        startingPrice: '800',
        currentPrice: '800',
        bidIncrement: '50',
        startsAt: new Date(now + 2 * day),
        endsAt: new Date(now + 6 * day),
        bidCount: 0,
        images: [],
      },
    ];

    await this.auctions.save(lots.map((lot) => this.auctions.create(lot)));

    const bidRows: Array<Partial<BidEntity>> = [
      { auctionId: coinId, bidderId: 'bidder-1', amount: '1100', placedAt: new Date(now - 20 * hour), isWinning: false },
      { auctionId: coinId, bidderId: 'bidder-2', amount: '1200', placedAt: new Date(now - 18 * hour), isWinning: false },
      { auctionId: coinId, bidderId: 'bidder-3', amount: '1300', placedAt: new Date(now - 10 * hour), isWinning: false },
      { auctionId: coinId, bidderId: 'bidder-1', amount: '1400', placedAt: new Date(now - 6 * hour), isWinning: false },
      { auctionId: coinId, bidderId: 'bidder-4', amount: '1500', placedAt: new Date(now - 2 * hour), isWinning: true },
      { auctionId: ringId, bidderId: 'bidder-5', amount: '5600', placedAt: new Date(now - 8 * hour), isWinning: false },
      { auctionId: ringId, bidderId: 'bidder-2', amount: '6400', placedAt: new Date(now - 5 * hour), isWinning: false },
      { auctionId: ringId, bidderId: 'bidder-6', amount: '7200', placedAt: new Date(now - 3 * hour), isWinning: false },
      { auctionId: ringId, bidderId: 'bidder-5', amount: '8200', placedAt: new Date(now - 1 * hour), isWinning: true },
      { auctionId: crossId, bidderId: 'bidder-3', amount: '2400', placedAt: new Date(now - 8 * day), isWinning: false },
      { auctionId: crossId, bidderId: 'bidder-7', amount: '2800', placedAt: new Date(now - 6 * day), isWinning: false },
      { auctionId: crossId, bidderId: 'bidder-3', amount: '3100', placedAt: new Date(now - 5 * day), isWinning: true },
    ];

    await this.bids.save(
      bidRows.map((row) =>
        this.bids.create({
          id: randomUUID(),
          currency: 'RUB',
          ...row,
        }),
      ),
    );

    await this.expertAppraisals.save(
      this.expertAppraisals.create({
        id: randomUUID(),
        auctionId: ringId,
        expertId: 'expert-1',
        summary:
          'Бронзовое кольцо византийского типа, X–XII вв. Орнамент типичен для южнобережных находок. ' +
          'Рекомендую хранение в сухой среде, без химической чистки.',
        estimatedValueMin: '7500',
        estimatedValueMax: '9500',
        currency: 'RUB',
      }),
    );
  }
}
