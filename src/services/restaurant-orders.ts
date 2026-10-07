import { ApiError, apiGet, apiPatch } from '@/services/api';

export type RestaurantOrderStatus =
  | 'CREATED'
  | 'PAYMENT_PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'DRIVER_ASSIGNED'
  | 'PICKED_UP'
  | 'DELIVERED'
  | 'FAILED'
  | 'CANCELLED';

export type RestaurantOrderItem = {
  menuItemId: string;
  name: string;
  price: string | number;
  quantity: number;
};

export type RestaurantOrder = {
  id: string;
  customerId: string;
  restaurantId: string;
  status: RestaurantOrderStatus;
  /** What the customer pays: items + delivery fee (#145). */
  totalAmount: string | number;
  /** The items as priced at checkout (#145): the restaurant's side of the order. Null on older orders. */
  subtotalAmount?: string | null;
  /** The customer's first name, copied at checkout (#154); never their full name or contact details. */
  customerFirstName?: string | null;
  /** Drop-off address copied at checkout; the kitchen only shows its area (see `dropOffArea`). */
  deliveryAddress?: string | null;
  /** The customer's notes for this order. */
  deliveryNotes?: string | null;
  items: RestaurantOrderItem[];
  createdAt?: string;
};

export type RestaurantOrderPage = {
  items: RestaurantOrder[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type KitchenStatus = 'PREPARING' | 'READY_FOR_PICKUP';

export async function fetchRestaurantOrders(restaurantId: string, page = 1, limit = 50): Promise<RestaurantOrderPage> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  return apiGet<RestaurantOrderPage>(`/api/orders/restaurant/${encodeURIComponent(restaurantId)}?${params}`, true);
}

export async function updateRestaurantOrderStatus(orderId: string, status: KitchenStatus): Promise<RestaurantOrder> {
  return apiPatch<RestaurantOrder>(`/api/orders/${encodeURIComponent(orderId)}/status`, { status }, true);
}
/** Reject a new order (#154): only before preparing; the customer is told the reason. */
export async function rejectRestaurantOrder(orderId: string, reason: string): Promise<RestaurantOrder> {
  const trimmed = reason.trim();
  return apiPatch<RestaurantOrder>(`/api/orders/${encodeURIComponent(orderId)}/status`, trimmed ? { status: 'CANCELLED', reason: trimmed } : { status: 'CANCELLED' }, true);
}

/** GET /api/orders/restaurant/:id/summary (#154): today in Cairo, computed by the backend. */
export type TodaySummary = { orders: number; active: number; delivered: number; cancelled: number; revenue: string; currency: 'EGP' };

export async function fetchTodaySummary(restaurantId: string): Promise<TodaySummary> {
  return apiGet<TodaySummary>(`/api/orders/restaurant/${encodeURIComponent(restaurantId)}/summary`, true);
}

/** The assigned driver as the delivery read shares it (first name, vehicle, plate), or null. */
export type OrderDriver = { displayName: string; vehicleType: string | null; licensePlate: string | null };

export async function fetchOrderDriver(orderId: string): Promise<OrderDriver | null> {
  try {
    const delivery = await apiGet<{ driver?: OrderDriver | null }>(`/api/deliveries/by-order/${encodeURIComponent(orderId)}`, true);
    return delivery.driver ?? null;
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) return null;
    throw error;
  }
}
