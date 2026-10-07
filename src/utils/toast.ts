export type ToastTone = 'success' | 'info' | 'danger';

const MIN_MS = 4_000;
const MAX_MS = 8_000;
/** Roughly a slow reading speed, so longer confirmations stay up long enough to read. */
const MS_PER_CHARACTER = 60;

/** How long a toast stays up: at least 4 s, longer for longer messages, never more than 8 s. */
export function toastDurationMs(message: string): number {
  return Math.min(MAX_MS, Math.max(MIN_MS, message.trim().length * MS_PER_CHARACTER));
}
