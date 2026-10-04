import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearSession, setSession } from '@/services/session';

import { fetchResource, getResource, resetResourceCache, setResourceData } from './resource-cache';

function tokenFor(sub: string): string {
  return [
    Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url'),
    Buffer.from(JSON.stringify({ sub, email: `${sub}@example.com`, role: 'CUSTOMER' })).toString('base64url'),
    'signature',
  ].join('.');
}

describe('resource cache', () => {
  afterEach(async () => {
    resetResourceCache();
    await clearSession();
  });

  it('de-duplicates concurrent requests for the same key', async () => {
    const fetcher = vi.fn().mockResolvedValue(['a']);

    await Promise.all([fetchResource('orders', fetcher), fetchResource('orders', fetcher)]);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(getResource('orders').data).toEqual(['a']);
  });

  it('keeps the last good data when a refresh fails', async () => {
    await fetchResource('orders', () => Promise.resolve(['a']));
    await fetchResource('orders', () => Promise.reject(new Error('offline'))).catch(() => undefined);

    expect(getResource('orders').data).toEqual(['a']);
    expect(getResource('orders').error).toBeInstanceOf(Error);
  });

  it("drops cached data and in-flight responses when the signed-in user changes", async () => {
    await setSession(tokenFor('user-a'));
    setResourceData('orders', ['user-a order']);

    let resolveLate: (value: string[]) => void = () => {};
    const late = fetchResource('cart', () => new Promise<string[]>((resolve) => (resolveLate = resolve)));

    await setSession(tokenFor('user-b'));
    resolveLate(['user-a cart']);
    await late;

    expect(getResource('orders').data).toBeUndefined();
    expect(getResource('cart').data).toBeUndefined();
  });
});
