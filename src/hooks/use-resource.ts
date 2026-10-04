import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { fetchResource, getResource, subscribeResource, type ResourceEntry } from '@/state/resource-cache';

type UseResourceOptions<T> = {
  /** Skip the background refetch on focus if the cached data is younger than this. */
  staleTimeMs?: number;
  /**
   * Poll while the screen is focused (e.g. an active order). Disabled when unset/0.
   * Pass a function to decide from the current data, e.g. stop once an order is delivered.
   */
  pollIntervalMs?: number | ((data: T | undefined) => number);
  /** While a new key loads, keep showing the previous key's data (e.g. search results). */
  keepPreviousData?: boolean;
};

/**
 * `undefined` means "not loaded"; `null` is a real value (e.g. "no delivery yet"), so this must
 * not use `??`, which would treat a loaded `null` as missing and leave the screen loading forever.
 */
export function resolveResourceData<T>(entry: ResourceEntry<T>, keepPreviousData: boolean, previousData: T | undefined) {
  if (entry.data !== undefined) return entry.data;
  return keepPreviousData && entry.error === undefined ? previousData : undefined;
}

export function isResourceLoading<T>(key: string | null, entry: ResourceEntry<T>, data: T | undefined): boolean {
  return key !== null && data === undefined && (entry.isFetching || entry.error === undefined);
}

const noopUnsubscribe = () => {};
const idleEntry: ResourceEntry<never> = getResource('__idle__');

/**
 * Screen-level data hook backed by the shared resource cache.
 * Pass `key = null` to disable fetching (e.g. while a route param is missing).
 */
export function useResource<T>(key: string | null, fetcher: () => Promise<T>, options: UseResourceOptions<T> = {}) {
  const { staleTimeMs = 10_000, pollIntervalMs: poll = 0, keepPreviousData = false } = options;

  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const subscribe = useCallback(
    (listener: () => void) => (key ? subscribeResource(key, listener) : noopUnsubscribe),
    [key],
  );
  const getSnapshot = () => (key ? getResource<T>(key) : (idleEntry as ResourceEntry<T>));
  const entry = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const pollIntervalMs = typeof poll === 'function' ? poll(entry.data) : poll;

  const revalidate = useCallback(async () => {
    if (!key) return;
    try {
      await fetchResource(key, () => fetcherRef.current());
    } catch {
      // The error is stored on the cache entry and rendered by the screen.
    }
  }, [key]);

  useFocusEffect(
    useCallback(() => {
      if (!key) return undefined;

      const { updatedAt } = getResource(key);
      if (Date.now() - updatedAt > staleTimeMs) {
        void revalidate();
      }

      if (!pollIntervalMs) return undefined;
      const timer = setInterval(() => void revalidate(), pollIntervalMs);
      return () => clearInterval(timer);
    }, [key, pollIntervalMs, revalidate, staleTimeMs]),
  );

  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(async () => {
    setRefreshing(true);
    await revalidate();
    setRefreshing(false);
  }, [revalidate]);

  // "Adjust state while rendering" pattern: remember the last data we actually had.
  const [previousData, setPreviousData] = useState(entry.data);
  if (entry.data !== undefined && entry.data !== previousData) {
    setPreviousData(entry.data);
  }

  const data = resolveResourceData(entry, keepPreviousData, previousData);

  return {
    data,
    error: entry.error,
    /** First load with nothing cached yet — show a skeleton. */
    isLoading: isResourceLoading(key, entry, data),
    isFetching: entry.isFetching,
    refreshing,
    refresh,
    revalidate,
  };
}
