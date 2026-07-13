export function sanitizeFilename(filename) {
    const base = filename.split(/[/\\]/).pop() ?? 'file';
    const cleaned = base.replace(/[^\w.\-()+ ]+/g, '_').trim();
    return cleaned.length > 0 ? cleaned.slice(0, 200) : 'file';
}
export function buildObjectKey(input) {
    const safeName = sanitizeFilename(input.filename);
    return `users/${input.userId}/${input.uploadId}/${safeName}`;
}
