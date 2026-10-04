import * as SecureStore from 'expo-secure-store';
import { jwtDecode } from 'jwt-decode';
import { useSyncExternalStore } from 'react';

export type SessionUser = {
  sub: string;
  email: string;
  role: string;
};

export type SessionSnapshot = {
  token: string;
  user: SessionUser;
} | null;

export type SessionState = {
  hydrated: boolean;
  session: SessionSnapshot;
};

const SESSION_KEY = 'delivery-plus-access-token';
const listeners = new Set<() => void>();
let hydrated = false;
let session: SessionSnapshot = null;
let snapshot: SessionState = { hydrated: false, session: null };

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

export async function readStoredSessionToken(): Promise<string | null> {
  const storage = getWebStorage();
  if (storage) {
    return storage.getItem(SESSION_KEY);
  }

  try {
    return await SecureStore.getItemAsync(SESSION_KEY);
  } catch {
    return null;
  }
}

export async function writeStoredSessionToken(token: string): Promise<void> {
  const storage = getWebStorage();
  if (storage) {
    storage.setItem(SESSION_KEY, token);
    return;
  }

  try {
    await SecureStore.setItemAsync(SESSION_KEY, token);
    return;
  } catch {
    throw new Error('No session storage available in this runtime.');
  }
}

export async function removeStoredSessionToken(): Promise<void> {
  const storage = getWebStorage();
  if (storage) {
    storage.removeItem(SESSION_KEY);
    return;
  }

  try {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch {
    // no-op in unsupported runtimes
  }
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

function emit() {
  listeners.forEach((listener) => listener());
}

export async function hydrateSession(): Promise<SessionSnapshot> {
  try {
    const token = await readStoredSessionToken();
    if (!token) {
      session = null;
      hydrated = true;
      snapshot = { hydrated, session };
      emit();
      return null;
    }

    const user = decodeJwtSessionUser(token);
    if (!user) {
      await removeStoredSessionToken();
      session = null;
      hydrated = true;
      snapshot = { hydrated, session };
      emit();
      return null;
    }

    session = { token, user };
    hydrated = true;
    snapshot = { hydrated, session };
    emit();
    return session;
  } catch {
    session = null;
    hydrated = true;
    snapshot = { hydrated, session };
    emit();
    return null;
  }
}

export async function setSession(token: string): Promise<SessionSnapshot> {
  const user = decodeJwtSessionUser(token);
  if (!user) {
    throw new Error('Invalid auth token format.');
  }

  await writeStoredSessionToken(token);
  session = { token, user };
  hydrated = true;
  snapshot = { hydrated, session };
  emit();
  return session;
}

export async function clearSession(): Promise<void> {
  await removeStoredSessionToken();
  session = null;
  hydrated = true;
  snapshot = { hydrated, session };
  emit();
}

export function getSessionSnapshot(): SessionState {
  const nextSnapshot: SessionState = { hydrated, session };

  if (snapshot.hydrated === nextSnapshot.hydrated && snapshot.session === nextSnapshot.session) {
    return snapshot;
  }

  snapshot = nextSnapshot;
  return snapshot;
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
