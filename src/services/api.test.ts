import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, apiGet, apiPost, refreshSession, signOut } from './api';
import { clearSession, getSessionSnapshot, setSession } from './session';

function createAccessToken(version = 1): string {
  return [
    Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url'),
    Buffer.from(JSON.stringify({ sub: 'customer-1', email: 'customer@example.com', role: 'CUSTOMER', v: version })).toString('base64url'),
    'signature',
  ].join('.');
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

const unauthorized = () => json(401, { statusCode: 401, error: 'Unauthorized', message: 'Expired token' });
const suspended = () => json(403, { statusCode: 403, error: 'AccountSuspended', message: 'This account is suspended.' });

function bearerOf(call: unknown[]): string | null {
  return new Headers((call[1] as RequestInit).headers).get('Authorization');
}

function bodyOf(call: unknown[]): unknown {
  return JSON.parse(String((call[1] as RequestInit).body));
}

/**
 * A fake gateway: `/api/auth/refresh` answers with `refresh()`, every other route accepts only the
 * access token in `valid.token` and answers 401 otherwise.
 */
function gateway(refresh: () => Response | Promise<Response>, valid: { token: string }) {
  return vi.fn(async (url: string, init: RequestInit) => {
    if (url.endsWith('/api/auth/refresh')) return refresh();
    if (url.endsWith('/api/auth/logout')) return new Response(null, { status: 204 });
    return new Headers(init.headers).get('Authorization') === `Bearer ${valid.token}` ? json(200, { items: [] }) : unauthorized();
  });
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

  it('keeps the session on a 401 from a public route (a wrong password at sign-in)', async () => {
    await setSession(createAccessToken(), 'session-1.secret');
    const fetchMock = vi.fn().mockResolvedValue(json(401, { statusCode: 401, error: 'Unauthorized', message: 'Invalid credentials' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiPost('/api/auth/login', { email: 'a@b.c', password: 'x' })).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getSessionSnapshot().session).not.toBeNull();
  });
});

describe('refreshing the session (#34)', () => {
  afterEach(async () => {
    vi.unstubAllGlobals();
    await clearSession();
  });

  it('refreshes once on an expired token, stores the new pair and replays the request with it', async () => {
    await setSession(createAccessToken(1), 'session-1.first');
    const fetchMock = gateway(() => json(200, { accessToken: createAccessToken(2), refreshToken: 'session-1.second' }), { token: createAccessToken(2) });
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiGet('/api/orders', true)).resolves.toEqual({ items: [] });

    const calls = fetchMock.mock.calls;
    expect(calls.map(([url]) => url.replace('http://localhost:3000', ''))).toEqual(['/api/orders', '/api/auth/refresh', '/api/orders']);
    expect(bodyOf(calls[1])).toEqual({ refreshToken: 'session-1.first' });
    expect(bearerOf(calls[2])).toBe(`Bearer ${createAccessToken(2)}`);
    expect(getSessionSnapshot().session).toMatchObject({ token: createAccessToken(2), refreshToken: 'session-1.second' });
    expect(getSessionSnapshot().ended).toBeNull();
  });

  it('shares one refresh between concurrent 401s, so the single-use refresh token is sent exactly once', async () => {
    await setSession(createAccessToken(1), 'session-1.first');
    let release!: () => void;
    const answered = new Promise<void>((resolve) => { release = resolve; });
    const fetchMock = gateway(async () => {
      await answered;
      return json(200, { accessToken: createAccessToken(2), refreshToken: 'session-1.second' });
    }, { token: createAccessToken(2) });
    vi.stubGlobal('fetch', fetchMock);

    const requests = Promise.all([apiGet('/api/orders', true), apiGet('/api/cart', true), apiGet('/api/notifications', true), apiGet('/api/users/me', true), apiGet('/api/addresses', true)]);
    await vi.waitFor(() => expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/api/auth/refresh'))).toHaveLength(1));
    release();

    await expect(requests).resolves.toHaveLength(5);
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/api/auth/refresh'))).toHaveLength(1);
    const replays = fetchMock.mock.calls.slice(-5);
    expect(replays.every((call) => bearerOf(call) === `Bearer ${createAccessToken(2)}`)).toBe(true);
  });

  it('signs out with "expired" when the refresh token is refused', async () => {
    await setSession(createAccessToken(1), 'session-1.first');
    const fetchMock = gateway(() => unauthorized(), { token: createAccessToken(2) });
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiGet('/api/orders', true)).rejects.toMatchObject({ statusCode: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(getSessionSnapshot()).toMatchObject({ session: null, ended: 'expired' });
  });

  it('signs out with "expired" when there is no refresh token to send', async () => {
    await setSession(createAccessToken(1));
    const fetchMock = gateway(() => json(200, {}), { token: createAccessToken(2) });
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiGet('/api/orders', true)).rejects.toMatchObject({ statusCode: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getSessionSnapshot()).toMatchObject({ session: null, ended: 'expired' });
  });

  it('replays only once: a second 401 with the new token ends the session', async () => {
    await setSession(createAccessToken(1), 'session-1.first');
    const fetchMock = gateway(() => json(200, { accessToken: createAccessToken(2), refreshToken: 'session-1.second' }), { token: 'never-accepted' });
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiGet('/api/orders', true)).rejects.toMatchObject({ statusCode: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(getSessionSnapshot()).toMatchObject({ session: null, ended: 'expired' });
  });

  it.each([
    ['the network is down', () => Promise.reject(new TypeError('Failed to fetch'))],
    ['the server is overloaded (429)', () => json(429, { statusCode: 429, error: 'TooManyRequests', message: 'Slow down' })],
    ['the server fails (503)', () => json(503, { statusCode: 503, error: 'ServiceUnavailable', message: 'Down' })],
  ])('keeps the session for the next try when %s', async (_case, refresh) => {
    await setSession(createAccessToken(1), 'session-1.first');
    vi.stubGlobal('fetch', gateway(refresh as () => Promise<Response>, { token: createAccessToken(2) }));

    await expect(apiGet('/api/orders', true)).rejects.toMatchObject({ statusCode: 401 });
    expect(getSessionSnapshot()).toMatchObject({ session: { refreshToken: 'session-1.first' }, ended: null });
  });

  it('does not bring the session back when the user signed out while the refresh was in flight', async () => {
    await setSession(createAccessToken(1), 'session-1.first');
    let release!: () => void;
    const answered = new Promise<void>((resolve) => { release = resolve; });
    vi.stubGlobal('fetch', gateway(async () => {
      await answered;
      return json(200, { accessToken: createAccessToken(2), refreshToken: 'session-1.second' });
    }, { token: createAccessToken(2) }));

    const refreshing = refreshSession();
    await clearSession();
    release();

    await expect(refreshing).resolves.toBe('ended');
    expect(getSessionSnapshot().session).toBeNull();
  });
});

describe('a suspended account (#202)', () => {
  afterEach(async () => {
    vi.unstubAllGlobals();
    await clearSession();
  });

  it('ends the session with "suspended" when a request is refused with 403 AccountSuspended', async () => {
    await setSession(createAccessToken(1), 'session-1.first');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(suspended()));

    await expect(apiGet('/api/orders', true)).rejects.toMatchObject({ statusCode: 403, error: 'AccountSuspended' });
    expect(getSessionSnapshot()).toMatchObject({ session: null, ended: 'suspended' });
  });

  it('ends the session with "suspended" when the refresh is refused with 403 AccountSuspended', async () => {
    await setSession(createAccessToken(1), 'session-1.first');
    vi.stubGlobal('fetch', gateway(() => suspended(), { token: createAccessToken(2) }));

    await expect(apiGet('/api/orders', true)).rejects.toMatchObject({ statusCode: 401 });
    expect(getSessionSnapshot()).toMatchObject({ session: null, ended: 'suspended' });
  });

  it('shows the suspended screen when sign-in is refused with 403 AccountSuspended', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(suspended()));

    await expect(apiPost('/api/auth/login', { email: 'a@b.c', password: 'right' })).rejects.toMatchObject({ error: 'AccountSuspended' });
    expect(getSessionSnapshot()).toMatchObject({ session: null, ended: 'suspended' });
  });

  it('keeps the session on any other 403', async () => {
    await setSession(createAccessToken(1), 'session-1.first');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(403, { statusCode: 403, error: 'Forbidden', message: 'Not yours' })));

    await expect(apiGet('/api/orders/other', true)).rejects.toMatchObject({ statusCode: 403 });
    expect(getSessionSnapshot().session).not.toBeNull();
  });
});

describe('signing out (#34)', () => {
  afterEach(async () => {
    vi.unstubAllGlobals();
    await clearSession();
  });

  it('ends the server session with POST /api/auth/logout, then forgets both tokens', async () => {
    await setSession(createAccessToken(1), 'session-1.first');
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await signOut();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:3000/api/auth/logout');
    expect(init.method).toBe('POST');
    expect(bodyOf(fetchMock.mock.calls[0])).toEqual({ refreshToken: 'session-1.first' });
    expect(getSessionSnapshot()).toMatchObject({ session: null, ended: null });
  });

  it('ends a session that was never stored, e.g. a sign-in with the wrong role for this app', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await signOut('session-9.turned-down');

    expect(bodyOf(fetchMock.mock.calls[0])).toEqual({ refreshToken: 'session-9.turned-down' });
    expect(getSessionSnapshot().session).toBeNull();
  });

  it('still forgets the tokens on this device when offline', async () => {
    await setSession(createAccessToken(1), 'session-1.first');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await signOut();

    expect(getSessionSnapshot().session).toBeNull();
  });
});
