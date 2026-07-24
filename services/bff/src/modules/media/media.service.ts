import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { In, Repository } from 'typeorm';
import type { MediaDomain } from '@tavrida/object-storage';
import { MediaUploadIntentEntity } from './media-upload-intent.entity';
import { MediaLimitsService } from './media-limits.service';
import { MediaStorageService } from './media-storage.service';
import type { CreateUploadIntentDto } from './dto/media.dto';

const INTENT_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(MediaUploadIntentEntity)
    private readonly intents: Repository<MediaUploadIntentEntity>,
    private readonly storage: MediaStorageService,
    private readonly limits: MediaLimitsService,
  ) {}

  getLimits(userId: string, domain: MediaDomain) {
    return this.limits.getLimits(userId, domain);
  }

  async createUploadIntent(userId: string, body: CreateUploadIntentDto) {
    const planLimits = await this.limits.getLimits(userId, body.domain);

    if (body.sizeBytes > planLimits.sizeMaxBytes) {
      throw new BadRequestException({
        type: 'validation',
        detail: `Максимальный размер файла: ${planLimits.sizeMaxMb} MB`,
      });
    }

    if (!this.limits.isAllowedContentType(body.domain, body.contentType)) {
      throw new BadRequestException({
        type: 'validation',
        detail: 'Недопустимый тип файла',
      });
    }

    const uploadId = randomUUID();
    const objectKey = this.storage.buildObjectKey({
      userId,
      uploadId,
      filename: body.filename,
    });
    const publicUrl = this.storage.buildPublicUrl(body.domain, objectKey);
    const expiresAt = new Date(Date.now() + INTENT_TTL_MS);

    const row = this.intents.create({
      id: uploadId,
      userId,
      domain: body.domain,
      objectKey,
      contentType: body.contentType.trim().toLowerCase(),
      sizeBytes: body.sizeBytes,
      filename: body.filename,
      status: 'pending',
      publicUrl,
      expiresAt,
      confirmedAt: null,
    });
    await this.intents.save(row);

    const presignedPutUrl = await this.storage.createPresignedPutUrl({
      domain: body.domain,
      objectKey,
      contentType: row.contentType,
      sizeBytes: body.sizeBytes,
    });

    return {
      uploadId: row.id,
      presignedPutUrl,
      publicUrl: row.publicUrl,
      expiresAt: row.expiresAt.toISOString(),
    };
  }

  async confirmUploadIntent(userId: string, uploadId: string) {
    const row = await this.findOwnedIntent(userId, uploadId);
    if (row.status === 'ready') {
      return this.toConfirmed(row);
    }

    if (row.expiresAt.getTime() < Date.now()) {
      row.status = 'expired';
      await this.intents.save(row);
      throw new BadRequestException({ type: 'validation', detail: 'Сессия загрузки истекла' });
    }

    let head;
    try {
      head = await this.storage.headObject(row.domain, row.objectKey);
    } catch {
      throw new BadRequestException({
        type: 'validation',
        detail: 'Файл ещё не загружен в хранилище',
      });
    }

    const actualSize = Number(head.ContentLength ?? 0);
    if (actualSize < 1 || actualSize > row.sizeBytes) {
      throw new BadRequestException({
        type: 'validation',
        detail: 'Размер загруженного файла не совпадает с заявленным',
      });
    }

    const actualType = (head.ContentType ?? '').trim().toLowerCase();
    if (actualType && actualType !== row.contentType) {
      throw new BadRequestException({
        type: 'validation',
        detail: 'Тип загруженного файла не совпадает с заявленным',
      });
    }

    row.status = 'ready';
    row.confirmedAt = new Date();
    row.sizeBytes = actualSize;
    await this.intents.save(row);

    return this.toConfirmed(row);
  }

  async cancelUploadIntent(userId: string, uploadId: string) {
    const row = await this.findOwnedIntent(userId, uploadId);
    if (row.status === 'pending') {
      row.status = 'expired';
      await this.intents.save(row);
    }
    return { uploadId: row.id, cancelled: true };
  }

  /**
   * Resolve ready upload intents to public attachment DTOs (chat message enrich / WS).
   * Unknown or non-ready ids are skipped.
   */
  async resolveReadyAttachments(
    ids: string[],
  ): Promise<
    Array<{
      id: string;
      url: string;
      filename: string;
      contentType: string;
      sizeBytes: number;
    }>
  > {
    const unique = [...new Set(ids.filter(Boolean))];
    if (!unique.length) return [];
    const rows = await this.intents.find({
      where: { id: In(unique), status: 'ready' },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    const out: Array<{
      id: string;
      url: string;
      filename: string;
      contentType: string;
      sizeBytes: number;
    }> = [];
    for (const id of unique) {
      const row = byId.get(id);
      if (!row) continue;
      out.push({
        id: row.id,
        url: row.publicUrl,
        filename: row.filename,
        contentType: row.contentType,
        sizeBytes: row.sizeBytes,
      });
    }
    return out;
  }

  /** Validate chat attachment ids owned by user, ready, domain=chat. */
  async assertChatAttachmentsOwned(userId: string, ids: string[]): Promise<void> {
    const unique = [...new Set(ids.filter(Boolean))];
    if (!unique.length) return;
    const rows = await this.intents.find({
      where: { id: In(unique), userId },
    });
    if (rows.length !== unique.length) {
      throw new BadRequestException({
        type: 'validation',
        detail: 'Одно или несколько вложений не найдены',
      });
    }
    for (const row of rows) {
      if (row.domain !== 'chat') {
        throw new BadRequestException({
          type: 'validation',
          detail: 'Вложение должно быть загружено в домен chat',
        });
      }
      if (row.status !== 'ready') {
        throw new BadRequestException({
          type: 'validation',
          detail: `Вложение ещё не подтверждено: ${row.filename}`,
        });
      }
    }
  }

  private async findOwnedIntent(userId: string, uploadId: string) {
    const row = await this.intents.findOne({ where: { id: uploadId, userId } });
    if (!row) {
      throw new NotFoundException({ type: 'not-found', detail: 'Сессия загрузки не найдена' });
    }
    return row;
  }

  private toConfirmed(row: MediaUploadIntentEntity) {
    return {
      uploadId: row.id,
      status: row.status,
      publicUrl: row.publicUrl,
      filename: row.filename,
      contentType: row.contentType,
      sizeBytes: row.sizeBytes,
      confirmedAt: row.confirmedAt?.toISOString() ?? null,
    };
  }
}
