import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateBucketCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutBucketPolicyCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import {
  bucketForDomain,
  buildObjectKey,
  buildPublicUrl,
  type MediaDomain,
} from '@tavrida/object-storage';

const PUBLIC_BUCKETS: MediaDomain[] = ['auction', 'forum'];

@Injectable()
export class MediaStorageService implements OnModuleInit {
  private readonly logger = new Logger(MediaStorageService.name);
  private client!: S3Client;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    this.client = new S3Client({
      region: this.config.get<string>('MINIO_REGION') ?? 'us-east-1',
      endpoint: this.endpoint(),
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.config.get<string>('MINIO_ACCESS_KEY') ?? 'minioadmin',
        secretAccessKey: this.config.get<string>('MINIO_SECRET_KEY') ?? 'minioadmin',
      },
    });

    if (process.env.NODE_ENV === 'production') return;

    for (const domain of PUBLIC_BUCKETS) {
      await this.ensurePublicBucket(bucketForDomain(domain));
    }
  }

  publicBaseUrl(): string {
    return (
      this.config.get<string>('MEDIA_PUBLIC_BASE_URL') ??
      this.config.get<string>('MINIO_URL') ??
      'http://localhost:9000'
    );
  }

  buildPublicUrl(domain: MediaDomain, objectKey: string): string {
    return buildPublicUrl({
      publicBaseUrl: this.publicBaseUrl(),
      domain,
      objectKey,
    });
  }

  buildObjectKey(input: { userId: string; uploadId: string; filename: string }): string {
    return buildObjectKey(input);
  }

  async createPresignedPutUrl(input: {
    domain: MediaDomain;
    objectKey: string;
    contentType: string;
    sizeBytes: number;
    expiresInSec?: number;
  }): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: bucketForDomain(input.domain),
      Key: input.objectKey,
      ContentType: input.contentType,
      ContentLength: input.sizeBytes,
    });
    return getSignedUrl(this.client, command, { expiresIn: input.expiresInSec ?? 900 });
  }

  async headObject(domain: MediaDomain, objectKey: string) {
    return this.client.send(
      new HeadObjectCommand({
        Bucket: bucketForDomain(domain),
        Key: objectKey,
      }),
    );
  }

  private endpoint(): string {
    const host = this.config.get<string>('MINIO_ENDPOINT') ?? 'localhost';
    const port = this.config.get<string>('MINIO_PORT') ?? '9000';
    const ssl = this.config.get<string>('MINIO_USE_SSL') === 'true';
    return `${ssl ? 'https' : 'http'}://${host}:${port}`;
  }

  private async ensurePublicBucket(bucket: string) {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: bucket }));
        this.logger.log(`Created MinIO bucket: ${bucket}`);
      } catch (err) {
        this.logger.warn(`Could not create bucket ${bucket}: ${String(err)}`);
        return;
      }
    }

    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: '*',
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${bucket}/*`],
        },
      ],
    };

    try {
      await this.client.send(
        new PutBucketPolicyCommand({
          Bucket: bucket,
          Policy: JSON.stringify(policy),
        }),
      );
    } catch (err) {
      this.logger.warn(`Could not set public read policy on ${bucket}: ${String(err)}`);
    }
  }
}
