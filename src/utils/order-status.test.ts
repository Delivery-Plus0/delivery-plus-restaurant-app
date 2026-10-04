import { describe, expect, it } from 'vitest';

import type { RestaurantOrder } from '@/services/restaurant-orders';

import type { Restaurant } from '@/services/restaurants';

import { groupOrdersByLane, nextKitchenStatus, selectRestaurant } from './order-status';

const restaurant = (id: string, status: Restaurant['status']): Restaurant => ({ id, name: id, address: 'x', status });

describe('selectRestaurant', () => {
  const closed = restaurant('night-cafe', 'CLOSED');
  const open = restaurant('kitchen', 'OPEN');

  it("keeps the owner's choice while it exists", () => {
    expect(selectRestaurant([closed, open], 'night-cafe')).toBe(closed);
  });

  it('otherwise opens the first restaurant that takes orders, then the first one', () => {
    expect(selectRestaurant([closed, open], null)).toBe(open);
    expect(selectRestaurant([closed, open], 'gone')).toBe(open);
    expect(selectRestaurant([closed], null)).toBe(closed);
    expect(selectRestaurant([], null)).toBeNull();
    expect(selectRestaurant(undefined, null)).toBeNull();
  });
});

const order = (id: string, status: RestaurantOrder['status'], createdAt: string): RestaurantOrder => ({
  id,
  customerId: 'c1',
  restaurantId: 'r1',
  status,
  totalAmount: '10.00',
  items: [],
  createdAt,
});

describe('nextKitchenStatus', () => {
  it('lets the kitchen move CONFIRMED → PREPARING → READY_FOR_PICKUP only', () => {
    expect(nextKitchenStatus('CONFIRMED')).toBe('PREPARING');
    expect(nextKitchenStatus('PREPARING')).toBe('READY_FOR_PICKUP');
    for (const status of ['CREATED', 'PAYMENT_PENDING', 'READY_FOR_PICKUP', 'DRIVER_ASSIGNED', 'PICKED_UP', 'DELIVERED', 'FAILED', 'CANCELLED'] as const) {
      expect(nextKitchenStatus(status)).toBeNull();
    }
  });
});

describe('groupOrdersByLane', () => {
  it('puts kitchen orders in their lane, oldest first, and the rest newest first', () => {
    const { lanes, other } = groupOrdersByLane([
      order('late', 'CONFIRMED', '2026-10-04T10:05:00Z'),
      order('early', 'CONFIRMED', '2026-10-04T10:00:00Z'),
      order('cooking', 'PREPARING', '2026-10-04T09:00:00Z'),
      order('ready', 'READY_FOR_PICKUP', '2026-10-04T08:00:00Z'),
      order('done-old', 'DELIVERED', '2026-10-03T08:00:00Z'),
      order('done-new', 'DELIVERED', '2026-10-04T07:00:00Z'),
      order('unpaid', 'PAYMENT_PENDING', '2026-10-04T06:00:00Z'),
    ]);

    expect(lanes.CONFIRMED.map((o) => o.id)).toEqual(['early', 'late']);
    expect(lanes.PREPARING.map((o) => o.id)).toEqual(['cooking']);
    expect(lanes.READY_FOR_PICKUP.map((o) => o.id)).toEqual(['ready']);
    expect(other.map((o) => o.id)).toEqual(['done-new', 'unpaid', 'done-old']);
  });
});
