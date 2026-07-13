import { ForbiddenException } from '@nestjs/common';

const DEFAULT_EDIT_WINDOW_MINUTES = 10;

function parseEditWindowMinutes(value: number, fallback = DEFAULT_EDIT_WINDOW_MINUTES): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.trunc(value);
}

function canEditForumContent(createdAt: Date, windowMinutes: number, now = new Date()): boolean {
  const normalized = parseEditWindowMinutes(windowMinutes);
  if (normalized === 0) return false;
  if (normalized < 0) return true;
  const elapsedMs = now.getTime() - createdAt.getTime();
  return elapsedMs <= normalized * 60_000;
}

export function assertForumEditAllowed(input: {
  authorId: string;
  editorId: string;
  createdAt: Date;
  editWindowMinutes: number;
}) {
  if (input.authorId !== input.editorId) {
    throw new ForbiddenException({
      type: 'forbidden',
      detail: 'Можно редактировать только свой контент',
    });
  }

  if (!canEditForumContent(input.createdAt, input.editWindowMinutes)) {
    throw new ForbiddenException({
      type: 'forbidden',
      detail: 'Время редактирования истекло',
    });
  }
}
