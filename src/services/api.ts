import { API_BASE_URL } from '@/config/api';
import { clearSession, getSessionSnapshot } from '@/services/session';
import { t } from '@/i18n/core';

export type ErrorResponse = {
  statusCode: number;
  error: string;
  message: string;
  timestamp?: string;
  path?: string;
  correlationId?: string;
};

export class ApiError extends Error {
  statusCode: number;
  error: string;
  response?: ErrorResponse;

  constructor(statusCode: number, error: string, message: string, response?: ErrorResponse) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.error = error;
    this.response = response;
  }
}

/** Status code used for failures that never reached the gateway (offline, DNS, timeout). */
export const NETWORK_ERROR_STATUS = 0;

const REQUEST_TIMEOUT_MS = 15_000;
const GENERIC_MESSAGE = 'Something went wrong. Please try again.';
const SERVER_ERROR_MESSAGE = 'Delivery Plus is having trouble right now. Please try again shortly.';

function readMessage(message: unknown): string | null {
  // NestJS ValidationPipe returns `message: string[]`.
  if (Array.isArray(message)) {
    const parts = message.filter((part): part is string => typeof part === 'string' && part.trim().length > 0);
    return parts.length > 0 ? parts.join('\n') : null;
  }

  return typeof message === 'string' && message.trim().length > 0 ? message : null;
}

export function normalizeApiError(payload: unknown): ErrorResponse {
  const record = (payload ?? {}) as Partial<Record<keyof ErrorResponse, unknown>>;
  const statusCode = typeof record.statusCode === 'number' ? record.statusCode : 500;
  const message = statusCode >= 500 ? t(SERVER_ERROR_MESSAGE) : readMessage(record.message) ?? t(GENERIC_MESSAGE);

  return {
    statusCode,
    error: typeof record.error === 'string' ? record.error : 'Error',
    message,
    timestamp: typeof record.timestamp === 'string' ? record.timestamp : new Date().toISOString(),
    path: typeof record.path === 'string' ? record.path : '/api',
    correlationId: typeof record.correlationId === 'string' ? record.correlationId : undefined,
  };
}

const buildUrl = (path: string) => `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

async function parseJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function send(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch {
    const timedOut = controller.signal.aborted;
    throw new ApiError(
      NETWORK_ERROR_STATUS,
      timedOut ? 'Timeout' : 'NetworkError',
      timedOut
        ? t('The request took too long. Check your connection and try again.')
        : t("Can't reach Delivery Plus. Check your connection and try again."),
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function request<T>(path: string, options: RequestInit = {}, authRequired = false): Promise<T> {
  const headers = new Headers(options.headers ?? {});
  headers.set('Accept', 'application/json');

  if (authRequired) {
    const token = getSessionSnapshot().session?.token;
    if (!token) {
      throw new ApiError(401, 'Unauthorized', t('Please sign in again.'));
    }
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await send(buildUrl(path), { ...options, headers });
  const payload = await parseJson<unknown>(response);

  if (!response.ok) {
    const normalized = normalizeApiError(
      payload ?? { statusCode: response.status, error: response.statusText, message: response.statusText },
    );

    // A 401 on a public route (e.g. wrong password at login) says nothing about the stored session.
    if (response.status === 401 && authRequired) {
      await clearSession();
    }

    throw new ApiError(response.status, normalized.error, normalized.message, normalized);
  }

  return (payload as T) ?? (undefined as T);
}

export async function apiGet<T>(path: string, authRequired = false): Promise<T> {
  return request<T>(path, { method: 'GET' }, authRequired);
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  authRequired = false,
  headers?: HeadersInit,
): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
    headers,
  }, authRequired);
}

export async function apiPatch<T>(path: string, body: unknown, authRequired = false): Promise<T> {
  return request<T>(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
  }, authRequired);
}

export async function apiDelete<T = void>(path: string, authRequired = false): Promise<T> {
  return request<T>(path, { method: 'DELETE' }, authRequired);
}
