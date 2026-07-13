const IMAGE_PREFIX = 'image/';
const FORUM_EXTRA = new Set(['application/pdf']);
export function isAllowedContentType(domain, contentType) {
    const normalized = contentType.trim().toLowerCase();
    if (normalized.startsWith(IMAGE_PREFIX))
        return true;
    if (domain === 'forum' && FORUM_EXTRA.has(normalized))
        return true;
    return false;
}
export function acceptAttributeForDomain(domain) {
    if (domain === 'auction')
        return 'image/*';
    return 'image/*,.pdf,application/pdf';
}
