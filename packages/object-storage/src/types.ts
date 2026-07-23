export type MediaDomain = 'auction' | 'forum' | 'marketplace' | 'chat';

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
};

export type UploadIntentStatus = 'pending' | 'ready' | 'expired';
