import { describe, expect, it } from 'vitest';

import { ApiError, NETWORK_ERROR_STATUS } from '@/services/api';

import { LOCKOUT_ATTEMPTS, describeLoginError } from './login-errors';

const unauthorized = new ApiError(401, 'Unauthorized', 'Invalid email or password');

describe('describeLoginError', () => {
  it('tells the person what to check on a wrong email or password', () => {
    expect(describeLoginError(unauthorized, 1)).toBe(
      'Email or password is incorrect. Check for typos, or create an account if you are new.',
    );
  });

  it('explains the lockout once failures pile up, since the server message stays the same when locked', () => {
    expect(describeLoginError(unauthorized, 2)).not.toContain('paused');
    expect(describeLoginError(unauthorized, 3)).toContain(
      `After ${LOCKOUT_ATTEMPTS} failed attempts in a row, sign-in is paused for 15 minutes.`,
    );
  });

  it('asks the person to wait when the sign-in rate limit is hit', () => {
    expect(describeLoginError(new ApiError(429, 'TooManyRequests', 'Rate limit exceeded'), 6)).toBe(
      'Too many sign-in attempts. Wait a minute, then try again.',
    );
  });

  it('keeps the API client message for network and other errors', () => {
    const offline = new ApiError(NETWORK_ERROR_STATUS, 'NetworkError', 'Cannot reach Delivery Plus. Check your connection.');
    expect(describeLoginError(offline, 1)).toBe('Cannot reach Delivery Plus. Check your connection.');
    expect(describeLoginError(new ApiError(400, 'BadRequest', 'email must be an email'), 1)).toBe('email must be an email');
  });

  it('says the account is suspended when the password was right but an admin suspended it (#202)', () => {
    expect(describeLoginError(new ApiError(403, 'AccountSuspended', 'This account is suspended'), 1)).toBe('This account is suspended.');
  });

  it('falls back to a generic message for unexpected errors', () => {
    expect(describeLoginError(new Error('boom'), 1)).toBe('Unable to sign in right now.');
  });
});
