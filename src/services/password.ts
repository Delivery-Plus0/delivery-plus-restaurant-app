import { apiPost } from '@/services/api';

/**
 * Password change and reset (backend #35). A change keeps this session and ends every other one; a
 * reset ends every session. A wrong current password is `400 CurrentPasswordIncorrect` (see utils/password).
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiPost<void>('/api/auth/password/change', { currentPassword, newPassword }, true);
}

/** Texts a reset code to the account whose verified phone this is. Same answer for unknown phones; 503 SmsUnavailable when SMS is off. */
export async function requestPasswordReset(phone: string): Promise<void> {
  await apiPost<{ message: string }>('/api/auth/password/forgot', { phone }, false);
}

/** Sets a new password with the texted code. Every bad code is the same 401. */
export async function resetPassword(phone: string, code: string, newPassword: string): Promise<void> {
  await apiPost<void>('/api/auth/password/reset', { phone, code, newPassword }, false);
}
