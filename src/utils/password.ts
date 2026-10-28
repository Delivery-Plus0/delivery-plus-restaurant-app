import { ApiError } from '@/services/api';
import { t } from '@/i18n/core';

/**
 * Password change and reset (backend #35). These mirror the backend's rules: the registration password
 * policy (8 characters at least) and user-service's PHONE_OTP_POLICY for the texted reset code.
 */
export const MIN_PASSWORD_LENGTH = 8;
export const RESET_CODE_LIFETIME_MS = 5 * 60_000;
export const MAX_WRONG_RESET_CODES = 5;
export const RESET_RESEND_COOLDOWN_MS = 60_000;

/** Wrong current password on a change (backend: 400, never 401, so the session isn't taken as expired). */
export const CURRENT_PASSWORD_INCORRECT = 'CurrentPasswordIncorrect';
/** SMS isn't set up on the server: every reset request is refused the same way. */
export const SMS_UNAVAILABLE = 'SmsUnavailable';

export function newPasswordError(value: string): string | undefined {
  if (!value) return t('Enter a new password');
  if (value.length < MIN_PASSWORD_LENGTH) return t('Use at least {count} characters', { count: MIN_PASSWORD_LENGTH });
  return undefined;
}

export function confirmPasswordError(password: string, confirmation: string): string | undefined {
  if (!confirmation) return t('Enter the new password again');
  return confirmation === password ? undefined : t("The passwords don't match");
}

/** The six digits; spaces from pasting are ignored. */
export function cleanResetCode(input: string): string {
  return input.replace(/\s/g, '');
}

export function isCompleteResetCode(input: string): boolean {
  return /^\d{6}$/.test(cleanResetCode(input));
}

/** Messages the server sends that the apps translate (the rest are shown as they come). */
function serverMessage(error: ApiError): string {
  if (error.message === 'New password must differ from the current one') return t('Choose a password different from your current one.');
  if (error.message === 'Password must be at least 8 characters') return t('Use at least {count} characters', { count: MIN_PASSWORD_LENGTH });
  return error.message;
}

/** Explains a refused password change. */
export function describeChangeRefusal(error: unknown): string {
  if (!(error instanceof ApiError)) return t('Unable to change your password right now. Try again.');
  if (error.error === CURRENT_PASSWORD_INCORRECT) {
    return t('Your current password is wrong. Too many wrong tries lock the account for a while.');
  }
  if (error.statusCode === 429) return t('Too many tries. Wait a minute, then try again.');
  return serverMessage(error);
}

/** Explains a refused "send me a code"; `unavailable` when SMS isn't set up, so the screen stops there. */
export function describeForgotRefusal(error: unknown): { message: string; unavailable: boolean } {
  if (!(error instanceof ApiError)) return { message: t('Unable to send a code right now. Try again.'), unavailable: false };
  if (error.statusCode === 503 && error.error === SMS_UNAVAILABLE) {
    return { message: t("Resetting a password by text message isn't available yet. Try again later."), unavailable: true };
  }
  if (error.statusCode === 429) return { message: t('Too many requests. Wait a while, then try again.'), unavailable: false };
  return { message: error.message, unavailable: false };
}

/** What the reset screen knows about the current code. */
export type ResetAttempts = { sentAt: number; wrongCodes: number };

export type ResetRefusal = {
  message: string;
  /** Wrong codes since the last send, including this one when it counted. */
  wrongCodes: number;
  /** The code can't work any more: Reset waits for a new one. */
  needsNewCode: boolean;
};

/**
 * Explains a refused reset. The server answers every bad code (wrong, expired, used, too many tries,
 * unknown phone) with the same 401, so it never reveals which numbers have accounts; the rules it
 * follows tell the cases apart instead: a code lasts 5 minutes and the 5th wrong try ends it.
 */
export function describeResetRefusal(error: unknown, attempts: ResetAttempts, now: number = Date.now()): ResetRefusal {
  const unchanged = { wrongCodes: attempts.wrongCodes, needsNewCode: false };
  if (!(error instanceof ApiError)) return { ...unchanged, message: t('Unable to reset your password right now. Try again.') };
  if (error.statusCode === 429) return { ...unchanged, message: t('Too many tries. Wait a minute, then try again.') };
  if (error.statusCode !== 401) return { ...unchanged, message: serverMessage(error) };

  if (now - attempts.sentAt >= RESET_CODE_LIFETIME_MS) {
    return { wrongCodes: attempts.wrongCodes, needsNewCode: true, message: t('This code has expired. Request a new one.') };
  }
  const wrongCodes = attempts.wrongCodes + 1;
  if (wrongCodes >= MAX_WRONG_RESET_CODES) {
    return { wrongCodes, needsNewCode: true, message: t('Too many wrong codes. Request a new one.') };
  }
  return {
    wrongCodes,
    needsNewCode: false,
    message: t("That code isn't right. Check the text message and the phone number, then try again."),
  };
}

/** Whole seconds until a new code may be requested; 0 when it may be requested now. */
export function resetResendWaitSeconds(lastRequestAt: number | null, now: number = Date.now()): number {
  if (lastRequestAt === null) return 0;
  return Math.max(0, Math.ceil((lastRequestAt + RESET_RESEND_COOLDOWN_MS - now) / 1000));
}

/** Set when a reset succeeded; the sign-in screen shows it once. Memory only. */
let resetNotice = false;

export function finishPasswordReset(): void {
  resetNotice = true;
}

export function takePasswordResetNotice(): boolean {
  const shown = resetNotice;
  resetNotice = false;
  return shown;
}
