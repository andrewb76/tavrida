import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateBucketCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  bucketForDomain,
  buildObjectKey,
  buildPublicUrl,
  type MediaDomain,
} from '@tavrida/object-storage';

const PUBLIC_BUCKETS: MediaDomain[] = ['auction', 'forum', 'marketplace'];

@Injectable()
export class MediaStorageService implements OnModuleInit {
  private readonly logger = new Logger(MediaStorageService.name);
  /** Internal MinIO (Swarm DNS / localhost) — server-side Head/PutBucket. */
  private client!: S3Client;
  /** Browser-facing endpoint for presigned PUT (must be HTTPS in production). */
  private presignClient!: S3Client;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const credentials = {
      accessKeyId: this.config.get<string>('MINIO_ACCESS_KEY') ?? 'minioadmin',
      secretAccessKey: this.config.get<string>('MINIO_SECRET_KEY') ?? 'minioadmin',
    };
    const region = this.config.get<string>('MINIO_REGION') ?? 'us-east-1';

    this.client = new S3Client({
      region,
      endpoint: this.internalEndpoint(),
      forcePathStyle: true,
      credentials,
    });

    const presignEndpoint = this.presignEndpoint();
    this.presignClient = new S3Client({
      region,
      endpoint: presignEndpoint,
      forcePathStyle: true,
      credentials,
    });

    if (presignEndpoint !== this.internalEndpoint()) {
      this.logger.log(`MinIO presign endpoint (browser): ${presignEndpoint}`);
    }

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
    return getSignedUrl(this.presignClient, command, {
      expiresIn: input.expiresInSec ?? 900,
    });
  }

  async headObject(domain: MediaDomain, objectKey: string) {
    return this.client.send(
      new HeadObjectCommand({
        Bucket: bucketForDomain(domain),
        Key: objectKey,
      }),
    );
  }

  /** Endpoint for S3 API from inside the cluster (or local docker). */
  private internalEndpoint(): string {
    const explicit = this.config.get<string>('MINIO_URL')?.trim();
    if (explicit?.startsWith('http')) return explicit.replace(/\/$/, '');

    const host = this.config.get<string>('MINIO_ENDPOINT') ?? 'localhost';
    if (host.startsWith('http://') || host.startsWith('https://')) {
      return host.replace(/\/$/, '');
    }
    const port = this.config.get<string>('MINIO_PORT') ?? '9000';
    const ssl = this.config.get<string>('MINIO_USE_SSL') === 'true';
    const omitPort = (ssl && port === '443') || (!ssl && port === '80');
    return omitPort
      ? `${ssl ? 'https' : 'http'}://${host}`
      : `${ssl ? 'https' : 'http'}://${host}:${port}`;
  }

  /**
   * Endpoint embedded in browser presigned URLs.
   * Prefer MINIO_PRESIGN_ENDPOINT, else MEDIA_PUBLIC_BASE_URL when it is public HTTPS.
   */
  private presignEndpoint(): string {
    const explicit = this.config.get<string>('MINIO_PRESIGN_ENDPOINT')?.trim();
    if (explicit) return explicit.replace(/\/$/, '');

    const publicBase = this.publicBaseUrl().replace(/\/$/, '');
    if (this.isBrowserReachableOrigin(publicBase)) {
      return publicBase;
    }

    return this.internalEndpoint();
  }

  private isBrowserReachableOrigin(url: string): boolean {
    try {
      const u = new URL(url);
      if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
      const host = u.hostname.toLowerCase();
      if (host === 'localhost' || host === '127.0.0.1' || host === 'minio') return false;
      // Swarm / compose internal DNS names are single-label
      if (!host.includes('.')) return false;
      return true;
    } catch {
      return false;
    }
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
