export type MediaDomain = 'auction' | 'forum' | 'marketplace' | 'chat' | 'profile';

export type MediaAttachment = {
  /** Upload intent id — used as chat `attachmentIds` / `mediaObjectId`. */
  id?: string;
  url: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
};

export type MediaLimits = {
  countMax: number;
  sizeMaxMb: number;
  sizeMaxBytes: number;
  /** Lot photo aspect (auction domain only). */
  aspectWidth?: number;
  aspectHeight?: number;
};

export type UploadIntentStatus = 'pending' | 'ready' | 'expired';
