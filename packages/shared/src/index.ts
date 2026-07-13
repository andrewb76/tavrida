/** Shared types and utilities for Tavrida Lot. */
export const PLATFORM_NAME = 'Tavrida Lot' as const;

export { canEditForumContent, parseEditWindowMinutes } from './forum-edit-window.js';
export { hydrateSecretEnv } from './hydrate-secrets.js';
