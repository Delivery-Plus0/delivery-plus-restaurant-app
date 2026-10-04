import { getSessionSnapshot, subscribeSession } from '@/services/session';

/**
 * Tiny stale-while-revalidate cache shared by every screen.
 *
 * - Revisiting a screen renders the cached data instantly and refreshes in the background.
 * - Concurrent requests for the same key are de-duplicated.
 * - Everything is dropped when the signed-in user changes, and responses from the previous
 *   session are discarded, so one account's orders/cart can never render for another.
 */

export type ResourceEntry<T> = {
  data: T | undefined;
  error: unknown;
  isFetching: boolean;
  updatedAt: number;
};

const EMPTY: ResourceEntry<never> = Object.freeze({
  data: undefined,
  error: undefined,
  isFetching: false,
  updatedAt: 0,
});

const entries = new Map<string, ResourceEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();
const listeners = new Map<string, Set<() => void>>();
let generation = 0;

function write<T>(key: string, next: ResourceEntry<T>) {
  entries.set(key, next);
  listeners.get(key)?.forEach((listener) => listener());
}

export function getResource<T>(key: string): ResourceEntry<T> {
  return (entries.get(key) ?? EMPTY) as ResourceEntry<T>;
}

export function subscribeResource(key: string, listener: () => void): () => void {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(listener);

  return () => {
    set.delete(listener);
    if (set.size === 0) listeners.delete(key);
  };
}

export function fetchResource<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const requestGeneration = generation;
  write(key, { ...getResource<T>(key), isFetching: true });

  const promise = fetcher()
    .then(
      (data) => {
        if (requestGeneration === generation) {
          write<T>(key, { data, error: undefined, isFetching: false, updatedAt: Date.now() });
        }
        return data;
      },
      (error: unknown) => {
        if (requestGeneration === generation) {
          write(key, { ...getResource<T>(key), error, isFetching: false });
        }
        throw error;
      },
    )
    .finally(() => {
      if (inflight.get(key) === promise) inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

/** Local write for optimistic updates or for data a mutation already returned. */
export function setResourceData<T>(key: string, updater: T | ((previous: T | undefined) => T)) {
  const previous = getResource<T>(key);
  const data = typeof updater === 'function' ? (updater as (previous: T | undefined) => T)(previous.data) : updater;
  write<T>(key, { ...previous, data, error: undefined, updatedAt: Date.now() });
}

/** Marks matching entries stale so the next mount/focus refetches them. */
export function invalidateResources(prefix: string) {
  for (const [key, entry] of entries) {
    if (key.startsWith(prefix)) write(key, { ...entry, updatedAt: 0 });
  }
}

export function resetResourceCache() {
  generation += 1;
  inflight.clear();
  const keys = [...entries.keys()];
  entries.clear();
  keys.forEach((key) => listeners.get(key)?.forEach((listener) => listener()));
}

let currentUserId = getSessionSnapshot().session?.user.sub ?? null;
subscribeSession(() => {
  const nextUserId = getSessionSnapshot().session?.user.sub ?? null;
  if (nextUserId !== currentUserId) {
    currentUserId = nextUserId;
    resetResourceCache();
  }
});
