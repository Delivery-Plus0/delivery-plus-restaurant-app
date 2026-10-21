import { beforeEach, describe, expect, it } from 'vitest';

import { ApiError, NETWORK_ERROR_STATUS } from '@/services/api';

import {
  CODE_LIFETIME_MS,
  MAX_WRONG_CODES,
  cleanEmailCode,
  describeCodeRefusal,
  describeResendRefusal,
  finishEmailVerification,
  isCompleteEmailCode,
  isEmailNotVerified,
  pendingEmailVerification,
  resendWaitSeconds,
  startEmailVerification,
  takeVerifiedEmail,
} from './email-verification';

const refused = new ApiError(401, 'Unauthorized', 'Invalid or expired verification code');
const SENT = Date.parse('2026-10-22T10:00:00Z');
const after = (ms: number) => SENT + ms;

describe('sign-in refused for an unverified email (#252)', () => {
  it('recognises 403 EmailNotVerified, and nothing else', () => {
    expect(isEmailNotVerified(new ApiError(403, 'EmailNotVerified', 'Please verify your email before logging in'))).toBe(true);
    expect(isEmailNotVerified(new ApiError(403, 'AccountSuspended', 'This account is suspended.'))).toBe(false);
    expect(isEmailNotVerified(new ApiError(401, 'Unauthorized', 'Invalid email or password'))).toBe(false);
    expect(isEmailNotVerified(new Error('EmailNotVerified'))).toBe(false);
  });
});

describe('the code', () => {
  it('is six digits; spaces from pasting are ignored', () => {
    expect(cleanEmailCode(' 123 456 ')).toBe('123456');
    expect(isCompleteEmailCode('123 456')).toBe(true);
    expect(isCompleteEmailCode('12345')).toBe(false);
    expect(isCompleteEmailCode('12345a')).toBe(false);
  });
});

describe('a refused code (one 401 for every case, told apart by the rules)', () => {
  it('is wrong while the code is fresh, and counts the attempt', () => {
    const refusal = describeCodeRefusal(refused, { sentAt: SENT, wrongCodes: 0 }, after(60_000));

    expect(refusal).toEqual({ wrongCodes: 1, needsNewCode: false, message: "That code isn't right. Check the email and try again." });
  });

  it('has expired once the lifetime is over, without counting the attempt', () => {
    const refusal = describeCodeRefusal(refused, { sentAt: SENT, wrongCodes: 2 }, after(CODE_LIFETIME_MS));

    expect(refusal).toEqual({ wrongCodes: 2, needsNewCode: true, message: 'This code has expired. Request a new one.' });
  });

  it('is still wrong a second before the lifetime ends', () => {
    expect(describeCodeRefusal(refused, { sentAt: SENT, wrongCodes: 0 }, after(CODE_LIFETIME_MS - 1_000)).needsNewCode).toBe(false);
  });

  it('needs a new code after the last allowed wrong attempt', () => {
    const fourth = describeCodeRefusal(refused, { sentAt: SENT, wrongCodes: MAX_WRONG_CODES - 2 }, after(1_000));
    const fifth = describeCodeRefusal(refused, { sentAt: SENT, wrongCodes: MAX_WRONG_CODES - 1 }, after(1_000));

    expect(fourth.needsNewCode).toBe(false);
    expect(fifth).toEqual({ wrongCodes: MAX_WRONG_CODES, needsNewCode: true, message: 'Too many wrong codes. Request a new one.' });
  });

  it('says wrong or expired when the app does not know when the code was sent (a refused sign-in)', () => {
    const refusal = describeCodeRefusal(refused, { sentAt: null, wrongCodes: 0 }, after(CODE_LIFETIME_MS * 3));

    expect(refusal.message).toBe("That code is wrong or has expired. Request a new one if it's been more than 10 minutes.");
    expect(refusal.wrongCodes).toBe(1);
    expect(describeCodeRefusal(refused, { sentAt: null, wrongCodes: MAX_WRONG_CODES - 1 }).needsNewCode).toBe(true);
  });

  it('asks to wait on the rate limit, without counting', () => {
    expect(describeCodeRefusal(new ApiError(429, 'TooManyRequests', 'Rate limit exceeded'), { sentAt: SENT, wrongCodes: 1 })).toEqual({
      wrongCodes: 1,
      needsNewCode: false,
      message: 'Too many tries. Wait a minute, then try again.',
    });
  });

  it('keeps the API client message when offline, without counting', () => {
    const offline = new ApiError(NETWORK_ERROR_STATUS, 'NetworkError', "Can't reach Delivery Plus. Check your connection and try again.");

    expect(describeCodeRefusal(offline, { sentAt: SENT, wrongCodes: 1 })).toEqual({ wrongCodes: 1, needsNewCode: false, message: offline.message });
    expect(describeCodeRefusal(new Error('boom'), { sentAt: SENT, wrongCodes: 0 }).message).toBe('Unable to verify right now. Try again.');
  });
});

describe('asking for a new code', () => {
  it('waits out the 60-second cooldown from the last request', () => {
    expect(resendWaitSeconds(null)).toBe(0);
    expect(resendWaitSeconds(SENT, after(0))).toBe(60);
    expect(resendWaitSeconds(SENT, after(18_500))).toBe(42);
    expect(resendWaitSeconds(SENT, after(60_000))).toBe(0);
  });

  it('restarts the cooldown on 429 and explains email being unavailable', () => {
    expect(describeResendRefusal(new ApiError(429, 'TooManyRequests', 'Please wait a minute before asking for another code.'))).toEqual({
      message: 'Wait a minute before asking for another code.',
      restartCooldown: true,
    });
    expect(describeResendRefusal(new ApiError(503, 'EmailUnavailable', 'Email verification is not available yet.'))).toEqual({
      message: "Email isn't available right now. Try again later.",
      restartCooldown: false,
    });
    expect(describeResendRefusal(new Error('boom')).restartCooldown).toBe(false);
  });
});

describe('the pending verification (memory only)', () => {
  beforeEach(() => {
    finishEmailVerification();
    takeVerifiedEmail();
  });

  it('remembers the email until the code is accepted, then hands it to sign-in once', () => {
    startEmailVerification('new@example.com', SENT);
    expect(pendingEmailVerification()).toEqual({ email: 'new@example.com', sentAt: SENT });

    finishEmailVerification();

    expect(pendingEmailVerification()).toBeNull();
    expect(takeVerifiedEmail()).toBe('new@example.com');
    expect(takeVerifiedEmail()).toBeNull();
  });
});
