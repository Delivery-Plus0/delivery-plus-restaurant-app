import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiGet, apiPatch } from './api';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from './notifications';
import { cancelOrder } from './orders';
import { buildRestaurantQuery, fetchRestaurants } from './restaurants';
import { fetchMyProfile, updateMyProfile } from './users';

vi.mock('./api', () => ({
  apiGet: vi.fn(),
  apiPatch: vi.fn(),
  apiPost: vi.fn(),
}));

describe('gateway route mappings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists notifications with pagination and marks them read', async () => {
    vi.mocked(apiGet).mockResolvedValue({ items: [] });
    vi.mocked(apiPatch).mockResolvedValue({ success: true });

    await fetchNotifications(2, 20);
    await markNotificationRead('n-1');
    await markAllNotificationsRead();

    expect(apiGet).toHaveBeenCalledWith('/api/notifications?page=2&limit=20', true);
    expect(apiPatch).toHaveBeenCalledWith('/api/notifications/n-1/read', {}, true);
    expect(apiPatch).toHaveBeenCalledWith('/api/notifications/read-all', {}, true);
  });

  it('reads and updates the profile through the user service', async () => {
    vi.mocked(apiGet).mockResolvedValue({ id: 'u-1' });
    vi.mocked(apiPatch).mockResolvedValue({ id: 'u-1' });

    await fetchMyProfile();
    await updateMyProfile({ fullName: 'Ahmed', address: '1 Nile St' });

    expect(apiGet).toHaveBeenCalledWith('/api/users/me', true);
    expect(apiPatch).toHaveBeenCalledWith('/api/users/me', { fullName: 'Ahmed', address: '1 Nile St' }, true);
  });

  it('cancels an order through the status transition route', async () => {
    vi.mocked(apiPatch).mockResolvedValue({ id: 'o-1', status: 'CANCELLED' });

    await cancelOrder('o-1');

    expect(apiPatch).toHaveBeenCalledWith('/api/orders/o-1/status', { status: 'CANCELLED' }, true);
  });

  it('builds restaurant queries that match ListRestaurantsQueryDto', async () => {
    vi.mocked(apiGet).mockResolvedValue({ items: [] });

    expect(buildRestaurantQuery({ search: '  pizza ', status: 'OPEN' })).toBe('page=1&limit=20&status=OPEN&search=pizza');
    expect(buildRestaurantQuery({ search: '   ' })).toBe('page=1&limit=20');

    await fetchRestaurants({ limit: 50 });
    expect(apiGet).toHaveBeenCalledWith('/api/restaurants?page=1&limit=50');
  });
});
