import { apiDelete, apiGet, apiPatch, apiPost } from '@/services/api';

export type CartItem = {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
};

export type Cart = {
  userId: string;
  restaurantId: string | null;
  items: CartItem[];
  updatedAt: string;
  /** Server-computed subtotal (cart-service `CartWithTotal`). */
  total: number;
};

export async function fetchCart(): Promise<Cart> {
  return apiGet<Cart>('/api/cart', true);
}

export async function addCartItem(payload: { menuItemId: string; quantity: number }): Promise<Cart> {
  return apiPost<Cart>('/api/cart/items', payload, true);
}

export async function updateCartItem(menuItemId: string, quantity: number): Promise<Cart> {
  return apiPatch<Cart>(`/api/cart/items/${menuItemId}`, { quantity }, true);
}

export async function removeCartItem(menuItemId: string): Promise<Cart> {
  return apiDelete<Cart>(`/api/cart/items/${menuItemId}`, true);
}

export async function clearCart(): Promise<void> {
  await apiDelete('/api/cart', true);
}
