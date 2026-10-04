import { describe, expect, it, vi } from 'vitest';

import type { ResourceEntry } from '@/state/resource-cache';

import { isResourceLoading, resolveResourceData } from './use-resource';

vi.mock('expo-router', () => ({ useFocusEffect: vi.fn() }));

const entry = <T>(overrides: Partial<ResourceEntry<T>>): ResourceEntry<T> => ({
  data: undefined,
  error: undefined,
  isFetching: false,
  updatedAt: 0,
  ...overrides,
});

describe('resolveResourceData', () => {
  it('keeps a loaded null (e.g. "no delivery yet") instead of treating it as missing', () => {
    expect(resolveResourceData(entry<null>({ data: null, updatedAt: 1 }), false, undefined)).toBeNull();
  });

  it('falls back to previous data only when asked and while there is no error', () => {
    expect(resolveResourceData(entry<string>({ isFetching: true }), true, 'old')).toBe('old');
    expect(resolveResourceData(entry<string>({ isFetching: true }), false, 'old')).toBeUndefined();
    expect(resolveResourceData(entry<string>({ error: new Error('x') }), true, 'old')).toBeUndefined();
  });
});

describe('isResourceLoading', () => {
  it('is not loading once a null value has been loaded (regression: delivery card stuck on skeleton)', () => {
    const loaded = entry<null>({ data: null, updatedAt: 1 });
    expect(isResourceLoading('delivery:order:1', loaded, resolveResourceData(loaded, false, undefined))).toBe(false);
  });

  it('is loading before the first response, and not when disabled or failed', () => {
    expect(isResourceLoading('k', entry({ isFetching: true }), undefined)).toBe(true);
    expect(isResourceLoading(null, entry({}), undefined)).toBe(false);
    expect(isResourceLoading('k', entry({ error: new Error('boom') }), undefined)).toBe(false);
  });
});
