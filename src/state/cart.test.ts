import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/services/api';
import { fetchCart, removeCartItem, updateCartItem, type Cart } from '@/services/cart';

import { CART_KEY, isCartRestaurantConflict, setCartQuantity } from './cart';
import { getResource, resetResourceCache, setResourceData } from './resource-cache';

vi.mock('@/hooks/use-resource', () => ({ useResource: vi.fn() }));
vi.mock('@/services/cart', () => ({
  addCartItem: vi.fn(),
  clearCart: vi.fn(),
  fetchCart: vi.fn(),
  removeCartItem: vi.fn(),
  updateCartItem: vi.fn(),
}));

const baseCart: Cart = {
  userId: 'u-1',
  restaurantId: 'r-1',
  updatedAt: '2026-01-01T00:00:00.000Z',
  total: 25,
  items: [
    { menuItemId: 'burger', name: 'Burger', price: 10, quantity: 2 },
    { menuItemId: 'fries', name: 'Fries', price: 5, quantity: 1 },
  ],
};

describe('cart state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setResourceData(CART_KEY, baseCart);
  });

  afterEach(() => resetResourceCache());

  it('applies quantity changes optimistically before the server answers', async () => {
    let resolve: (cart: Cart) => void = () => {};
    vi.mocked(updateCartItem).mockReturnValue(new Promise((r) => (resolve = r)));

    const pending = setCartQuantity('burger', 3);

    expect(getResource<Cart>(CART_KEY).data?.items[0].quantity).toBe(3);
    expect(getResource<Cart>(CART_KEY).data?.total).toBe(35);

    resolve({ ...baseCart, total: 35, items: [{ ...baseCart.items[0], quantity: 3 }, baseCart.items[1]] });
    await pending;
    expect(updateCartItem).toHaveBeenCalledWith('burger', 3);
  });

  it('removes the line when the quantity reaches zero', async () => {
    vi.mocked(removeCartItem).mockResolvedValue({ ...baseCart, total: 20, items: [baseCart.items[0]] });

    await setCartQuantity('fries', 0);

    expect(removeCartItem).toHaveBeenCalledWith('fries');
    expect(getResource<Cart>(CART_KEY).data?.items.map((item) => item.menuItemId)).toEqual(['burger']);
  });

  it('rolls back and resyncs when the server rejects the change', async () => {
    vi.mocked(updateCartItem).mockRejectedValue(new ApiError(400, 'Bad Request', 'Item is not in the cart'));
    vi.mocked(fetchCart).mockResolvedValue(baseCart);

    await expect(setCartQuantity('burger', 5)).rejects.toThrow('Item is not in the cart');

    expect(getResource<Cart>(CART_KEY).data?.items[0].quantity).toBe(2);
    expect(fetchCart).toHaveBeenCalled();
  });

  it('recognizes the cross-restaurant conflict from cart-service', () => {
    expect(isCartRestaurantConflict(new ApiError(409, 'Conflict', 'x'))).toBe(true);
    expect(isCartRestaurantConflict(new ApiError(400, 'Bad Request', 'x'))).toBe(false);
  });
});
