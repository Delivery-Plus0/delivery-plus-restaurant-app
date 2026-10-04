import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, apiGet } from './api';
import { clearSession, getSessionSnapshot, setSession } from './session';

function createAccessToken(): string {
  return [
    Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url'),
    Buffer.from(JSON.stringify({ sub: 'customer-1', email: 'customer@example.com', role: 'CUSTOMER' })).toString('base64url'),
    'signature',
  ].join('.');
}

describe('authenticated gateway requests', () => {
  afterEach(async () => {
    vi.unstubAllGlobals();
    await clearSession();
  });

  it('sends the current session as a Bearer token to the gateway', async () => {
    await setSession(createAccessToken());
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"items":[]}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await apiGet('/api/orders', true);

    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:3000/api/orders');
    expect(new Headers(request.headers).get('Authorization')).toBe(`Bearer ${createAccessToken()}`);
  });

  it('clears the session when the gateway returns 401', async () => {
    await setSession(createAccessToken());
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response('{"statusCode":401,"error":"Unauthorized","message":"Expired token"}', { status: 401 }),
    ));

    await expect(apiGet('/api/orders', true)).rejects.toBeInstanceOf(ApiError);
    expect(getSessionSnapshot().session).toBeNull();
  });
});