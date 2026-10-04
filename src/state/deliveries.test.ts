import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, apiGet } from '@/services/api';
import { fetchDeliveryForOrder } from '@/services/deliveries';

import { canHaveDelivery, isDeliveryActive } from './deliveries';

vi.mock('@/hooks/use-resource', () => ({ useResource: vi.fn() }));
vi.mock('@/services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api')>()),
  apiGet: vi.fn(),
}));

describe('fetchDeliveryForOrder', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves the delivery through the authenticated by-order route', async () => {
    vi.mocked(apiGet).mockResolvedValue({ id: 'd-1', orderId: 'o-1', status: 'IN_TRANSIT' });

    await expect(fetchDeliveryForOrder('o-1')).resolves.toMatchObject({ status: 'IN_TRANSIT' });
    expect(apiGet).toHaveBeenCalledWith('/api/deliveries/by-order/o-1', true);
  });

  it('treats 404 as "no delivery created yet"', async () => {
    vi.mocked(apiGet).mockRejectedValue(new ApiError(404, 'Not Found', 'No delivery has been created for order o-1 yet'));
    await expect(fetchDeliveryForOrder('o-1')).resolves.toBeNull();
  });

  it('surfaces other errors (e.g. 403 on someone else’s order)', async () => {
    vi.mocked(apiGet).mockRejectedValue(new ApiError(403, 'Forbidden', 'You do not have access to this order'));
    await expect(fetchDeliveryForOrder('o-1')).rejects.toThrow('You do not have access to this order');
  });
});

describe('delivery polling rules', () => {
  it('only looks for a delivery once the order is ready for pickup', () => {
    expect(canHaveDelivery({ status: 'PREPARING' })).toBe(false);
    expect(canHaveDelivery({ status: 'FAILED' })).toBe(false);
    expect(canHaveDelivery({ status: 'READY_FOR_PICKUP' })).toBe(true);
    expect(canHaveDelivery({ status: 'PICKED_UP' })).toBe(true);
    expect(canHaveDelivery(undefined)).toBe(false);
  });

  it('keeps polling until the delivery is delivered or cancelled', () => {
    expect(isDeliveryActive(null)).toBe(true);
    expect(isDeliveryActive({ id: 'd', orderId: 'o', status: 'IN_TRANSIT' })).toBe(true);
    expect(isDeliveryActive({ id: 'd', orderId: 'o', status: 'DELIVERED' })).toBe(false);
    expect(isDeliveryActive({ id: 'd', orderId: 'o', status: 'CANCELLED' })).toBe(false);
  });
});
