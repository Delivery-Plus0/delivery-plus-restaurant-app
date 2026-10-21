import { ApiError } from '@/services/api';
import { t } from '@/i18n/core';

/**
 * Email verification by a 6-digit code (backend #203, #252). These mirror auth-service's settings:
 * VERIFICATION_TOKEN_TTL_MINUTES, VERIFICATION_MAX_ATTEMPTS and VERIFICATION_RESEND_COOLDOWN_SECONDS.
 */
export const CODE_LIFETIME_MS = 10 * 60_000;
export const MAX_WRONG_CODES = 5;
export const RESEND_COOLDOWN_MS = 60_000;

/** Sign-in refused because email verification is required and this email isn't verified (#252). */
export const EMAIL_NOT_VERIFIED = 'EmailNotVerified';

export function isEmailNotVerified(error: unknown): boolean {
  return error instanceof ApiError && error.error === EMAIL_NOT_VERIFIED;
}

/** The six digits; spaces from pasting are ignored. */
export function cleanEmailCode(input: string): string {
  return input.replace(/\s/g, '');
}

export function isCompleteEmailCode(input: string): boolean {
  return /^\d{6}$/.test(cleanEmailCode(input));
}

/**
 * The email waiting for its code, and when the app asked for that code (null when it doesn't know:
 * the person came from a refused sign-in). Kept in memory only, never in the URL or storage; the
 * password is never kept at all.
 */
export type PendingVerification = { email: string; sentAt: number | null };

let pending: PendingVerification | null = null;
let verifiedEmail: string | null = null;

export function startEmailVerification(email: string, sentAt: number | null): void {
  pending = { email, sentAt };
}

export function pendingEmailVerification(): PendingVerification | null {
  return pending;
}

/** The code was accepted: the sign-in screen shows the email, once. */
export function finishEmailVerification(): void {
  verifiedEmail = pending?.email ?? null;
  pending = null;
}

export function takeVerifiedEmail(): string | null {
  const email = verifiedEmail;
  verifiedEmail = null;
  return email;
}

/** What the code screen knows about the current code. */
export type CodeAttempts = { sentAt: number | null; wrongCodes: number };

export type CodeRefusal = {
  message: string;
  /** Wrong codes since the last send, including this one when it counted. */
  wrongCodes: number;
  /** The code can't work any more: Verify waits for a new one. */
  needsNewCode: boolean;
};

/**
 * Explains a refused code. The server answers every failure with the same 401, so it never reveals
 * which emails have accounts; the documented rules tell the cases apart instead: a code lasts
 * CODE_LIFETIME_MS from when it was sent, and the MAX_WRONG_CODES-th wrong attempt ends it.
 */
export function describeCodeRefusal(error: unknown, attempts: CodeAttempts, now: number = Date.now()): CodeRefusal {
  const unchanged = { wrongCodes: attempts.wrongCodes, needsNewCode: false };
  if (!(error instanceof ApiError)) return { ...unchanged, message: t('Unable to verify right now. Try again.') };
  if (error.statusCode === 429) return { ...unchanged, message: t('Too many tries. Wait a minute, then try again.') };
  if (error.statusCode !== 401) return { ...unchanged, message: error.message };

  // An expired code doesn't count as a wrong attempt on the server either.
  if (attempts.sentAt !== null && now - attempts.sentAt >= CODE_LIFETIME_MS) {
    return { wrongCodes: attempts.wrongCodes, needsNewCode: true, message: t('This code has expired. Request a new one.') };
  }
  const wrongCodes = attempts.wrongCodes + 1;
  if (wrongCodes >= MAX_WRONG_CODES) {
    return { wrongCodes, needsNewCode: true, message: t('Too many wrong codes. Request a new one.') };
  }
  if (attempts.sentAt === null) {
    return {
      wrongCodes,
      needsNewCode: false,
      message: t("That code is wrong or has expired. Request a new one if it's been more than 10 minutes."),
    };
  }
  return { wrongCodes, needsNewCode: false, message: t("That code isn't right. Check the email and try again.") };
}

/** Explains a refused resend; `restartCooldown` when the server says it's too soon. */
export function describeResendRefusal(error: unknown): { message: string; restartCooldown: boolean } {
  if (!(error instanceof ApiError)) return { message: t('Unable to send a new code right now. Try again.'), restartCooldown: false };
  if (error.statusCode === 429) return { message: t('Wait a minute before asking for another code.'), restartCooldown: true };
  if (error.statusCode === 503) return { message: t("Email isn't available right now. Try again later."), restartCooldown: false };
  return { message: error.message, restartCooldown: false };
}

/** Whole seconds until a new code may be requested; 0 when it may be requested now. */
export function resendWaitSeconds(lastRequestAt: number | null, now: number = Date.now()): number {
  if (lastRequestAt === null) return 0;
  return Math.max(0, Math.ceil((lastRequestAt + RESEND_COOLDOWN_MS - now) / 1000));
}
