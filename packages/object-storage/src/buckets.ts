import type { MediaDomain } from './types';

const DOMAIN_BUCKETS: Record<MediaDomain, string> = {
  auction: 'auction-images',
  forum: 'forum-attachments',
  marketplace: 'marketplace-portfolio',
};

export function bucketForDomain(domain: MediaDomain): string {
  return DOMAIN_BUCKETS[domain];
}

export function domainForBucket(bucket: string): MediaDomain | null {
  const entry = Object.entries(DOMAIN_BUCKETS).find(([, name]) => name === bucket);
  return entry ? (entry[0] as MediaDomain) : null;
}
