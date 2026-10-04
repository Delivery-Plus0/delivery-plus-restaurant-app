import { apiGet, apiPatch } from '@/services/api';

export type MenuCategory = {
  id: string;
  restaurantId: string;
  name: string;
  displayOrder?: number;
};

export type MenuItem = {
  id: string;
  restaurantId: string;
  categoryId?: string | null;
  name: string;
  description?: string | null;
  price: string | number;
  imageUrl?: string | null;
  available: boolean;
};

export type MenuResponse = {
  restaurantId: string;
  categories: MenuCategory[];
  items: MenuItem[];
};

/** The restaurant's full menu, including sold-out items (public read; the menu service caches it ~60 s). */
export async function fetchMenu(restaurantId: string): Promise<MenuResponse> {
  return apiGet<MenuResponse>(`/api/menus/restaurants/${encodeURIComponent(restaurantId)}/menu`);
}

/** Marks an item available or sold out. Owner role + ownership of the item's restaurant checked by menu-service. */
export async function setMenuItemAvailability(itemId: string, available: boolean): Promise<MenuItem> {
  return apiPatch<MenuItem>(`/api/menus/menu-items/${encodeURIComponent(itemId)}/availability`, { available }, true);
}
