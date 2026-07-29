/**
 * TypeORM PostgresQueryRunner returns `[rows, rowCount]` for UPDATE/DELETE
 * (not a bare rows array). Reading `result[0].col` then yields undefined.
 */
export function unwrapTypeOrmRows<T extends Record<string, unknown>>(
  result: unknown,
): T[] {
  if (!Array.isArray(result)) return [];
  if (result.length === 0) return [];
  if (Array.isArray(result[0])) {
    return result[0] as T[];
  }
  if (typeof result[0] === 'object' && result[0] !== null) {
    return result as T[];
  }
  return [];
}

export function parsePgTimestamp(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}
