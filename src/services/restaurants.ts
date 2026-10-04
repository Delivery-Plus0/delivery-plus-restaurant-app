import { apiGet } from '@/services/api';

export type RestaurantStatus = 'OPEN' | 'CLOSED' | 'BUSY' | 'SUSPENDED';

export type Restaurant = {
  id: string;
  ownerId: string;
  name: string;
  description?: string | null;
  coverImageUrl?: string | null;
  logoUrl?: string | null;
  address: string;
  status: RestaurantStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type RestaurantListResponse = {
  items: Restaurant[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

/** Mirrors restaurant-service `ListRestaurantsQueryDto`. */
export type RestaurantListQuery = {
  page?: number;
  limit?: number;
  status?: RestaurantStatus;
  search?: string;
  sortBy?: 'name' | 'createdAt';
  sortOrder?: 'ASC' | 'DESC';
};

export function buildRestaurantQuery({ page = 1, limit = 20, status, search, sortBy, sortOrder }: RestaurantListQuery = {}): string {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set('status', status);
  if (search?.trim()) params.set('search', search.trim());
  if (sortBy) params.set('sortBy', sortBy);
  if (sortOrder) params.set('sortOrder', sortOrder);
  return params.toString();
}

export async function fetchRestaurants(query: RestaurantListQuery = {}): Promise<RestaurantListResponse> {
  return apiGet<RestaurantListResponse>(`/api/restaurants?${buildRestaurantQuery(query)}`);
}

export async function fetchRestaurantById(id: string): Promise<Restaurant> {
  return apiGet<Restaurant>(`/api/restaurants/${id}`);
}
