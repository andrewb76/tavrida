export type MediaDomain = 'auction' | 'forum';

export type MediaAttachment = {
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
