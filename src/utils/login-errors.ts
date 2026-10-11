import { ApiError } from '@/services/api';
import { t } from '@/i18n/core';

/** auth-service locks an account after this many failed sign-ins in a row (MAX_FAILED_LOGIN_ATTEMPTS). */
export const LOCKOUT_ATTEMPTS = 5;
/** From this many failures on, also explain the lockout (the server's 401 is deliberately generic). */
const LOCKOUT_HINT_AFTER = 3;

/**
 * Turns a failed sign-in into a message the person can act on.
 *
 * The server answers "Invalid email or password" for an unknown email, a wrong password and a locked
 * account alike, so it doesn't reveal which accounts exist. The app can't tell them apart either; it
 * can only say what to check and, after repeated failures, that a lock may be the reason.
 */
export function describeLoginError(error: unknown, consecutiveFailures: number): string {
  if (!(error instanceof ApiError)) return t('Unable to sign in right now.');

  if (error.statusCode === 401) {
    const base = t('Email or password is incorrect. Check for typos, or create an account if you are new.');
    return consecutiveFailures >= LOCKOUT_HINT_AFTER
      ? `${base} After ${LOCKOUT_ATTEMPTS} failed attempts in a row, sign-in is paused for 15 minutes.`
      : base;
  }
  if (error.statusCode === 429) return t('Too many sign-in attempts. Wait a minute, then try again.');
  // Network failures and everything else already carry a readable message from the API client.
  return error.message;
}
