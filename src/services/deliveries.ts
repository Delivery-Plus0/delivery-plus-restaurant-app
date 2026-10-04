import { ApiError, apiGet } from '@/services/api';

/** Mirrors the shared `DeliveryStatus` enum used by delivery-service. */
export type DeliveryStatus = 'CREATED' | 'DRIVER_ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';

/** delivery-service `Delivery` as returned by the Gateway. */
export type Delivery = {
  id: string;
  orderId: string;
  driverId?: string | null;
  status: DeliveryStatus;
  createdAt?: string;
  updatedAt?: string;
};

export const TERMINAL_DELIVERY_STATUSES: DeliveryStatus[] = ['DELIVERED', 'CANCELLED'];

/**
 * Resolves the delivery for one of the customer's orders.
 * Returns `null` while no delivery exists yet: the backend answers 404 both for "no delivery yet"
 * and "no such order", and callers only ask about an order they have already loaded.
 */
export async function fetchDeliveryForOrder(orderId: string): Promise<Delivery | null> {
  try {
    return await apiGet<Delivery>(`/api/deliveries/by-order/${orderId}`, true);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) return null;
    throw error;
  }
}
