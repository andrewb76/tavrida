export type MetadataFieldType =
  | 'string'
  | 'text'
  | 'integer'
  | 'number'
  | 'boolean'
  | 'enum'
  | 'string[]';

export type MetadataField = {
  key: string;
  type: MetadataFieldType;
  label: string;
  required?: boolean;
  options?: string[];
};

export type MetadataSchema = {
  fields: MetadataField[];
};

const KEY_RE = /^[a-z][a-zA-Z0-9_]{0,63}$/;

export function validateMetadataSchema(schema: unknown): MetadataSchema {
  if (!schema || typeof schema !== 'object') {
    throw new Error('metadataSchema must be an object');
  }
  const fields = (schema as { fields?: unknown }).fields;
  if (!Array.isArray(fields)) {
    throw new Error('metadataSchema.fields must be an array');
  }

  const seen = new Set<string>();
  const normalized: MetadataField[] = [];

  for (const raw of fields) {
    if (!raw || typeof raw !== 'object') throw new Error('Invalid field');
    const f = raw as Record<string, unknown>;
    const key = String(f.key ?? '');
    if (!KEY_RE.test(key)) throw new Error(`Invalid field key: ${key}`);
    if (seen.has(key)) throw new Error(`Duplicate field key: ${key}`);
    seen.add(key);

    const type = f.type as MetadataFieldType;
    const allowed: MetadataFieldType[] = [
      'string',
      'text',
      'integer',
      'number',
      'boolean',
      'enum',
      'string[]',
    ];
    if (!allowed.includes(type)) throw new Error(`Invalid field type: ${String(f.type)}`);

    const label = String(f.label ?? key);
    const required = Boolean(f.required);
    const options = Array.isArray(f.options)
      ? f.options.map((o) => String(o))
      : undefined;
    if (type === 'enum' && (!options || options.length === 0)) {
      throw new Error(`enum field ${key} requires options`);
    }

    normalized.push({ key, type, label, required, options });
  }

  return { fields: normalized };
}

export function validateMetadataValues(
  schema: MetadataSchema,
  values: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const input = values ?? {};
  const out: Record<string, unknown> = {};

  for (const field of schema.fields) {
    const raw = input[field.key];
    if (raw === undefined || raw === null || raw === '') {
      if (field.required) throw new Error(`Missing required metadata: ${field.key}`);
      continue;
    }

    switch (field.type) {
      case 'string':
      case 'text':
        if (typeof raw !== 'string') throw new Error(`${field.key} must be string`);
        out[field.key] = raw;
        break;
      case 'integer':
        if (typeof raw !== 'number' || !Number.isInteger(raw)) {
          throw new Error(`${field.key} must be integer`);
        }
        out[field.key] = raw;
        break;
      case 'number':
        if (typeof raw !== 'number' || Number.isNaN(raw)) {
          throw new Error(`${field.key} must be number`);
        }
        out[field.key] = raw;
        break;
      case 'boolean':
        if (typeof raw !== 'boolean') throw new Error(`${field.key} must be boolean`);
        out[field.key] = raw;
        break;
      case 'enum':
        if (typeof raw !== 'string' || !field.options?.includes(raw)) {
          throw new Error(`${field.key} must be one of: ${field.options?.join(', ')}`);
        }
        out[field.key] = raw;
        break;
      case 'string[]':
        if (!Array.isArray(raw) || raw.some((x) => typeof x !== 'string')) {
          throw new Error(`${field.key} must be string[]`);
        }
        out[field.key] = raw;
        break;
      default:
        throw new Error(`Unsupported type`);
    }
  }

  return out;
}
