import { useResource } from '@/hooks/use-resource';
import { fetchRestaurantOrders, updateRestaurantOrderStatus, type KitchenStatus, type RestaurantOrderPage } from '@/services/restaurant-orders';
import { fetchMyRestaurants, type Restaurant } from '@/services/restaurants';
import { fetchResource } from '@/state/resource-cache';

const RESTAURANTS_KEY = 'restaurants:me';
const ordersKey = (restaurantId: string) => `restaurant-orders:${restaurantId}`;

/** New paid orders show up within this time; there is no push channel yet. */
export const ORDERS_POLL_MS = 10_000;

/** The restaurants the signed-in owner owns (scoped by the backend to the token's user). */
export function useMyRestaurants() {
  return useResource<Restaurant[]>(RESTAURANTS_KEY, fetchMyRestaurants, { staleTimeMs: 60_000 });
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
