import * as SecureStore from 'expo-secure-store';
import { jwtDecode } from 'jwt-decode';
import { useSyncExternalStore } from 'react';

/**
 * The signed-in session (#34, shared UI kit). An access token (short-lived JWT, sent as Bearer) and a
 * refresh token (opaque, single use, exchanged for a new pair by `refreshSession` in api.ts).
 *
 * Storage follows the backend's choice in #34: both tokens come back in the response body, so they are
 * kept in `expo-secure-store` on native and in `localStorage` on the web (no httpOnly cookie exists).
 */
export type SessionUser = {
  sub: string;
  email: string;
  role: string;
};

export type SessionSnapshot = {
  token: string;
  refreshToken: string | null;
  user: SessionUser;
} | null;

/** Why the last session ended without the user signing out (#34, #202), until they acknowledge it. */
export type SessionEnded = 'expired' | 'suspended' | null;

export type SessionState = {
  hydrated: boolean;
  session: SessionSnapshot;
  ended: SessionEnded;
};

const SESSION_KEY = 'delivery-plus-access-token';
const REFRESH_KEY = 'delivery-plus-refresh-token';
const listeners = new Set<() => void>();
let hydrated = false;
let session: SessionSnapshot = null;
let ended: SessionEnded = null;
let snapshot: SessionState = { hydrated: false, session: null, ended: null };

function isWebRuntime(): boolean {
  return typeof window !== 'undefined';
}

function getWebStorage(): Storage | null {
  if (!isWebRuntime()) {
    return null;
  }

  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

async function readStored(key: string): Promise<string | null> {
  const storage = getWebStorage();
  if (storage) {
    return storage.getItem(key);
  }

  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function writeStored(key: string, value: string): Promise<void> {
  const storage = getWebStorage();
  if (storage) {
    storage.setItem(key, value);
    return;
  }

  try {
    await SecureStore.setItemAsync(key, value);
    return;
  } catch {
    throw new Error('No session storage available in this runtime.');
  }
}

async function removeStored(key: string): Promise<void> {
  const storage = getWebStorage();
  if (storage) {
    storage.removeItem(key);
    return;
  }

  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // no-op in unsupported runtimes
  }
}

export function readStoredSessionToken(): Promise<string | null> {
  return readStored(SESSION_KEY);
}

export function writeStoredSessionToken(token: string): Promise<void> {
  return writeStored(SESSION_KEY, token);
}

export function removeStoredSessionToken(): Promise<void> {
  return removeStored(SESSION_KEY);
}

export function decodeJwtSessionUser(token: string): SessionUser | null {
  try {
    const decoded = jwtDecode<Record<string, unknown>>(token);
    const sub = typeof decoded.sub === 'string' ? decoded.sub : String(decoded.sub ?? '');
    const email = typeof decoded.email === 'string' ? decoded.email : '';
    const role = typeof decoded.role === 'string' ? decoded.role : 'CUSTOMER';

    if (!sub || !email) {
      return null;
    }

    return { sub, email, role };
  } catch {
    return null;
  }
}

function publish() {
  snapshot = { hydrated, session, ended };
  listeners.forEach((listener) => listener());
}

export async function hydrateSession(): Promise<SessionSnapshot> {
  try {
    const token = await readStored(SESSION_KEY);
    const user = token ? decodeJwtSessionUser(token) : null;
    if (!token || !user) {
      if (token) await removeStored(SESSION_KEY);
      session = null;
    } else {
      session = { token, refreshToken: await readStored(REFRESH_KEY), user };
    }
  } catch {
    session = null;
  }
  hydrated = true;
  publish();
  return session;
}

/** Signs in with the pair from login, register or refresh. The refresh token is optional for callers that have none. */
export async function setSession(token: string, refreshToken: string | null = null): Promise<SessionSnapshot> {
  const user = decodeJwtSessionUser(token);
  if (!user) {
    throw new Error('Invalid auth token format.');
  }

  await writeStored(SESSION_KEY, token);
  if (refreshToken) await writeStored(REFRESH_KEY, refreshToken);
  else await removeStored(REFRESH_KEY);
  session = { token, refreshToken, user };
  ended = null;
  hydrated = true;
  publish();
  return session;
}

/**
 * Ends the session. `reason` says why when the user didn't sign out themselves: the refresh failed
 * (`expired`) or the account is suspended (`suspended`); the screens show it until `acknowledgeSessionEnded`.
 */
export async function clearSession(reason: SessionEnded = null): Promise<void> {
  await removeStored(SESSION_KEY);
  await removeStored(REFRESH_KEY);
  session = null;
  ended = reason;
  hydrated = true;
  publish();
}

/** The user has seen why the session ended. */
export function acknowledgeSessionEnded(): void {
  if (ended === null) return;
  ended = null;
  publish();
}

export function getSessionSnapshot(): SessionState {
  return snapshot.hydrated === hydrated && snapshot.session === session && snapshot.ended === ended ? snapshot : (snapshot = { hydrated, session, ended });
}

export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useAuthSession() {
  return useSyncExternalStore(subscribeSession, getSessionSnapshot, getSessionSnapshot);
}

export function isAuthenticated() {
  return Boolean(session?.token);
}
