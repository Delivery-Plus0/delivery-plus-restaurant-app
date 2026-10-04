import type { BadgeTone } from '@/components/ui/badge';
import type { KitchenStatus, RestaurantOrder, RestaurantOrderStatus } from '@/services/restaurant-orders';
import type { Restaurant, RestaurantStatus } from '@/services/restaurants';

/** Only RESTAURANT_OWNER accounts may use this app; other roles are refused at sign-in. */
export const OWNER_ROLE = 'RESTAURANT_OWNER';

export const ORDER_STATUS_META: Record<RestaurantOrderStatus, { label: string; tone: BadgeTone }> = {
  CREATED: { label: 'Awaiting payment', tone: 'neutral' },
  PAYMENT_PENDING: { label: 'Payment pending', tone: 'warning' },
  CONFIRMED: { label: 'Confirmed', tone: 'info' },
  PREPARING: { label: 'In kitchen', tone: 'brand' },
  READY_FOR_PICKUP: { label: 'Ready for pickup', tone: 'success' },
  DRIVER_ASSIGNED: { label: 'Driver assigned', tone: 'brand' },
  PICKED_UP: { label: 'Picked up', tone: 'info' },
  DELIVERED: { label: 'Delivered', tone: 'success' },
  FAILED: { label: 'Payment failed', tone: 'danger' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
};

export const RESTAURANT_STATUS_META: Record<RestaurantStatus, { label: string; tone: BadgeTone }> = {
  OPEN: { label: 'Open', tone: 'success' },
  BUSY: { label: 'Busy', tone: 'warning' },
  CLOSED: { label: 'Closed', tone: 'neutral' },
  SUSPENDED: { label: 'Suspended', tone: 'danger' },
};

/** The owner's chosen restaurant if it still exists, else the first one taking orders (OPEN/BUSY), else the first. */
export function selectRestaurant(restaurants: Restaurant[] | undefined, selectedId: string | null): Restaurant | null {
  if (!restaurants?.length) return null;
  return (
    restaurants.find((r) => r.id === selectedId) ??
    restaurants.find((r) => r.status === 'OPEN' || r.status === 'BUSY') ??
    restaurants[0]
  );
}

/** The kitchen's only transitions; payment owns CONFIRMED and dispatch takes over after READY_FOR_PICKUP. */
export const KITCHEN_ACTIONS: Record<KitchenStatus, { label: string; id: string }> = {
  PREPARING: { label: 'Start preparing', id: 'start-preparing' },
  READY_FOR_PICKUP: { label: 'Ready for pickup', id: 'ready-for-pickup' },
};

/** The one step the kitchen can take on this order, or none. */
export function nextKitchenStatus(status: RestaurantOrderStatus): KitchenStatus | null {
  if (status === 'CONFIRMED') return 'PREPARING';
  if (status === 'PREPARING') return 'READY_FOR_PICKUP';
  return null;
}

export type Lane = { status: 'CONFIRMED' | 'PREPARING' | 'READY_FOR_PICKUP'; title: string; note: string };

export const KITCHEN_LANES: Lane[] = [
  { status: 'CONFIRMED', title: 'New orders', note: 'Paid and waiting for the kitchen' },
  { status: 'PREPARING', title: 'In the kitchen', note: 'Being prepared' },
  { status: 'READY_FOR_PICKUP', title: 'Ready for pickup', note: 'A driver is assigned automatically' },
];

const KITCHEN_STATUSES = new Set<RestaurantOrderStatus>(KITCHEN_LANES.map((lane) => lane.status));

/** Orders per kitchen lane (oldest first, so the next order to cook is on top), plus everything else. */
export function groupOrdersByLane(orders: RestaurantOrder[]) {
  const oldestFirst = [...orders].sort((a, b) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')));
  const lanes = Object.fromEntries(KITCHEN_LANES.map((lane) => [lane.status, [] as RestaurantOrder[]])) as Record<
    Lane['status'],
    RestaurantOrder[]
  >;
  const other: RestaurantOrder[] = [];
  for (const order of oldestFirst) {
    if (KITCHEN_STATUSES.has(order.status)) lanes[order.status as Lane['status']].push(order);
    else other.push(order);
  }
  return { lanes, other: other.reverse() };
}
