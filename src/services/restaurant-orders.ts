import { apiGet, apiPatch } from '@/services/api';

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
  totalAmount: string | number;
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