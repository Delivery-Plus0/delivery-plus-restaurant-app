import { apiGet, apiPost, type ErrorResponse } from '@/services/api';
import { emailLanguageHeaders } from '@/services/email-verification';

export type UserRole = 'CUSTOMER' | 'RESTAURANT_OWNER' | 'DRIVER' | 'ADMIN';

export type RegisterRequest = {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role?: UserRole;
};

export type LoginRequest = {
  email: string;
  password: string;
};

/** Login, and register while email verification is off: a signed-in session (#34). */
export type AuthResponse = {
  accessToken: string;
  /** Single use: exchanged for a new pair by `refreshSession` (api.ts). */
  refreshToken: string;
  userId: string;
  email: string;
  role: UserRole;
};

/** Register while email verification is required (#203): no tokens until the email is verified. */
export type VerificationPendingResponse = {
  userId: string;
  verificationRequired: true;
};

export type JwtUser = {
  sub: string;
  email: string;
  role: UserRole;
};

export type AuthApiError = ErrorResponse;

export async function registerAccount(payload: RegisterRequest): Promise<AuthResponse | VerificationPendingResponse> {
  // The verification email, when one is sent, comes in the app's language.
  return apiPost<AuthResponse | VerificationPendingResponse>('/api/auth/register', payload, false, emailLanguageHeaders());
}

export async function loginAccount(payload: LoginRequest): Promise<AuthResponse> {
  return apiPost<AuthResponse>('/api/auth/login', payload, false);
}

export async function fetchCurrentUser(): Promise<JwtUser> {
  return apiGet<JwtUser>('/api/auth/me', true);
}
