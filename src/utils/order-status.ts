import type { BadgeTone } from '@/components/ui/badge';
import type { KitchenStatus, RestaurantOrder, RestaurantOrderStatus } from '@/services/restaurant-orders';
import type { Restaurant, RestaurantStatus } from '@/services/restaurants';
import { t } from '@/i18n/core';

/** Only RESTAURANT_OWNER accounts may use this app; other roles are refused at sign-in. */
export const OWNER_ROLE = 'RESTAURANT_OWNER';

export const ORDER_STATUS_META: Record<RestaurantOrderStatus, { label: string; tone: BadgeTone }> = {
  CREATED: { get label() { return t('Awaiting payment'); }, tone: 'neutral' },
  PAYMENT_PENDING: { get label() { return t('Payment pending'); }, tone: 'warning' },
  CONFIRMED: { get label() { return t('Confirmed'); }, tone: 'info' },
  PREPARING: { get label() { return t('In kitchen'); }, tone: 'brand' },
  READY_FOR_PICKUP: { get label() { return t('Ready for pickup'); }, tone: 'success' },
  DRIVER_ASSIGNED: { get label() { return t('Driver assigned'); }, tone: 'brand' },
  PICKED_UP: { get label() { return t('Picked up'); }, tone: 'info' },
  DELIVERED: { get label() { return t('Delivered'); }, tone: 'success' },
  FAILED: { get label() { return t('Payment failed'); }, tone: 'danger' },
  CANCELLED: { get label() { return t('Cancelled'); }, tone: 'neutral' },
};

export const RESTAURANT_STATUS_META: Record<RestaurantStatus, { label: string; tone: BadgeTone }> = {
  OPEN: { get label() { return t('Open'); }, tone: 'success' },
  BUSY: { get label() { return t('Busy'); }, tone: 'warning' },
  CLOSED: { get label() { return t('Closed'); }, tone: 'neutral' },
  SUSPENDED: { get label() { return t('Suspended'); }, tone: 'danger' },
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
  PREPARING: { get label() { return t('Start preparing'); }, id: 'start-preparing' },
  READY_FOR_PICKUP: { get label() { return t('Ready for pickup'); }, id: 'ready-for-pickup' },
};

/** The one step the kitchen can take on this order, or none. */
export function nextKitchenStatus(status: RestaurantOrderStatus): KitchenStatus | null {
  if (status === 'CONFIRMED') return 'PREPARING';
  if (status === 'PREPARING') return 'READY_FOR_PICKUP';
  return null;
}

export type Lane = { status: 'CONFIRMED' | 'PREPARING' | 'READY_FOR_PICKUP'; title: string; note: string };

export const KITCHEN_LANES: Lane[] = [
  { status: 'CONFIRMED', get title() { return t('New orders'); }, get note() { return t('Paid and waiting for the kitchen'); } },
  { status: 'PREPARING', get title() { return t('In the kitchen'); }, get note() { return t('Being prepared'); } },
  { status: 'READY_FOR_PICKUP', get title() { return t('Ready for pickup'); }, get note() { return t('A driver is assigned automatically'); } },
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

/** The owner can reject only a new order, before the kitchen starts on it (#154); the backend enforces the same. */
export function canReject(status: RestaurantOrderStatus): boolean {
  return status === 'CONFIRMED';
}

/** Matches the backend's limit on a cancellation reason. */
export const REJECT_REASON_MAX = 200;

/** Preset reasons in the owner's language (#151); the chosen text is what the customer is told. */
export function rejectReasons(): string[] {
  return [t('An item is out of stock'), t('The kitchen is too busy'), t('We are closing soon')];
}

/**
 * The area part of a drop-off address for the kitchen: the address without its first line (street and
 * building). Null when the address has no separate area, so the kitchen never sees the full address.
 */
export function dropOffArea(address: string | null | undefined): string | null {
  const parts = (address ?? '').split(',').map((part) => part.trim()).filter(Boolean);
  return parts.length > 1 ? parts.slice(1).join(', ') : null;
}
