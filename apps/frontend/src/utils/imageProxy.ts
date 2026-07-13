import {
  buildImageProxyUrl,
  type ImageProxyConfig,
  type ImageProxyResize,
} from '@tavrida/object-storage';

const DEFAULT_PUBLIC_BASE = 'http://localhost:9000';
const DEFAULT_FETCH_BASE = 'http://minio:9000';

function readImageProxyConfig(): ImageProxyConfig | null {
  const baseUrl = import.meta.env.VITE_IMAGE_PROXY_URL?.trim();
  if (!baseUrl) return null;

  return {
    baseUrl,
    publicBaseUrl: import.meta.env.VITE_MEDIA_PUBLIC_BASE_URL?.trim() || DEFAULT_PUBLIC_BASE,
    fetchBaseUrl: import.meta.env.VITE_IMAGE_PROXY_FETCH_BASE_URL?.trim() || DEFAULT_FETCH_BASE,
    insecure: true,
  };
}

/** Returns a resized imgproxy URL for owned MinIO media, or the original URL when proxy is disabled. */
export function proxiedMediaUrl(
  sourceUrl: string | null | undefined,
  resize?: ImageProxyResize,
): string | undefined {
  if (!sourceUrl) return undefined;

  const config = readImageProxyConfig();
  if (!config) return sourceUrl;

  return buildImageProxyUrl(config, sourceUrl, resize) ?? sourceUrl;
}

export const imageProxyPresets = {
  avatarSm: { width: 64, height: 64, resizingType: 'fit' as const },
  avatarMd: { width: 80, height: 80, resizingType: 'fit' as const },
  avatarLg: { width: 128, height: 128, resizingType: 'fit' as const },
  avatarPreview: { width: 512, height: 512, resizingType: 'fit' as const },
  attachmentThumb: { width: 96, height: 96, resizingType: 'fit' as const },
  forumAttachmentInline: { width: 720, height: 0, resizingType: 'fit' as const },
  forumAttachmentThumb: { width: 160, height: 160, resizingType: 'fit' as const },
  auctionCatalogThumb: { width: 480, height: 192, resizingType: 'fit' as const },
  galleryMain: { width: 900, height: 675, resizingType: 'fit' as const },
  markdownImage: { width: 900, height: 0, resizingType: 'fit' as const },
};
