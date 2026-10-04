import { apiGet, apiPatch } from '@/services/api';

/** Mirrors user-service `UserProfile` (public fields). */
export type UserProfile = {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  address?: string | null;
  avatarUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

/** Mirrors user-service `UpdateProfileDto`; email is owned by auth-service and not editable here. */
export type UpdateProfileRequest = {
  fullName?: string;
  phone?: string;
  address?: string;
};

export async function fetchMyProfile(): Promise<UserProfile> {
  return apiGet<UserProfile>('/api/users/me', true);
}

export async function updateMyProfile(payload: UpdateProfileRequest): Promise<UserProfile> {
  return apiPatch<UserProfile>('/api/users/me', payload, true);
}
