import { useResource } from '@/hooks/use-resource';
import { TERMINAL_DELIVERY_STATUSES, fetchDeliveryForOrder, type Delivery } from '@/services/deliveries';
import type { Order, OrderStatus } from '@/services/orders';

/** Poll an in-flight delivery this often while the order screen is focused. */
const ACTIVE_DELIVERY_POLL_MS = 10_000;

/** delivery-service only creates a delivery once the order is READY_FOR_PICKUP. */
const STATUSES_WITH_POSSIBLE_DELIVERY: OrderStatus[] = [
  'READY_FOR_PICKUP',
  'DRIVER_ASSIGNED',
  'PICKED_UP',
  'DELIVERED',
  'CANCELLED',
];

export function canHaveDelivery(order: Pick<Order, 'status'> | undefined): boolean {
  return order ? STATUSES_WITH_POSSIBLE_DELIVERY.includes(order.status) : false;
}

export function isDeliveryActive(delivery: Delivery | null | undefined): boolean {
  return !delivery || !TERMINAL_DELIVERY_STATUSES.includes(delivery.status);
}

/**
 * Delivery state for an order. Polling for now; Phase 2 can back this hook with a WebSocket
 * subscription without changing the screens that use it.
 */
export function useOrderDelivery(order: Order | undefined) {
  const enabled = canHaveDelivery(order);
  const orderActive = order ? !['DELIVERED', 'CANCELLED', 'FAILED'].includes(order.status) : false;
  // Read the id up front: with `order!.id` inside the fetcher, the React Compiler memoizes the
  // closure on `order.id` and evaluates it during render, crashing while the order is still loading.
  const orderId = order?.id;

  return useResource<Delivery | null>(
    enabled && orderId ? `delivery:order:${orderId}` : null,
    () => fetchDeliveryForOrder(orderId as string),
    {
      staleTimeMs: 3_000,
      pollIntervalMs: (delivery) => (orderActive && isDeliveryActive(delivery) ? ACTIVE_DELIVERY_POLL_MS : 0),
    },
  );
}
