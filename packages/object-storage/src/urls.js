import { bucketForDomain, domainForBucket } from './buckets';
import { buildObjectKey } from './paths';
export function normalizePublicBaseUrl(baseUrl) {
    return baseUrl.replace(/\/+$/, '');
}
export function buildPublicUrl(input) {
    const base = normalizePublicBaseUrl(input.publicBaseUrl);
    const bucket = bucketForDomain(input.domain);
    const key = input.objectKey.replace(/^\/+/, '');
    return `${base}/${bucket}/${key}`;
}
export function parseMediaUrl(url, publicBaseUrl) {
    let parsed;
    try {
        parsed = new URL(url);
    }
    catch {
        return null;
    }
    const base = normalizePublicBaseUrl(publicBaseUrl);
    let baseUrl;
    try {
        baseUrl = new URL(base);
    }
    catch {
        return null;
    }
    if (parsed.origin !== baseUrl.origin)
        return null;
    const basePath = baseUrl.pathname.replace(/\/+$/, '');
    const fullPath = parsed.pathname;
    const relative = basePath && fullPath.startsWith(basePath)
        ? fullPath.slice(basePath.length).replace(/^\/+/, '')
        : fullPath.replace(/^\/+/, '');
    const segments = relative.split('/').filter(Boolean);
    if (segments.length < 4)
        return null;
    const [bucket, usersSegment, userId, uploadId, ...filenameParts] = segments;
    if (usersSegment !== 'users' || !userId || !uploadId)
        return null;
    const domain = domainForBucket(bucket);
    if (!domain)
        return null;
    const filename = filenameParts.join('/');
    if (!filename)
        return null;
    return { bucket, domain, userId, uploadId, filename };
}
export function isOwnedMediaUrl(url, userId, publicBaseUrl) {
    const parsed = parseMediaUrl(url, publicBaseUrl);
    return parsed?.userId === userId;
}
export function extractMarkdownImageUrls(body) {
    const urls = [];
    const pattern = /!\[[^\]]*]\(([^)]+)\)/g;
    for (const match of body.matchAll(pattern)) {
        const raw = match[1]?.trim();
        if (raw)
            urls.push(raw);
    }
    return urls;
}
export function objectKeyFromPublicUrl(url, publicBaseUrl) {
    const parsed = parseMediaUrl(url, publicBaseUrl);
    if (!parsed)
        return null;
    return buildObjectKey({
        userId: parsed.userId,
        uploadId: parsed.uploadId,
        filename: parsed.filename,
    });
}
