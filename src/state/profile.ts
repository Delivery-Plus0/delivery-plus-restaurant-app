import { useResource } from '@/hooks/use-resource';
import { fetchMyProfile, updateMyProfile, type UpdateProfileRequest, type UserProfile } from '@/services/users';
import { setResourceData } from '@/state/resource-cache';

export const PROFILE_KEY = 'profile';

export function useProfile() {
  return useResource<UserProfile>(PROFILE_KEY, fetchMyProfile, { staleTimeMs: 60_000 });
}

export async function saveProfile(changes: UpdateProfileRequest): Promise<UserProfile> {
  const profile = await updateMyProfile(changes);
  setResourceData<UserProfile>(PROFILE_KEY, profile);
  return profile;
}
