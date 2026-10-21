import { apiPost } from '@/services/api';
import { getLocale } from '@/i18n/core';

/** The email (code included) comes in the app's language (backend #203 reads Accept-Language). */
export function emailLanguageHeaders(): HeadersInit {
  return { 'Accept-Language': getLocale() };
}

/** Sends the 6-digit code back (`token` in the API). Every refusal is the same 401 (see utils/email-verification). */
export async function verifyEmailCode(email: string, code: string): Promise<void> {
  await apiPost<{ message: string }>('/api/auth/verify-email', { email, token: code }, false);
}

/** Asks for a new code. The server answers the same for every address; 429 inside the cooldown. */
export async function resendEmailCode(email: string): Promise<void> {
  await apiPost<{ message: string }>('/api/auth/resend-verification', { email }, false, emailLanguageHeaders());
}
