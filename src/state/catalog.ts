import { useResource } from '@/hooks/use-resource';
import { fetchMenuForRestaurant, type MenuCategory, type MenuItem, type MenuResponse } from '@/services/menus';
import { fetchRestaurantById, fetchRestaurants, type RestaurantListQuery } from '@/services/restaurants';

const CATALOG_STALE_MS = 60_000;

export function useRestaurants(query: RestaurantListQuery) {
  const key = `restaurants:${query.status ?? 'ALL'}:${query.search?.trim().toLowerCase() ?? ''}`;
  return useResource(key, () => fetchRestaurants(query), { staleTimeMs: CATALOG_STALE_MS, keepPreviousData: true });
}

export function useRestaurant(id: string | undefined) {
  return useResource(id ? `restaurant:${id}` : null, () => fetchRestaurantById(id!), {
    staleTimeMs: CATALOG_STALE_MS,
  });
}

export function useMenu(restaurantId: string | undefined) {
  return useResource(restaurantId ? `menu:${restaurantId}` : null, () => fetchMenuForRestaurant(restaurantId!), {
    staleTimeMs: CATALOG_STALE_MS,
  });
}

export type MenuSection = { key: string; title: string; data: MenuItem[] };

/** Groups menu items under their categories (by `displayOrder`), with uncategorized items last. */
export function groupMenu(menu: MenuResponse | undefined): MenuSection[] {
  if (!menu) return [];

  const byCategory = new Map<string, MenuItem[]>();
  for (const item of menu.items) {
    const categoryKey = item.categoryId ?? '';
    const bucket = byCategory.get(categoryKey);
    if (bucket) bucket.push(item);
    else byCategory.set(categoryKey, [item]);
  }

  const categories = [...menu.categories].sort(
    (a: MenuCategory, b: MenuCategory) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
  );

  const sections: MenuSection[] = [];
  for (const category of categories) {
    const data = byCategory.get(category.id);
    if (data?.length) sections.push({ key: category.id, title: category.name, data });
    byCategory.delete(category.id);
  }

  const rest = [...byCategory.values()].flat();
  if (rest.length) sections.push({ key: 'other', title: sections.length ? 'More' : 'Menu', data: rest });

  return sections;
}
