import { BadRequestException } from '@nestjs/common';
import type { AuctionType } from '../../entities/auction.entity';

export type CreateAuctionInput = {
  sellerId: string;
  title: string;
  description: string;
  categoryId?: string | null;
  type: AuctionType;
  startingPrice: number;
  bidIncrement: number;
  startsAt: string;
  endsAt: string;
  images?: string[];
  reservePrice?: number | null;
  promote?: boolean;
  maxDurationHours?: number | null;
  allowedTypes?: AuctionType[];
};

export function validateCreateAuction(input: CreateAuctionInput): void {
  const title = input.title.trim();
  const description = input.description.trim();

  if (title.length < 3 || title.length > 256) {
    throw new BadRequestException({ type: 'validation', detail: 'Название: от 3 до 256 символов' });
  }
  if (description.length < 10) {
    throw new BadRequestException({ type: 'validation', detail: 'Описание: минимум 10 символов' });
  }
  if (input.startingPrice < 1) {
    throw new BadRequestException({ type: 'validation', detail: 'Стартовая цена: минимум 1 ₽' });
  }
  if (input.bidIncrement < 1) {
    throw new BadRequestException({ type: 'validation', detail: 'Шаг ставки: минимум 1 ₽' });
  }

  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    throw new BadRequestException({ type: 'validation', detail: 'Некорректные даты торгов' });
  }
  if (endsAt <= startsAt) {
    throw new BadRequestException({ type: 'validation', detail: 'Окончание должно быть позже начала' });
  }

  const durationHours = (endsAt.getTime() - startsAt.getTime()) / (60 * 60 * 1000);
  if (input.maxDurationHours != null && durationHours > input.maxDurationHours) {
    throw new BadRequestException({
      type: 'validation',
      detail: `Макс. длительность по тарифу: ${input.maxDurationHours} ч`,
    });
  }

  const allowed = input.allowedTypes ?? ['ENGLISH', 'DUTCH'];
  if (!allowed.includes(input.type)) {
    throw new BadRequestException({ type: 'validation', detail: 'Тип аукциона недоступен на вашем тарифе' });
  }

  if (input.reservePrice != null && input.reservePrice < input.startingPrice) {
    throw new BadRequestException({
      type: 'validation',
      detail: 'Резервная цена не может быть ниже стартовой',
    });
  }
}

export function resolveInitialStatus(startsAt: Date): 'SCHEDULED' | 'ACTIVE' {
  return startsAt > new Date() ? 'SCHEDULED' : 'ACTIVE';
}
