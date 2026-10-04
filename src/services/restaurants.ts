import { apiGet } from '@/services/api';

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
