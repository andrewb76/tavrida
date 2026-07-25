const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_PATTERN = /^TAV-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

function randomPart(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return out;
}

export function formatInviteCode(): string {
  return `TAV-${randomPart(4)}-${randomPart(4)}`;
}

export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidInviteCodeFormat(code: string): boolean {
  return CODE_PATTERN.test(normalizeInviteCode(code));
}
