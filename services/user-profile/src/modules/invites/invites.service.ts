import {
  ConflictException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { formatInviteCode, normalizeInviteCode } from '../../common/invite-code';
import { InvitationEntity } from '../../entities/invitation.entity';
import { InviteCodeEntity } from '../../entities/invite-code.entity';
import { UserProfileEntity } from '../../entities/user-profile.entity';
import { InviteEventsPublisher } from '../events/invite-events.publisher';

export type InviteStatus = 'active' | 'redeemed' | 'expired';

export type CreateInviteInput = {
  issuerId: string;
  logtoToken: string;
  email?: string;
  expiresAt: string;
  maxUses?: number;
};

export type ClaimInviteInput = {
  userId: string;
  inviteCodeId?: string;
  inviterId?: string;
};

@Injectable()
export class InvitesService {
  private readonly logger = new Logger(InvitesService.name);
  private readonly maxCodeAttempts = 8;

  constructor(
    @InjectRepository(InviteCodeEntity)
    private readonly inviteCodes: Repository<InviteCodeEntity>,
    @InjectRepository(UserProfileEntity)
    private readonly profiles: Repository<UserProfileEntity>,
    @InjectRepository(InvitationEntity)
    private readonly invitations: Repository<InvitationEntity>,
    private readonly inviteEvents: InviteEventsPublisher,
  ) {}

  async createInvite(input: CreateInviteInput): Promise<InviteCodeEntity> {
    const code = await this.generateUniqueCode();
    const entity = this.inviteCodes.create({
      code,
      issuerId: input.issuerId,
      logtoToken: input.logtoToken,
      email: input.email ?? null,
      maxUses: input.maxUses ?? 1,
      usesCount: 0,
      expiresAt: new Date(input.expiresAt),
    });
    return this.inviteCodes.save(entity);
  }

  async listByIssuer(issuerId: string, limit = 20): Promise<InviteCodeEntity[]> {
    return this.inviteCodes.find({
      where: { issuerId },
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 100),
    });
  }

  async resolve(params: { code?: string; token?: string }) {
    let record: InviteCodeEntity | null = null;

    if (params.code) {
      record = await this.inviteCodes.findOne({
        where: { code: normalizeInviteCode(params.code) },
      });
    } else if (params.token) {
      record = await this.inviteCodes.findOne({
        where: { logtoToken: params.token },
      });
    }

    if (!record) {
      throw new NotFoundException({
        type: 'not-found',
        detail: 'Invite code not found',
      });
    }

    if (record.expiresAt < new Date()) {
      throw new GoneException({
        type: 'invite-expired',
        detail: 'Invite has expired',
      });
    }

    if (record.usesCount >= record.maxUses) {
      throw new ConflictException({
        type: 'invite-exhausted',
        detail: 'Invite code already used',
      });
    }

    return {
      token: record.logtoToken,
      email: record.email ?? undefined,
      inviterId: record.issuerId,
      inviteCodeId: record.id,
      code: record.code,
    };
  }

  async claim(input: ClaimInviteInput) {
    const profile = await this.ensureProfile(input.userId);

    if (profile.inviterId) {
      return {
        userId: profile.userId,
        inviterId: profile.inviterId,
        invitationAcceptedAt: profile.invitationAcceptedAt?.toISOString() ?? null,
        claimed: false,
      };
    }

    let inviterId = input.inviterId;
    let inviteCodeId = input.inviteCodeId;

    if (inviteCodeId) {
      const code = await this.inviteCodes.findOne({ where: { id: inviteCodeId } });
      if (!code) {
        throw new NotFoundException({
          type: 'not-found',
          detail: 'Invite code not found',
        });
      }
      if (inviterId && inviterId !== code.issuerId) {
        throw new ConflictException({
          type: 'conflict',
          detail: 'inviterId does not match invite code',
        });
      }
      inviterId = code.issuerId;
      inviteCodeId = code.id;
      code.usesCount += 1;
      await this.inviteCodes.save(code);
    }

    if (!inviterId) {
      throw new NotFoundException({
        type: 'not-found',
        detail: 'inviterId or inviteCodeId required',
      });
    }

    if (inviterId === input.userId) {
      throw new ConflictException({
        type: 'conflict',
        detail: 'Cannot claim self-invite',
      });
    }

    const acceptedAt = new Date();
    profile.inviterId = inviterId;
    profile.invitationAcceptedAt = acceptedAt;
    await this.profiles.save(profile);

    await this.invitations.save(
      this.invitations.create({
        inviteeId: input.userId,
        inviterId,
        inviteCodeId: inviteCodeId ?? null,
        acceptedAt,
      }),
    );

    const acceptedAtIso = acceptedAt.toISOString();
    try {
      await this.inviteEvents.publishInvitationRedeemed({
        inviteeId: input.userId,
        inviterId,
        inviteCodeId: inviteCodeId ?? null,
        acceptedAt: acceptedAtIso,
      });
    } catch (error) {
      this.logger.warn(
        `invitation.redeemed publish failed: ${error instanceof Error ? error.message : error}`,
      );
    }

    return {
      userId: profile.userId,
      inviterId,
      invitationAcceptedAt: acceptedAtIso,
      claimed: true,
    };
  }

  statusOf(record: InviteCodeEntity): InviteStatus {
    if (record.expiresAt < new Date()) return 'expired';
    if (record.usesCount >= record.maxUses) return 'redeemed';
    return 'active';
  }

  private async ensureProfile(userId: string): Promise<UserProfileEntity> {
    let profile = await this.profiles.findOne({ where: { userId } });
    if (!profile) {
      profile = this.profiles.create({ userId, inviterId: null, invitationAcceptedAt: null });
      profile = await this.profiles.save(profile);
    }
    return profile;
  }

  private async generateUniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < this.maxCodeAttempts; attempt++) {
      const code = formatInviteCode();
      const existing = await this.inviteCodes.findOne({ where: { code } });
      if (!existing) return code;
    }
    throw new ConflictException({
      type: 'conflict',
      detail: 'Failed to generate unique invite code',
    });
  }
}
