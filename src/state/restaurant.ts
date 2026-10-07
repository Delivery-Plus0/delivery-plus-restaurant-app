import { useSyncExternalStore } from 'react';

import { useResource } from '@/hooks/use-resource';
import { fetchMenu, setMenuItemAvailability, type MenuResponse } from '@/services/menus';
import { fetchRestaurantOrders, updateRestaurantOrderStatus, type KitchenStatus, type RestaurantOrderPage } from '@/services/restaurant-orders';
import { fetchMyRestaurants, updateRestaurantStatus, type OwnerRestaurantStatus, type Restaurant } from '@/services/restaurants';
import { fetchResource, getResource, setResourceData } from '@/state/resource-cache';
import { selectRestaurant } from '@/utils/order-status';

const RESTAURANTS_KEY = 'restaurants:me';
const ordersKey = (restaurantId: string) => `restaurant-orders:${restaurantId}`;
const menuKey = (restaurantId: string) => `menu:${restaurantId}`;

/** New paid orders show up within this time; there is no push channel yet. */
export const ORDERS_POLL_MS = 10_000;

/** The restaurants the signed-in owner owns (scoped by the backend to the token's user). */
export function useMyRestaurants() {
  return useResource<Restaurant[]>(RESTAURANTS_KEY, fetchMyRestaurants, { staleTimeMs: 60_000 });
}

// The owner's chosen restaurant, shared by the Orders and Menu tabs. A stale id (e.g. after signing in
// as another owner) is harmless: selectRestaurant falls back to the first restaurant taking orders.
let selectedId: string | null = null;
const selectionListeners = new Set<() => void>();

export function selectRestaurantId(id: string) {
  selectedId = id;
  selectionListeners.forEach((listener) => listener());
}

function subscribeSelection(listener: () => void) {
  selectionListeners.add(listener);
  return () => selectionListeners.delete(listener);
}

/** The owner's restaurants plus the one both tabs work on. */
export function useSelectedRestaurant() {
  const restaurants = useMyRestaurants();
  const id = useSyncExternalStore(subscribeSelection, () => selectedId, () => selectedId);
  return { restaurants, restaurant: selectRestaurant(restaurants.data, id) };
}

/** The selected restaurant's orders (newest page), polled while the screen is open. */
export function useRestaurantOrders(restaurantId: string | null) {
  return useResource<RestaurantOrderPage>(
    restaurantId ? ordersKey(restaurantId) : null,
    () => fetchRestaurantOrders(restaurantId as string),
    { staleTimeMs: 2_000, pollIntervalMs: ORDERS_POLL_MS, keepPreviousData: false },
  );
}

/** Moves the order one kitchen step, then refreshes the board so it reflects the server's state. */
export async function advanceOrder(restaurantId: string, orderId: string, status: KitchenStatus): Promise<void> {
  await updateRestaurantOrderStatus(orderId, status);
  await fetchResource(ordersKey(restaurantId), () => fetchRestaurantOrders(restaurantId));
}

/** The restaurant's menu, including sold-out items. */
export function useRestaurantMenu(restaurantId: string | null) {
  return useResource<MenuResponse>(restaurantId ? menuKey(restaurantId) : null, () => fetchMenu(restaurantId as string), {
    staleTimeMs: 5_000,
    keepPreviousData: false,
  });
}

/**
 * Marks an item available or sold out and shows the server's answer right away. The menu read is cached
 * by the menu service, but an availability change invalidates that cache, so a refetch agrees.
 */
export async function setItemAvailability(restaurantId: string, itemId: string, available: boolean): Promise<void> {
  const updated = await setMenuItemAvailability(itemId, available);
  const menu = getResource<MenuResponse>(menuKey(restaurantId)).data;
  if (menu) {
    setResourceData<MenuResponse>(menuKey(restaurantId), {
      ...menu,
      items: menu.items.map((item) => (item.id === itemId ? { ...item, available: updated.available } : item)),
    });
  }
}

/** Refetches the menu after an editor write (#148); menu-service drops its cache on every write. */
export async function reloadMenu(restaurantId: string): Promise<void> {
  await fetchResource(menuKey(restaurantId), () => fetchMenu(restaurantId));
}

/** Opens, pauses or closes the restaurant and updates the owner's restaurant list with the result. */
export async function setRestaurantStatus(restaurantId: string, status: OwnerRestaurantStatus): Promise<void> {
  const updated = await updateRestaurantStatus(restaurantId, status);
  setResourceData<Restaurant[]>(RESTAURANTS_KEY, (list) => (list ?? []).map((r) => (r.id === restaurantId ? { ...r, status: updated.status } : r)));
}
