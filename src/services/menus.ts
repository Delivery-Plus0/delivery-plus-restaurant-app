import { apiDelete, apiGet, apiPatch, apiPost } from '@/services/api';
import type { PresignedUpload } from '@/utils/image-upload';

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
  /** Ordered images (#149); the first is mirrored into imageUrl. */
  images?: { id: string; url: string; position: number }[];
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

/** Menu editor (#148). Every write is owner-only and checked against restaurant ownership by menu-service. */
export type MenuItemDraft = { name: string; description?: string; price: number; categoryId?: string | null };

export async function createMenuItem(restaurantId: string, draft: MenuItemDraft): Promise<MenuItem> {
  return apiPost<MenuItem>('/api/menus/menu-items', { restaurantId, ...withoutNullCategory(draft) }, true);
}

export async function updateMenuItem(itemId: string, draft: MenuItemDraft): Promise<MenuItem> {
  return apiPatch<MenuItem>(`/api/menus/menu-items/${encodeURIComponent(itemId)}`, withoutNullCategory(draft), true);
}

/** DELETE archives on the backend: the item leaves the menu but past orders keep it. */
export async function archiveMenuItem(itemId: string): Promise<MenuItem> {
  return apiDelete<MenuItem>(`/api/menus/menu-items/${encodeURIComponent(itemId)}`, true);
}

export async function createCategory(restaurantId: string, name: string, displayOrder: number): Promise<MenuCategory> {
  return apiPost<MenuCategory>('/api/menus/categories', { restaurantId, name, displayOrder }, true);
}

export async function renameCategory(categoryId: string, name: string): Promise<MenuCategory> {
  return apiPatch<MenuCategory>(`/api/menus/categories/${encodeURIComponent(categoryId)}`, { name }, true);
}

/** Only an empty category can be deleted (the backend answers 409 otherwise). */
export async function deleteCategory(categoryId: string): Promise<void> {
  await apiDelete(`/api/menus/categories/${encodeURIComponent(categoryId)}`, true);
}

export async function reorderCategories(restaurantId: string, categoryIds: string[]): Promise<MenuCategory[]> {
  return apiPatch<MenuCategory[]>(`/api/menus/restaurants/${encodeURIComponent(restaurantId)}/categories/order`, { categoryIds }, true);
}

function withoutNullCategory({ categoryId, ...rest }: MenuItemDraft) {
  return categoryId ? { ...rest, categoryId } : rest;
}

/** Item photos (#149): presign, upload straight to storage, confirm; remove by image id. */
export async function createItemImageUploadUrl(itemId: string, contentType: string): Promise<PresignedUpload> {
  return apiPost<PresignedUpload>(`/api/menus/menu-items/${encodeURIComponent(itemId)}/image-upload-url`, { contentType }, true);
}

export async function confirmItemImage(itemId: string, objectKey: string): Promise<MenuItem> {
  return apiPost<MenuItem>(`/api/menus/menu-items/${encodeURIComponent(itemId)}/image-confirm`, { objectKey }, true);
}

export async function removeItemImage(itemId: string, imageId: string): Promise<MenuItem> {
  return apiDelete<MenuItem>(`/api/menus/menu-items/${encodeURIComponent(itemId)}/images/${encodeURIComponent(imageId)}`, true);
}
