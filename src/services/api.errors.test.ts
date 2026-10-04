import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, NETWORK_ERROR_STATUS, apiGet, apiPost, normalizeApiError } from './api';
import { clearSession, getSessionSnapshot, setSession } from './session';

function createAccessToken(): string {
  return [
    Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url'),
    Buffer.from(JSON.stringify({ sub: 'customer-1', email: 'customer@example.com', role: 'CUSTOMER' })).toString('base64url'),
    'signature',
  ].join('.');
}

describe('normalizeApiError', () => {
  it('joins NestJS validation messages that arrive as an array', () => {
    expect(
      normalizeApiError({ statusCode: 400, error: 'Bad Request', message: ['email must be an email', 'password too short'] }).message,
    ).toBe('email must be an email\npassword too short');
  });

  it('hides raw server error text behind a friendly message for 5xx', () => {
    expect(normalizeApiError({ statusCode: 500, message: 'QueryFailedError: relation missing' }).message).toMatch(
      /having trouble/,
    );
  });
});

describe('request failures', () => {
  afterEach(async () => {
    vi.unstubAllGlobals();
    await clearSession();
  });

  it('turns a network failure into an offline ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network request failed')));

    const error = await apiGet('/api/restaurants').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).statusCode).toBe(NETWORK_ERROR_STATUS);
  });

  it('keeps the session when a public route (login) answers 401', async () => {
    await setSession(createAccessToken());
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('{"statusCode":401,"error":"Unauthorized","message":"Invalid email or password"}', { status: 401 }),
      ),
    );

    await expect(apiPost('/api/auth/login', { email: 'a@b.co', password: 'x' })).rejects.toMatchObject({
      message: 'Invalid email or password',
    });
    expect(getSessionSnapshot().session).not.toBeNull();
  });
});
