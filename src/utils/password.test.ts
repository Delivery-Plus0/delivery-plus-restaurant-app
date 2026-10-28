import { describe, expect, it } from 'vitest';

import { ApiError, NETWORK_ERROR_STATUS } from '@/services/api';

import {
  MAX_WRONG_RESET_CODES,
  MIN_PASSWORD_LENGTH,
  RESET_CODE_LIFETIME_MS,
  cleanResetCode,
  confirmPasswordError,
  describeChangeRefusal,
  describeForgotRefusal,
  describeResetRefusal,
  finishPasswordReset,
  isCompleteResetCode,
  newPasswordError,
  resetResendWaitSeconds,
  takePasswordResetNotice,
} from './password';

const SENT = Date.parse('2026-10-28T10:00:00Z');
const after = (ms: number) => SENT + ms;
const badCode = new ApiError(401, 'Unauthorized', 'Invalid or expired code');

describe('a new password', () => {
  it('follows the registration policy: 8 characters at least', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
    expect(newPasswordError('')).toBe('Enter a new password');
    expect(newPasswordError('1234567')).toBe('Use at least 8 characters');
    expect(newPasswordError('12345678')).toBeUndefined();
  });

  it('must be typed the same twice', () => {
    expect(confirmPasswordError('newpassword', '')).toBe('Enter the new password again');
    expect(confirmPasswordError('newpassword', 'newpasswore')).toBe("The passwords don't match");
    expect(confirmPasswordError('newpassword', 'newpassword')).toBeUndefined();
  });
});

describe('a refused change', () => {
  it('says the current password is wrong for 400 CurrentPasswordIncorrect (never a 401, which would end the session)', () => {
    const refused = new ApiError(400, 'CurrentPasswordIncorrect', 'Current password is incorrect');
    expect(describeChangeRefusal(refused)).toBe('Your current password is wrong. Too many wrong tries lock the account for a while.');
  });

  it('translates the unchanged-password and length refusals, and passes other messages through', () => {
    expect(describeChangeRefusal(new ApiError(400, 'BadRequest', 'New password must differ from the current one'))).toBe(
      'Choose a password different from your current one.',
    );
    expect(describeChangeRefusal(new ApiError(400, 'BadRequest', 'Password must be at least 8 characters'))).toBe('Use at least 8 characters');
    expect(describeChangeRefusal(new ApiError(429, 'TooManyRequests', 'Too many requests'))).toBe('Too many tries. Wait a minute, then try again.');
    expect(describeChangeRefusal(new ApiError(NETWORK_ERROR_STATUS, 'NetworkError', "Can't reach Delivery Plus."))).toBe("Can't reach Delivery Plus.");
    expect(describeChangeRefusal(new Error('boom'))).toBe('Unable to change your password right now. Try again.');
  });
});

describe('asking for a reset code', () => {
  it('stops the flow when SMS is not set up on the server', () => {
    const refusal = describeForgotRefusal(new ApiError(503, 'SmsUnavailable', 'Phone verification is not available yet.'));
    expect(refusal).toEqual({ message: "Resetting a password by text message isn't available yet. Try again later.", unavailable: true });
  });

  it('explains the limits and keeps other failures retryable', () => {
    expect(describeForgotRefusal(new ApiError(429, 'TooManyRequests', 'Too many requests.'))).toEqual({
      message: 'Too many requests. Wait a while, then try again.',
      unavailable: false,
    });
    // Any other 5xx is a passing problem, not "SMS is off".
    expect(describeForgotRefusal(new ApiError(503, 'ServiceUnavailable', 'Try again shortly.')).unavailable).toBe(false);
    expect(describeForgotRefusal(new Error('boom'))).toEqual({ message: 'Unable to send a code right now. Try again.', unavailable: false });
  });
});

describe('the reset code', () => {
  it('is six digits; spaces from pasting are ignored', () => {
    expect(cleanResetCode(' 123 456 ')).toBe('123456');
    expect(isCompleteResetCode('123 456')).toBe(true);
    expect(isCompleteResetCode('12345')).toBe(false);
    expect(isCompleteResetCode('12345a')).toBe(false);
  });

  it('is wrong while fresh, and counts the attempt', () => {
    expect(describeResetRefusal(badCode, { sentAt: SENT, wrongCodes: 0 }, after(60_000))).toEqual({
      wrongCodes: 1,
      needsNewCode: false,
      message: "That code isn't right. Check the text message and the phone number, then try again.",
    });
  });

  it('has expired after 5 minutes, without counting the attempt', () => {
    expect(describeResetRefusal(badCode, { sentAt: SENT, wrongCodes: 2 }, after(RESET_CODE_LIFETIME_MS))).toEqual({
      wrongCodes: 2,
      needsNewCode: true,
      message: 'This code has expired. Request a new one.',
    });
  });

  it('is used up by the 5th wrong try', () => {
    expect(describeResetRefusal(badCode, { sentAt: SENT, wrongCodes: MAX_WRONG_RESET_CODES - 1 }, after(1_000))).toEqual({
      wrongCodes: MAX_WRONG_RESET_CODES,
      needsNewCode: true,
      message: 'Too many wrong codes. Request a new one.',
    });
  });

  it('keeps the count for refusals that are not about the code', () => {
    const attempts = { sentAt: SENT, wrongCodes: 1 };
    expect(describeResetRefusal(new ApiError(429, 'TooManyRequests', 'x'), attempts, after(1_000))).toEqual({
      wrongCodes: 1,
      needsNewCode: false,
      message: 'Too many tries. Wait a minute, then try again.',
    });
    expect(describeResetRefusal(new ApiError(400, 'BadRequest', 'Password must be at least 8 characters'), attempts, after(1_000)).message).toBe(
      'Use at least 8 characters',
    );
    expect(describeResetRefusal(new Error('offline'), attempts, after(1_000)).message).toBe('Unable to reset your password right now. Try again.');
  });

  it('can be sent again 60 s after the last request', () => {
    expect(resetResendWaitSeconds(null, SENT)).toBe(0);
    expect(resetResendWaitSeconds(SENT, after(1))).toBe(60);
    expect(resetResendWaitSeconds(SENT, after(59_001))).toBe(1);
    expect(resetResendWaitSeconds(SENT, after(60_000))).toBe(0);
  });
});

describe('after a reset', () => {
  it('tells the sign-in screen once', () => {
    expect(takePasswordResetNotice()).toBe(false);
    finishPasswordReset();
    expect(takePasswordResetNotice()).toBe(true);
    expect(takePasswordResetNotice()).toBe(false);
  });
});
