import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { AuctionEntity } from '../../entities/auction.entity';

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    @InjectRepository(AuctionEntity)
    private readonly auctions: Repository<AuctionEntity>,
  ) {}

  async onModuleInit() {
    const count = await this.auctions.count();
    if (count > 0) return;

    const now = Date.now();
    const hour = 60 * 60 * 1000;
    const day = 24 * hour;

    const lots: Array<Partial<AuctionEntity>> = [
      {
        id: randomUUID(),
        sellerId: 'seed-seller-1',
        categoryId: null,
        title: 'Монета 1787',
        description: 'Медная монета периода Екатерины II, чёрный слой патины.',
        type: 'ENGLISH',
        status: 'ACTIVE',
        startingPrice: '1000',
        currentPrice: '1500',
        startsAt: new Date(now - day),
        endsAt: new Date(now + 2 * day),
        promotedUntil: new Date(now + day),
        bidCount: 5,
        images: [],
      },
      {
        id: randomUUID(),
        sellerId: 'seed-seller-2',
        categoryId: null,
        title: 'Кольцо византийское',
        description: 'Бронзовое кольцо с орнаментом, находка 2024.',
        type: 'ENGLISH',
        status: 'ACTIVE',
        startingPrice: '5000',
        currentPrice: '8200',
        startsAt: new Date(now - 2 * day),
        endsAt: new Date(now + 12 * hour),
        bidCount: 11,
        hasExpertAppraisal: true,
        images: [],
      },
      {
        id: randomUUID(),
        sellerId: 'seed-seller-1',
        categoryId: null,
        title: 'Фрагмент амфоры',
        description: 'Древнегреческая керамика, черепок с росписью.',
        type: 'ENGLISH',
        status: 'ACTIVE',
        startingPrice: '300',
        currentPrice: '450',
        startsAt: new Date(now + day),
        endsAt: new Date(now + 5 * day),
        bidCount: 0,
        images: [],
      },
      {
        id: randomUUID(),
        sellerId: 'seed-seller-3',
        categoryId: null,
        title: 'Серебряный крест',
        description: 'Нательный крест, серебро 84 пробы.',
        type: 'ENGLISH',
        status: 'ENDED',
        startingPrice: '2000',
        currentPrice: '3100',
        startsAt: new Date(now - 10 * day),
        endsAt: new Date(now - day),
        bidCount: 7,
        images: [],
      },
      {
        id: randomUUID(),
        sellerId: 'seed-seller-2',
        categoryId: null,
        title: 'Пуговица гвардейская',
        description: 'Медная пуговица XIX века, редкий тип крепления.',
        type: 'DUTCH',
        status: 'SCHEDULED',
        startingPrice: '800',
        currentPrice: '800',
        startsAt: new Date(now + 2 * day),
        endsAt: new Date(now + 6 * day),
        bidCount: 0,
        images: [],
      },
    ];

    await this.auctions.save(lots.map((lot) => this.auctions.create(lot)));
  }
}
