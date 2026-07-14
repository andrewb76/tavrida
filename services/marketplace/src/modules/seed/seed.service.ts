import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { PortfolioItemEntity } from '../../entities/portfolio-item.entity';
import { ServiceListingEntity } from '../../entities/service-listing.entity';

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    @InjectRepository(ServiceListingEntity)
    private readonly listings: Repository<ServiceListingEntity>,
    @InjectRepository(PortfolioItemEntity)
    private readonly portfolio: Repository<PortfolioItemEntity>,
  ) {}

  async onModuleInit() {
    const count = await this.listings.count();
    if (count > 0) return;

    const rows: Array<{
      providerId: string;
      title: string;
      description: string;
      price: string;
      category: ServiceListingEntity['category'];
      portfolio: Array<{ title: string; imageUrl: string }>;
    }> = [
      {
        providerId: 'seed-provider-1',
        title: 'Реставрация медных монет',
        description:
          'Бережная очистка и стабилизация патины. Работаю с монетами XVIII–XIX вв.\n\n' +
          'Срок: 7–14 дней. Фото до/после входят в стоимость.',
        price: '4500',
        category: 'restoration',
        portfolio: [
          {
            title: 'Пример: Екатерина II',
            imageUrl:
              'http://localhost:9000/marketplace-portfolio/users/seed-provider-1/demo-1/coin-before.jpg',
          },
          {
            title: 'После очистки',
            imageUrl:
              'http://localhost:9000/marketplace-portfolio/users/seed-provider-1/demo-1/coin-after.jpg',
          },
        ],
      },
      {
        providerId: 'seed-provider-2',
        title: 'Экспертиза ювелирных находок',
        description:
          'Письменное заключение по металлу, стилю и датировке.\n' +
          'Для аукционных лотов и частных коллекций.',
        price: '8000',
        category: 'appraisal',
        portfolio: [
          {
            title: 'Отчёт по кольцу',
            imageUrl:
              'http://localhost:9000/marketplace-portfolio/users/seed-provider-2/demo-2/ring.jpg',
          },
        ],
      },
      {
        providerId: 'seed-provider-1',
        title: 'Предметная фотосъёмка находок',
        description:
          'Студийные кадры на нейтральном фоне + макро.\n' +
          'Пакет из 8–12 фото для каталога аукциона.',
        price: '2500',
        category: 'photography',
        portfolio: [],
      },
      {
        providerId: 'seed-provider-3',
        title: 'Упаковка и отправка по РФ',
        description:
          'Защитная упаковка хрупких предметов, трек, страховка по согласованию.',
        price: '1200',
        category: 'packing_delivery',
        portfolio: [],
      },
    ];

    for (const item of rows) {
      const listingId = randomUUID();
      await this.listings.save(
        this.listings.create({
          id: listingId,
          providerId: item.providerId,
          title: item.title,
          description: item.description,
          price: item.price,
          currency: 'RUB',
          category: item.category,
          status: 'ACTIVE',
        }),
      );
      for (const [i, p] of item.portfolio.entries()) {
        await this.portfolio.save(
          this.portfolio.create({
            listingId,
            title: p.title,
            description: null,
            imageUrl: p.imageUrl,
            sortOrder: i,
          }),
        );
      }
    }
  }
}
