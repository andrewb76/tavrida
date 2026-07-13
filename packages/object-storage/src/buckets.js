const DOMAIN_BUCKETS = {
    auction: 'auction-images',
    forum: 'forum-attachments',
};
export function bucketForDomain(domain) {
    return DOMAIN_BUCKETS[domain];
}
export function domainForBucket(bucket) {
    const entry = Object.entries(DOMAIN_BUCKETS).find(([, name]) => name === bucket);
    return entry ? entry[0] : null;
}
