import { normalizePublicBaseUrl, parseMediaUrl } from './urls';
export function encodeImgproxyPlainSource(url) {
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(url, 'utf8').toString('base64url');
    }
    const bytes = new TextEncoder().encode(url);
    let binary = '';
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
/** Rewrites a stored public media URL to an origin reachable by imgproxy (e.g. docker MinIO). */
export function rewriteMediaUrlForProxyFetch(sourceUrl, publicBaseUrl, fetchBaseUrl) {
    if (!parseMediaUrl(sourceUrl, publicBaseUrl))
        return null;
    try {
        const source = new URL(sourceUrl);
        const publicBase = new URL(normalizePublicBaseUrl(publicBaseUrl));
        const fetchBase = new URL(normalizePublicBaseUrl(fetchBaseUrl));
        const publicPath = publicBase.pathname.replace(/\/+$/, '');
        let relativePath = source.pathname;
        if (publicPath && relativePath.startsWith(publicPath)) {
            relativePath = relativePath.slice(publicPath.length);
        }
        const fetchPath = fetchBase.pathname.replace(/\/+$/, '');
        source.protocol = fetchBase.protocol;
        source.host = fetchBase.host;
        source.pathname = `${fetchPath}${relativePath}`.replace(/\/{2,}/g, '/') || '/';
        return source.toString();
    }
    catch {
        return null;
    }
}
function buildResizeSegment(resize) {
    if (!resize?.width && !resize?.height)
        return null;
    const type = resize.resizingType ?? 'fit';
    const width = resize.width ?? 0;
    const height = resize.height ?? 0;
    return `rs:${type}:${width}:${height}`;
}
function outputExtension(sourceUrl, publicBaseUrl) {
    const parsed = parseMediaUrl(sourceUrl, publicBaseUrl);
    if (!parsed)
        return null;
    const dot = parsed.filename.lastIndexOf('.');
    if (dot === -1)
        return null;
    const ext = parsed.filename.slice(dot + 1).toLowerCase();
    if (!/^[a-z0-9]+$/.test(ext))
        return null;
    return ext;
}
/**
 * Builds an imgproxy URL for an owned MinIO media object.
 * Returns null when the source is not platform media or proxy config is incomplete.
 */
export function buildImageProxyUrl(config, sourceUrl, resize) {
    const baseUrl = config.baseUrl?.trim();
    if (!baseUrl)
        return null;
    const fetchUrl = rewriteMediaUrlForProxyFetch(sourceUrl, config.publicBaseUrl, config.fetchBaseUrl);
    if (!fetchUrl)
        return null;
    const segments = [normalizePublicBaseUrl(baseUrl)];
    segments.push(config.insecure === false ? 'sig' : 'insecure');
    const resizeSegment = buildResizeSegment(resize);
    if (resizeSegment)
        segments.push(resizeSegment);
    const encoded = encodeImgproxyPlainSource(fetchUrl);
    const ext = outputExtension(sourceUrl, config.publicBaseUrl);
    segments.push(ext ? `${encoded}.${ext}` : encoded);
    return segments.join('/');
}
