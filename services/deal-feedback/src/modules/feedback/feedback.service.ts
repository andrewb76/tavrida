import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { internalServiceHeaders } from '@tavrida/internal-auth';
import { IsNull, Repository } from 'typeorm';
import { DealFeedbackEntity, type DealType } from '../../entities/deal-feedback.entity';
import { PendingDealFeedbackEntity } from '../../entities/pending-deal-feedback.entity';
import { ProcessedEventEntity } from '../../entities/processed-event.entity';

function ratingDeltaFromStars(stars: number): number {
  const n = Math.round(stars);
  if (n < 1 || n > 5) throw new BadRequestException('rating must be 1..5');
  return n - 3;
}

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    @InjectRepository(DealFeedbackEntity)
    private readonly feedbacks: Repository<DealFeedbackEntity>,
    @InjectRepository(PendingDealFeedbackEntity)
    private readonly pending: Repository<PendingDealFeedbackEntity>,
    @InjectRepository(ProcessedEventEntity)
    private readonly processed: Repository<ProcessedEventEntity>,
    private readonly config: ConfigService,
  ) {}

  async handleOrderCompleted(
    eventId: string,
    payload: {
      orderId: string;
      providerId: string;
      customerId: string;
    },
  ) {
    const seen = await this.processed.findOne({ where: { eventId } });
    if (seen) return { ok: true as const, duplicate: true };

    await this.createPendingPair({
      dealType: 'marketplace',
      orderId: payload.orderId,
      sellerId: payload.providerId,
      buyerId: payload.customerId,
    });

    await this.processed.save(
      this.processed.create({
        eventId,
        eventType: 'marketplace.order_completed',
      }),
    );
    return { ok: true as const, duplicate: false };
  }

  async handleAuctionCompleted(
    eventId: string,
    payload: {
      auctionId: string;
      sellerId: string;
      buyerId: string;
    },
  ) {
    const seen = await this.processed.findOne({ where: { eventId } });
    if (seen) return { ok: true as const, duplicate: true };

    await this.createPendingPair({
      dealType: 'auction',
      auctionId: payload.auctionId,
      sellerId: payload.sellerId,
      buyerId: payload.buyerId,
    });
    await this.processed.save(
      this.processed.create({
        eventId,
        eventType: 'auction.completed',
      }),
    );
    return { ok: true as const, duplicate: false };
  }

  async createPendingPair(input: {
    dealType: DealType;
    auctionId?: string;
    orderId?: string;
    sellerId: string;
    buyerId: string;
  }) {
    if (input.dealType === 'marketplace' && !input.orderId) {
      throw new BadRequestException('orderId required for marketplace');
    }
    if (input.dealType === 'auction' && !input.auctionId) {
      throw new BadRequestException('auctionId required for auction');
    }

    let feedback = await this.findDealFeedback(input);
    if (!feedback) {
      feedback = await this.feedbacks.save(
        this.feedbacks.create({
          dealType: input.dealType,
          auctionId: input.auctionId ?? null,
          orderId: input.orderId ?? null,
          sellerId: input.sellerId,
          buyerId: input.buyerId,
          sellerRating: null,
          buyerRating: null,
          sellerComment: null,
          buyerComment: null,
          submittedBySellerAt: null,
          submittedByBuyerAt: null,
          finalisedAt: null,
        }),
      );
    }

    for (const userId of [input.sellerId, input.buyerId]) {
      const existing = await this.pending.findOne({
        where: {
          dealType: input.dealType,
          auctionId: input.auctionId ?? IsNull(),
          orderId: input.orderId ?? IsNull(),
          userId,
        },
      });
      if (!existing) {
        await this.pending.save(
          this.pending.create({
            dealType: input.dealType,
            auctionId: input.auctionId ?? null,
            orderId: input.orderId ?? null,
            userId,
            notificationSentAt: null,
            remindersCount: 0,
            lastReminderAt: null,
          }),
        );
      }
    }

    return this.toFeedback(feedback);
  }

  async listPending(userId: string) {
    const rows = await this.pending.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return { data: rows.map((r) => this.toPending(r)) };
  }

  async getStatus(input: {
    userId: string;
    dealType: DealType;
    auctionId?: string;
    orderId?: string;
  }) {
    const feedback = await this.findDealFeedback(input);
    if (!feedback) throw new NotFoundException('Deal feedback not found');
    if (feedback.sellerId !== input.userId && feedback.buyerId !== input.userId) {
      throw new ForbiddenException('Not your deal');
    }
    return this.toFeedback(feedback);
  }

  async submit(input: {
    userId: string;
    dealType: DealType;
    auctionId?: string;
    orderId?: string;
    rating: number;
    comment?: string;
  }) {
    const stars = Math.round(input.rating);
    const delta = ratingDeltaFromStars(stars);

    const feedback = await this.findDealFeedback(input);
    if (!feedback) throw new NotFoundException('Deal feedback not found');

    const isSeller = feedback.sellerId === input.userId;
    const isBuyer = feedback.buyerId === input.userId;
    if (!isSeller && !isBuyer) throw new ForbiddenException('Not your deal');

    const now = new Date();
    const comment = input.comment?.trim() || null;

    if (isSeller) {
      if (feedback.submittedBySellerAt) {
        throw new BadRequestException('Seller already submitted feedback');
      }
      feedback.sellerRating = String(stars);
      feedback.sellerComment = comment;
      feedback.submittedBySellerAt = now;
      // Seller rates buyer
      await this.applyRatingDelta({
        targetUserId: feedback.buyerId,
        actorId: input.userId,
        delta,
        referenceId: feedback.id,
        note: `Deal feedback ${stars}★ (seller→buyer)`,
      });
    } else {
      if (feedback.submittedByBuyerAt) {
        throw new BadRequestException('Buyer already submitted feedback');
      }
      feedback.buyerRating = String(stars);
      feedback.buyerComment = comment;
      feedback.submittedByBuyerAt = now;
      // Buyer rates seller
      await this.applyRatingDelta({
        targetUserId: feedback.sellerId,
        actorId: input.userId,
        delta,
        referenceId: feedback.id,
        note: `Deal feedback ${stars}★ (buyer→seller)`,
      });
    }

    if (feedback.submittedBySellerAt && feedback.submittedByBuyerAt) {
      feedback.finalisedAt = now;
    }

    const saved = await this.feedbacks.save(feedback);

    await this.pending.delete({
      dealType: input.dealType,
      auctionId: input.auctionId ?? IsNull(),
      orderId: input.orderId ?? IsNull(),
      userId: input.userId,
    });

    return this.toFeedback(saved);
  }

  private async findDealFeedback(input: {
    dealType: DealType;
    auctionId?: string;
    orderId?: string;
  }) {
    if (input.dealType === 'marketplace') {
      return this.feedbacks.findOne({
        where: { dealType: 'marketplace', orderId: input.orderId ?? undefined },
      });
    }
    return this.feedbacks.findOne({
      where: { dealType: 'auction', auctionId: input.auctionId ?? undefined },
    });
  }

  private async applyRatingDelta(input: {
    targetUserId: string;
    actorId: string;
    delta: number;
    referenceId: string;
    note: string;
  }) {
    if (input.delta === 0) return;

    const base =
      this.config.get<string>('USER_PROFILE_URL')?.replace(/\/$/, '') ??
      'http://localhost:3007';
    try {
      const res = await fetch(`${base}/internal/v1/ratings/${input.targetUserId}/adjust`, {
        method: 'POST',
        headers: internalServiceHeaders(this.config.get<string>('INTERNAL_SERVICE_TOKEN'), {
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          ratingDelta: input.delta,
          actorId: input.actorId,
          source: 'DEAL_FEEDBACK',
          referenceId: input.referenceId,
          note: input.note,
        }),
      });
      if (!res.ok) {
        this.logger.warn(
          `user-profile adjust failed ${res.status}: ${await res.text().catch(() => '')}`,
        );
      }
    } catch (err) {
      this.logger.warn(`user-profile adjust error: ${String(err)}`);
    }
  }

  private toFeedback(row: DealFeedbackEntity) {
    return {
      id: row.id,
      dealType: row.dealType,
      auctionId: row.auctionId,
      orderId: row.orderId,
      sellerId: row.sellerId,
      buyerId: row.buyerId,
      sellerRating: row.sellerRating != null ? Number(row.sellerRating) : null,
      buyerRating: row.buyerRating != null ? Number(row.buyerRating) : null,
      sellerComment: row.sellerComment,
      buyerComment: row.buyerComment,
      submittedBySellerAt: row.submittedBySellerAt?.toISOString() ?? null,
      submittedByBuyerAt: row.submittedByBuyerAt?.toISOString() ?? null,
      finalisedAt: row.finalisedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toPending(row: PendingDealFeedbackEntity) {
    return {
      id: row.id,
      dealType: row.dealType,
      auctionId: row.auctionId,
      orderId: row.orderId,
      userId: row.userId,
      remindersCount: row.remindersCount,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
