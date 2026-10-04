import { apiGet, apiPost, type ErrorResponse } from '@/services/api';

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

export type AuthResponse = {
  accessToken: string;
  userId: string;
  email: string;
  role: UserRole;
};

export type JwtUser = {
  sub: string;
  email: string;
  role: UserRole;
};

export type AuthApiError = ErrorResponse;

export async function registerAccount(payload: RegisterRequest): Promise<AuthResponse> {
  return apiPost<AuthResponse>('/api/auth/register', payload, false);
}

export async function loginAccount(payload: LoginRequest): Promise<AuthResponse> {
  return apiPost<AuthResponse>('/api/auth/login', payload, false);
}

export async function fetchCurrentUser(): Promise<JwtUser> {
  return apiGet<JwtUser>('/api/auth/me', true);
}
