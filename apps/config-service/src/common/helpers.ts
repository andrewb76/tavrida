export const errMsg = (err): string => err instanceof Error ? err.message : String(err);
