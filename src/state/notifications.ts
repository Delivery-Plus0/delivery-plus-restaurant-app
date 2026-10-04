import { useResource } from '@/hooks/use-resource';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationListResponse,
} from '@/services/notifications';
import { fetchResource, getResource, setResourceData } from '@/state/resource-cache';

export const NOTIFICATIONS_KEY = 'notifications';
const PAGE_SIZE = 20;

const loadFirstPage = () => fetchNotifications(1, PAGE_SIZE);

export function useNotifications(options: { pollIntervalMs?: number } = {}) {
  return useResource<NotificationListResponse>(NOTIFICATIONS_KEY, loadFirstPage, options);
}

/** Unread count across the loaded pages — the API has no dedicated counter endpoint. */
export function unreadCount(list: NotificationListResponse | undefined): number {
  return list?.items.reduce((count, item) => count + (item.isRead ? 0 : 1), 0) ?? 0;
}

function patchItems(update: (list: NotificationListResponse) => NotificationListResponse) {
  const current = getResource<NotificationListResponse>(NOTIFICATIONS_KEY).data;
  if (current) setResourceData<NotificationListResponse>(NOTIFICATIONS_KEY, update(current));
  return current;
}

export async function markRead(id: string): Promise<void> {
  const previous = patchItems((list) => ({
    ...list,
    items: list.items.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
  }));

  try {
    await markNotificationRead(id);
  } catch (error) {
    if (previous) setResourceData(NOTIFICATIONS_KEY, previous);
    throw error;
  }
}

export async function markAllRead(): Promise<void> {
  const previous = patchItems((list) => ({ ...list, items: list.items.map((item) => ({ ...item, isRead: true })) }));

  try {
    await markAllNotificationsRead();
  } catch (error) {
    if (previous) setResourceData(NOTIFICATIONS_KEY, previous);
    throw error;
  }
}

let loadingMore = false;

/** Appends the next page to the cached list (infinite scroll). */
export async function loadMoreNotifications(): Promise<void> {
  const current = getResource<NotificationListResponse>(NOTIFICATIONS_KEY).data;
  if (!current || loadingMore || current.page >= current.totalPages) return;

  loadingMore = true;
  try {
    const next = await fetchNotifications(current.page + 1, PAGE_SIZE);
    const known = new Set(current.items.map((item) => item.id));
    setResourceData<NotificationListResponse>(NOTIFICATIONS_KEY, {
      ...next,
      items: [...current.items, ...next.items.filter((item) => !known.has(item.id))],
    });
  } finally {
    loadingMore = false;
  }
}

export function reloadNotifications(): Promise<unknown> {
  return fetchResource(NOTIFICATIONS_KEY, loadFirstPage).catch(() => undefined);
}
