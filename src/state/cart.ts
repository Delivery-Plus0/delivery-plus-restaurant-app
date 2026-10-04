import { useResource } from '@/hooks/use-resource';
import { ApiError } from '@/services/api';
import { addCartItem, clearCart, fetchCart, removeCartItem, updateCartItem, type Cart } from '@/services/cart';
import { fetchResource, getResource, setResourceData } from '@/state/resource-cache';

export const CART_KEY = 'cart';

/** Each mutation bumps this; only the newest mutation may write its server response. */
let mutationSeq = 0;

function computeTotal(items: Cart['items']): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function commit(seq: number, cart: Cart) {
  if (seq === mutationSeq) {
    setResourceData<Cart>(CART_KEY, cart);
  }
}

async function resyncAfterFailure(seq: number) {
  if (seq === mutationSeq) {
    await fetchResource(CART_KEY, fetchCart).catch(() => undefined);
  }
}

export function useCart() {
  return useResource<Cart>(CART_KEY, fetchCart);
}

export function cartItemCount(cart: Cart | undefined): number {
  return cart?.items.reduce((count, item) => count + item.quantity, 0) ?? 0;
}

/** True when the backend refused the add because the cart holds another restaurant's items. */
export function isCartRestaurantConflict(error: unknown): boolean {
  return error instanceof ApiError && error.statusCode === 409;
}

export async function addToCart(menuItemId: string, quantity = 1): Promise<Cart> {
  const seq = ++mutationSeq;
  const cart = await addCartItem({ menuItemId, quantity });
  commit(seq, cart);
  return cart;
}

/** Starts a fresh cart for a different restaurant (after the user confirms). */
export async function replaceCartWith(menuItemId: string, quantity = 1): Promise<Cart> {
  const seq = ++mutationSeq;
  await clearCart();
  const cart = await addCartItem({ menuItemId, quantity });
  commit(seq, cart);
  return cart;
}

/** Optimistically sets a line quantity (0 removes it) and rolls back if the server rejects it. */
export async function setCartQuantity(menuItemId: string, quantity: number): Promise<void> {
  const seq = ++mutationSeq;
  const previous = getResource<Cart>(CART_KEY).data;

  if (previous) {
    const items = previous.items
      .map((item) => (item.menuItemId === menuItemId ? { ...item, quantity } : item))
      .filter((item) => item.quantity > 0);
    setResourceData<Cart>(CART_KEY, { ...previous, items, total: computeTotal(items) });
  }

  try {
    const cart = quantity <= 0 ? await removeCartItem(menuItemId) : await updateCartItem(menuItemId, quantity);
    commit(seq, cart);
  } catch (error) {
    if (previous && seq === mutationSeq) setResourceData<Cart>(CART_KEY, previous);
    await resyncAfterFailure(seq);
    throw error;
  }
}

export async function emptyCart(): Promise<void> {
  const seq = ++mutationSeq;
  const previous = getResource<Cart>(CART_KEY).data;
  if (previous) {
    setResourceData<Cart>(CART_KEY, { ...previous, items: [], restaurantId: null, total: 0 });
  }

  try {
    await clearCart();
  } catch (error) {
    if (previous && seq === mutationSeq) setResourceData<Cart>(CART_KEY, previous);
    throw error;
  }
}

/** Server state changed outside the cart API (e.g. an order consumed the cart). */
export async function reloadCart(): Promise<void> {
  ++mutationSeq;
  await fetchResource(CART_KEY, fetchCart).catch(() => undefined);
}
