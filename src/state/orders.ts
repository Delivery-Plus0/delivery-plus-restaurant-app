import { useResource } from '@/hooks/use-resource';
import { cancelOrder, fetchMyOrders, fetchOrderById, isActiveOrder, type Order } from '@/services/orders';
import { invalidateResources, setResourceData } from '@/state/resource-cache';

/** Poll an in-flight order this often while its screen is focused. */
const ACTIVE_ORDER_POLL_MS = 10_000;

export function useOrders() {
  return useResource<Order[]>('orders', fetchMyOrders);
}

export function useOrder(id: string | undefined) {
  return useResource<Order>(id ? `orders:${id}` : null, () => fetchOrderById(id!), {
    // Short enough that reopening an order is always fresh, long enough to not double-fetch when polling starts.
    staleTimeMs: 3_000,
    pollIntervalMs: (order) => (order && isActiveOrder(order) ? ACTIVE_ORDER_POLL_MS : 0),
  });
}

export async function cancelMyOrder(id: string): Promise<Order> {
  const order = await cancelOrder(id);
  setResourceData<Order>(`orders:${id}`, order);
  invalidateResources('orders');
  return order;
}
