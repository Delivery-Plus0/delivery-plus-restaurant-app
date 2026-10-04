import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiGet, apiPatch } from './api';
import { fetchRestaurantOrders, updateRestaurantOrderStatus } from './restaurant-orders';
import { fetchMenu, setMenuItemAvailability } from './menus';
import { fetchMyRestaurants, updateRestaurantStatus } from './restaurants';

vi.mock('./api', () => ({
  apiGet: vi.fn(),
  apiPatch: vi.fn(),
}));

describe('restaurant owner API mappings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads only restaurants owned by the signed-in owner', async () => {
    vi.mocked(apiGet).mockResolvedValue([]);

    await expect(fetchMyRestaurants()).resolves.toEqual([]);
    expect(apiGet).toHaveBeenCalledWith('/api/restaurants/me', true);
  });

  it('requests a page of orders for the selected restaurant', async () => {
    vi.mocked(apiGet).mockResolvedValue({ items: [], page: 2, limit: 10, total: 0, totalPages: 1 });

    await fetchRestaurantOrders('restaurant/1', 2, 10);

    expect(apiGet).toHaveBeenCalledWith('/api/orders/restaurant/restaurant%2F1?page=2&limit=10', true);
  });

  it('sends only an allowed restaurant kitchen status', async () => {
    vi.mocked(apiPatch).mockResolvedValue({ id: 'order-1', status: 'PREPARING' });

    await updateRestaurantOrderStatus('order-1', 'PREPARING');

    expect(apiPatch).toHaveBeenCalledWith('/api/orders/order-1/status', { status: 'PREPARING' }, true);
  });

  it('reads the restaurant menu through the menus prefix (public, no token required)', async () => {
    vi.mocked(apiGet).mockResolvedValue({ restaurantId: 'r1', categories: [], items: [] });

    await fetchMenu('r/1');

    expect(apiGet).toHaveBeenCalledWith('/api/menus/restaurants/r%2F1/menu');
  });

  it('marks a menu item sold out or available as the owner', async () => {
    vi.mocked(apiPatch).mockResolvedValue({ id: 'item-1', available: false });

    await setMenuItemAvailability('item-1', false);

    expect(apiPatch).toHaveBeenCalledWith('/api/menus/menu-items/item-1/availability', { available: false }, true);
  });

  it('changes the restaurant status as the owner', async () => {
    vi.mocked(apiPatch).mockResolvedValue({ id: 'r1', status: 'BUSY' });

    await updateRestaurantStatus('r1', 'BUSY');

    expect(apiPatch).toHaveBeenCalledWith('/api/restaurants/r1/status', { status: 'BUSY' }, true);
  });
});