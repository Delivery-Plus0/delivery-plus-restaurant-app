import { apiGet } from '@/services/api';

export type MenuCategory = {
  id: string;
  restaurantId: string;
  name: string;
  displayOrder?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type MenuItem = {
  id: string;
  restaurantId: string;
  categoryId?: string;
  name: string;
  description?: string;
  price: string | number;
  imageUrl?: string;
  available: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type MenuResponse = {
  restaurantId: string;
  categories: MenuCategory[];
  items: MenuItem[];
};

export async function fetchMenuForRestaurant(restaurantId: string): Promise<MenuResponse> {
  return apiGet<MenuResponse>(`/api/menus/restaurants/${restaurantId}/menu`);
}

export async function fetchMenuItem(menuItemId: string): Promise<MenuItem> {
  return apiGet<MenuItem>(`/api/menus/menu-items/${menuItemId}`);
}
