import { apiGet, apiPatch } from '@/services/api';

export type RestaurantStatus = 'OPEN' | 'CLOSED' | 'BUSY' | 'SUSPENDED';

export type Restaurant = {
  id: string;
  name: string;
  description?: string | null;
  coverImageUrl?: string | null;
  logoUrl?: string | null;
  address: string;
  status: RestaurantStatus;
  createdAt?: string;
  updatedAt?: string;
};

export async function fetchMyRestaurants(): Promise<Restaurant[]> {
  return apiGet<Restaurant[]>('/api/restaurants/me', true);
}

/** Owner-settable statuses only; SUSPENDED is an admin decision (see OWNER_STATUSES). */
export type OwnerRestaurantStatus = Exclude<RestaurantStatus, 'SUSPENDED'>;

/** Opens, pauses (BUSY) or closes the restaurant. Ownership is checked by restaurant-service. */
export async function updateRestaurantStatus(restaurantId: string, status: OwnerRestaurantStatus): Promise<Restaurant> {
  return apiPatch<Restaurant>(`/api/restaurants/${encodeURIComponent(restaurantId)}/status`, { status }, true);
}
