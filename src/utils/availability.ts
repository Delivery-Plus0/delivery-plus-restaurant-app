import type { MenuCategory, MenuItem } from '@/services/menus';
import type { OwnerRestaurantStatus, RestaurantStatus } from '@/services/restaurants';
import { t } from '@/i18n/core';

/** What the owner can choose, in the order shown. SUSPENDED is set and lifted by an admin only. */
export const OWNER_STATUSES: { status: OwnerRestaurantStatus; label: string; hint: string }[] = [
  { status: 'OPEN', get label() { return t('Open'); }, get hint() { return t('Customers can order'); } },
  { status: 'BUSY', get label() { return t('Busy'); }, get hint() { return t('Shown as busy to customers'); } },
  { status: 'CLOSED', get label() { return t('Closed'); }, get hint() { return t('No new orders'); } },
];

/** The owner can change the status unless an admin suspended the restaurant. */
export function canOwnerChangeStatus(status: RestaurantStatus): boolean {
  return status !== 'SUSPENDED';
}

export type MenuSection = { id: string; title: string; items: MenuItem[] };

/**
 * Menu items grouped under their categories (in display order, then name), with uncategorised items
 * last. Empty categories are left out; items keep the menu service's order (by name).
 */
export function groupMenu(categories: MenuCategory[], items: MenuItem[]): MenuSection[] {
  const ordered = [...categories].sort(
    (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.name.localeCompare(b.name),
  );
  const known = new Set(ordered.map((c) => c.id));
  const sections = ordered.map((c) => ({ id: c.id, title: c.name, items: items.filter((item) => item.categoryId === c.id) }));
  const other = items.filter((item) => !item.categoryId || !known.has(item.categoryId));
  if (other.length) sections.push({ id: 'other', title: sections.length ? t('Other items') : t('Menu'), items: other });
  return sections.filter((section) => section.items.length > 0);
}
