import { apiGet, apiPatch } from '@/services/api';

/** Mirrors notification-service `NotificationType`. */
export type NotificationType =
  | 'ORDER_CONFIRMED'
  | 'PAYMENT_COMPLETED'
  | 'DRIVER_ASSIGNED'
  | 'PICKED_UP'
  | 'DELIVERED';

export type AppNotification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export type NotificationListResponse = {
  items: AppNotification[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export async function fetchNotifications(page = 1, limit = 20): Promise<NotificationListResponse> {
  return apiGet<NotificationListResponse>(`/api/notifications?page=${page}&limit=${limit}`, true);
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiPatch<{ success: boolean }>(`/api/notifications/${id}/read`, {}, true);
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiPatch<{ success: boolean }>('/api/notifications/read-all', {}, true);
}
