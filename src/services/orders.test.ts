import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiGet, apiPost } from './api';
import { createOrder, fetchMyOrders } from './orders';

vi.mock('./api', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

describe('order service gateway mappings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates an order from the authenticated cart using the retry key', async () => {
    vi.mocked(apiPost).mockResolvedValue({ id: 'order-1' });

    await createOrder('order-key-1');

    expect(apiPost).toHaveBeenCalledWith(
      '/api/orders',
      {},
      true,
      { 'Idempotency-Key': 'order-key-1' },
    );
  });

  it('fetches the current customer order list through the authenticated gateway', async () => {
    vi.mocked(apiGet).mockResolvedValue({ items: [] });

    await expect(fetchMyOrders()).resolves.toEqual([]);
    expect(apiGet).toHaveBeenCalledWith('/api/orders', true);
  });
});