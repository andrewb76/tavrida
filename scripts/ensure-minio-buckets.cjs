/** Run inside BFF container: docker exec -w /app node ensure-minio-buckets.cjs */
const fs = require('node:fs');
const {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
} = require('@aws-sdk/client-s3');

const buckets = [
  'forum-attachments',
  'auction-images',
  'marketplace-portfolio',
  'avatars',
  'logto-avatars',
];

const accessKeyId = process.env.MINIO_ACCESS_KEY?.trim() || 'minioadmin';
const secretFile = process.env.MINIO_SECRET_KEY_FILE?.trim();
const secretAccessKey =
  process.env.MINIO_SECRET_KEY?.trim() ||
  (secretFile ? fs.readFileSync(secretFile, 'utf8').trim() : 'minioadmin');

const client = new S3Client({
  region: 'us-east-1',
  endpoint: 'http://minio:9000',
  forcePathStyle: true,
  credentials: { accessKeyId, secretAccessKey },
});

const policy = (bucket) =>
  JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: '*',
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${bucket}/*`],
      },
    ],
  });

(async () => {
  for (const bucket of buckets) {
    try {
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
      console.log(`ok (exists): ${bucket}`);
    } catch {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
      console.log(`ok (created): ${bucket}`);
    }
    try {
      await client.send(
        new PutBucketPolicyCommand({ Bucket: bucket, Policy: policy(bucket) }),
      );
    } catch (err) {
      console.warn(`policy skip ${bucket}: ${err.message || err}`);
    }
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
