import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiGet, apiPatch } from './api';
import { fetchRestaurantOrders, updateRestaurantOrderStatus } from './restaurant-orders';
import { fetchMyRestaurants } from './restaurants';

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
});