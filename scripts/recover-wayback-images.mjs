#!/usr/bin/env node
import pg from 'pg';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync } from 'fs';

const { Client } = pg;

const pgClient = new Client({
  connectionString: 'postgres://postgres:postgres@postgres:5432/tavrida_lot'
});

const s3 = new S3Client({
  region: 'us-east-1',
  endpoint: 'http://tavrida-dev_minio:9000',
  credentials: { accessKeyId: 'minioadmin', secretAccessKey: 'minioadmin' },
  forcePathStyle: true,
});

const BUCKET = 'auction-images';

async function findWaybackUrl(pictUrl) {
  const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=evpatorg.com/uploaded/*/${pictUrl}&output=json&limit=1`;
  try {
    const resp = await fetch(cdxUrl);
    if (!resp.ok) return null;
    const text = await resp.text();
    if (!text.trim()) return null;
    const data = JSON.parse(text);
    if (!Array.isArray(data) || data.length < 2) return null;
    const row = data[1];
    const timestamp = row[1];
    const original = row[2];
    return `https://web.archive.org/web/${timestamp}if_/${original}`;
  } catch (e) {
    console.error(`  CDX error for ${pictUrl}: ${e.message}`);
    return null;
  }
}

async function downloadImage(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const contentType = resp.headers.get('content-type') || 'image/jpeg';
  const buffer = Buffer.from(await resp.arrayBuffer());
  return { buffer, contentType };
}

async function uploadToMinIO(key, buffer, contentType) {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
}

function parseImages(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return []; }
  }
  if (raw && typeof raw === 'object') {
    if (raw.value) {
      try { return JSON.parse(raw.value); } catch { return []; }
    }
  }
  return [];
}

async function main() {
  await pgClient.connect();
  
  const { rows: auctions } = await pgClient.query(`
    SELECT id, legacy_id, images 
    FROM auction.auction 
    WHERE legacy_id IS NOT NULL 
      AND images IS NOT NULL
      AND images::text != '[]'
    ORDER BY legacy_id
  `);
  
  console.log(`Found ${auctions.length} auctions with images`);
  
  const recoverable = readFileSync('/tmp/recoverable.txt', 'utf8')
    .trim().split('\n').filter(Boolean);
  
  console.log(`${recoverable.length} filenames potentially recoverable from Wayback Machine`);
  
  let recovered = 0;
  let failed = 0;
  let cleaned = 0;
  
  for (const auction of auctions) {
    const images = parseImages(auction.images);
    if (images.length === 0) continue;
    
    const firstImage = images[0];
    
    if (recoverable.includes(firstImage)) {
      try {
        const waybackUrl = await findWaybackUrl(firstImage);
        if (!waybackUrl) {
          console.log(`  [${auction.legacy_id}] No Wayback URL for ${firstImage}`);
          failed++;
          continue;
        }
        
        console.log(`  [${auction.legacy_id}] Downloading ${firstImage}...`);
        const { buffer, contentType } = await downloadImage(waybackUrl);
        
        if (buffer.length < 100) {
          console.log(`  [${auction.legacy_id}] Too small (${buffer.length} bytes), skipping`);
          failed++;
          continue;
        }
        
        const s3Key = `${auction.legacy_id}/${firstImage}`;
        await uploadToMinIO(s3Key, buffer, contentType);
        
        const s3Url = `https://s3.tavridalot.ru/auction-images/${s3Key}`;
        await pgClient.query(
          'UPDATE auction.auction SET images = $1 WHERE id = $2',
          [JSON.stringify([s3Url]), auction.id]
        );
        
        console.log(`  [${auction.legacy_id}] OK: ${s3Key} (${buffer.length} bytes)`);
        recovered++;
        
        await new Promise(r => setTimeout(r, 1500));
        
      } catch (e) {
        console.error(`  [${auction.legacy_id}] FAILED: ${e.message}`);
        failed++;
      }
    } else {
      await pgClient.query(
        'UPDATE auction.auction SET images = $1 WHERE id = $2',
        [JSON.stringify([]), auction.id]
      );
      cleaned++;
    }
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`Recovered from Wayback: ${recovered}`);
  console.log(`Failed to recover: ${failed}`);
  console.log(`Cleaned up broken URLs: ${cleaned}`);
  
  await pgClient.end();
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
