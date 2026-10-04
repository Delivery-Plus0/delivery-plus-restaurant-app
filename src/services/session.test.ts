import { describe, expect, it } from 'vitest';

import { normalizeApiError } from './api';
import { decodeJwtSessionUser, getSessionSnapshot } from './session';

describe('decodeJwtSessionUser', () => {
  it('reads the JWT payload into the app session user', () => {
    const token = [
      Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url'),
      Buffer.from(
        JSON.stringify({ sub: 'user-123', email: 'customer@example.com', role: 'CUSTOMER' }),
      ).toString('base64url'),
      'signature',
    ].join('.');

    expect(decodeJwtSessionUser(token)).toEqual({
      sub: 'user-123',
      email: 'customer@example.com',
      role: 'CUSTOMER',
    });
  });
});

describe('getSessionSnapshot', () => {
  it('returns a stable snapshot object for repeated reads', () => {
    const first = getSessionSnapshot();
    const second = getSessionSnapshot();

    expect(first).toBe(second);
  });
});

describe('normalizeApiError', () => {
  it('keeps the backend-provided message for auth failures', () => {
    expect(
      normalizeApiError({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid email or password',
        path: '/api/auth/login',
      }),
    ).toMatchObject({
      statusCode: 401,
      message: 'Invalid email or password',
      error: 'Unauthorized',
    });
  });
});

describe('web session storage fallback', () => {
  it('stores and reads the token from localStorage when running in the browser', async () => {
    const key = 'delivery-plus-access-token';
    const value = 'browser-token';
    const storage = new Map<string, string>();

    Object.defineProperty(globalThis, 'window', {
      value: {
        localStorage: {
          getItem: (name: string) => storage.get(name) ?? null,
          setItem: (name: string, nextValue: string) => {
            storage.set(name, nextValue);
          },
          removeItem: (name: string) => {
            storage.delete(name);
          },
        },
      },
      configurable: true,
    });

    const { writeStoredSessionToken, readStoredSessionToken } = await import('./session');

    await writeStoredSessionToken(value);
    expect(await readStoredSessionToken()).toBe(value);
    expect(storage.get(key)).toBe(value);

    Reflect.deleteProperty(globalThis, 'window');
  });
});
