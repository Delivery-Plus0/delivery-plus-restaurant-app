import type { MenuCategory, MenuItem } from '@/services/menus';
import { t } from '@/i18n/core';

/** Same limits as menu-service (#148); the backend enforces them, these only give early feedback. */
export const NAME_MAX = 100;
export const DESCRIPTION_MAX = 500;
export const PRICE_MAX = 100_000;

export type ItemDraftInput = { name: string; description: string; price: string; categoryId: string | null };
export type ItemDraftErrors = Partial<Record<'name' | 'description' | 'price', string>>;

/** "45", "45.5", "45.50" or "45,50" → 45.5; null for anything that isn't a price with ≤ 2 decimals. */
export function parsePrice(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Number(normalized);
}

export function validateItemDraft(draft: ItemDraftInput): ItemDraftErrors {
  const errors: ItemDraftErrors = {};
  const name = draft.name.trim();
  if (!name) errors.name = t('Enter a name');
  else if (name.length > NAME_MAX) errors.name = t('Keep the name under {max} characters', { max: NAME_MAX });
  if (draft.description.trim().length > DESCRIPTION_MAX) errors.description = t('Keep the description under {max} characters', { max: DESCRIPTION_MAX });
  const price = parsePrice(draft.price);
  if (price === null) errors.price = t('Enter a price in EGP, e.g. 45 or 45.50');
  else if (price <= 0) errors.price = t('The price must be more than 0');
  else if (price > PRICE_MAX) errors.price = t('The price can be at most EGP {max}', { max: PRICE_MAX.toLocaleString('en-US') });
  return errors;
}

export function draftFromItem(item: MenuItem | null, categoryId: string | null): ItemDraftInput {
  return item
    ? { name: item.name, description: item.description ?? '', price: Number(item.price).toFixed(2), categoryId: item.categoryId ?? null }
    : { name: '', description: '', price: '', categoryId };
}

export type EditorSection = { id: string; category: MenuCategory | null; title: string; items: MenuItem[] };

/** Categories in display order with their items, empty ones included (the editor manages them). */
export function editorSections(categories: MenuCategory[], items: MenuItem[]): EditorSection[] {
  const ordered = sortCategories(categories);
  const known = new Set(ordered.map((category) => category.id));
  const sections: EditorSection[] = ordered.map((category) => ({
    id: category.id,
    category,
    title: category.name,
    items: items.filter((item) => item.categoryId === category.id),
  }));
  const other = items.filter((item) => !item.categoryId || !known.has(item.categoryId));
  if (other.length) sections.push({ id: 'other', category: null, title: t('No category'), items: other });
  return sections;
}

export function sortCategories(categories: MenuCategory[]): MenuCategory[] {
  return [...categories].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.name.localeCompare(b.name));
}

/** The full category order after moving one up or down; null when it can't move that way. */
export function moveCategory(categories: MenuCategory[], id: string, direction: -1 | 1): string[] | null {
  const ids = sortCategories(categories).map((category) => category.id);
  const from = ids.indexOf(id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= ids.length) return null;
  [ids[from], ids[to]] = [ids[to], ids[from]];
  return ids;
}
