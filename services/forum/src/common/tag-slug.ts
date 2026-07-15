/** Cyrillic → latin for tag slugs (url-safe). */
const CYR_MAP: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
};

export function cleanTagLabel(raw: string): string {
  return raw.trim().replace(/^#/, '').slice(0, 32);
}

/** Build latin slug from free-form label; never empty. */
export function slugifyTag(raw: string, fallbackId?: string): string {
  const label = cleanTagLabel(raw).toLowerCase();
  let out = '';
  for (const ch of label) {
    if (CYR_MAP[ch] !== undefined) out += CYR_MAP[ch];
    else out += ch;
  }
  out = out
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  if (out.length > 0) return out;
  return `t-${(fallbackId ?? 'x').replace(/-/g, '').slice(0, 8)}`;
}
