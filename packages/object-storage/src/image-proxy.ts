import { normalizePublicBaseUrl, parseMediaUrl } from './urls';

export type ImageProxyResizingType = 'fit' | 'fill' | 'fill-down' | 'force' | 'auto';

export type ImageProxyResize = {
  width?: number;
  height?: number;
  resizingType?: ImageProxyResizingType;
};

export type ImageProxyConfig = {
  /** Browser-facing imgproxy base, e.g. http://localhost:8080 */
  baseUrl: string;
  /** Public MinIO base stored in DB, e.g. http://localhost:9000 */
  publicBaseUrl: string;
  /** Origin imgproxy uses to fetch sources, e.g. http://minio:9000 */
  fetchBaseUrl: string;
  /**
   * When false, reserve the first path segment for a real signature (`sig` placeholder).
   * When true/omitted, use `/_/` (not `/insecure/`) — imgproxy accepts any unsigned
   * segment when KEY/SALT are unset; some browsers/extensions stall on `/insecure/`.
   */
  insecure?: boolean;
};

export function encodeImgproxyPlainSource(url: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(url, 'utf8').toString('base64url');
  }

  const bytes = new TextEncoder().encode(url);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

/** Rewrites a stored public media URL to an origin reachable by imgproxy (e.g. docker MinIO). */
export function rewriteMediaUrlForProxyFetch(
  sourceUrl: string,
  publicBaseUrl: string,
  fetchBaseUrl: string,
): string | null {
  if (!parseMediaUrl(sourceUrl, publicBaseUrl)) return null;

  try {
    const source = new URL(sourceUrl);
    const publicBase = new URL(normalizePublicBaseUrl(publicBaseUrl));
    const fetchBase = new URL(normalizePublicBaseUrl(fetchBaseUrl));

    const publicPath = trimTrailingSlashes(publicBase.pathname);
    let relativePath = source.pathname;
    if (publicPath && relativePath.startsWith(publicPath)) {
      relativePath = relativePath.slice(publicPath.length);
    }

    const fetchPath = trimTrailingSlashes(fetchBase.pathname);
    source.protocol = fetchBase.protocol;
    source.host = fetchBase.host;
    source.pathname = collapseDuplicateSlashes(`${fetchPath}${relativePath}`) || '/';

    return source.toString();
  } catch {
    return null;
  }
}

function trimTrailingSlashes(path: string): string {
  let end = path.length;
  while (end > 0 && path.charCodeAt(end - 1) === 47 /* / */) end -= 1;
  return path.slice(0, end);
}

function collapseDuplicateSlashes(path: string): string {
  let out = '';
  let prevSlash = false;
  for (const ch of path) {
    if (ch === '/') {
      if (prevSlash) continue;
      prevSlash = true;
    } else {
      prevSlash = false;
    }
    out += ch;
  }
  return out;
}

function buildResizeSegment(resize?: ImageProxyResize): string | null {
  if (!resize?.width && !resize?.height) return null;
  const type = resize.resizingType ?? 'fit';
  const width = resize.width ?? 0;
  const height = resize.height ?? 0;
  return `rs:${type}:${width}:${height}`;
}

function outputExtension(sourceUrl: string, publicBaseUrl: string): string | null {
  const parsed = parseMediaUrl(sourceUrl, publicBaseUrl);
  if (!parsed) return null;

  const dot = parsed.filename.lastIndexOf('.');
  if (dot === -1) return null;

  const ext = parsed.filename.slice(dot + 1).toLowerCase();
  if (!/^[a-z0-9]+$/.test(ext)) return null;
  return ext;
}

/**
 * Builds an imgproxy URL for an owned MinIO media object.
 * Returns null when the source is not platform media or proxy config is incomplete.
 */
export function buildImageProxyUrl(
  config: ImageProxyConfig,
  sourceUrl: string,
  resize?: ImageProxyResize,
): string | null {
  const baseUrl = config.baseUrl?.trim();
  if (!baseUrl) return null;

  const fetchUrl = rewriteMediaUrlForProxyFetch(
    sourceUrl,
    config.publicBaseUrl,
    config.fetchBaseUrl,
  );
  if (!fetchUrl) return null;

  const segments = [normalizePublicBaseUrl(baseUrl)];
  // Prefer `/_/` over `/insecure/` — same unsigned semantics, fewer client filters.
  segments.push(config.insecure === false ? 'sig' : '_');

  const resizeSegment = buildResizeSegment(resize);
  if (resizeSegment) segments.push(resizeSegment);

  const encoded = encodeImgproxyPlainSource(fetchUrl);
  const ext = outputExtension(sourceUrl, config.publicBaseUrl);
  segments.push(ext ? `${encoded}.${ext}` : encoded);
  return segments.join('/');
}
