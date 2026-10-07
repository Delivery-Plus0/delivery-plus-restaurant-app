import { describe, expect, it } from 'vitest';

import type { MenuCategory, MenuItem } from '@/services/menus';

import { draftFromItem, editorSections, moveCategory, parsePrice, validateItemDraft } from './menu-editor';

const category = (id: string, displayOrder: number, name = id): MenuCategory => ({ id, restaurantId: 'r', name, displayOrder });
const item = (id: string, categoryId: string | null): MenuItem => ({ id, restaurantId: 'r', categoryId, name: id, price: '45.00', available: true });

describe('parsePrice', () => {
  it('reads prices with up to two decimals, with a comma or a dot', () => {
    expect(parsePrice('45')).toBe(45);
    expect(parsePrice(' 45.5 ')).toBe(45.5);
    expect(parsePrice('45,50')).toBe(45.5);
  });

  it('rejects anything else', () => {
    for (const text of ['', 'abc', '45.555', '-3', '4 5', 'EGP 45']) expect(parsePrice(text)).toBeNull();
  });
});

describe('validateItemDraft', () => {
  const valid = { name: 'Koshary', description: '', price: '45', categoryId: null };

  it('accepts a complete draft', () => {
    expect(validateItemDraft(valid)).toEqual({});
  });

  it('flags a missing or long name, a long description and a bad price', () => {
    expect(validateItemDraft({ ...valid, name: '  ' }).name).toBe('Enter a name');
    expect(validateItemDraft({ ...valid, name: 'x'.repeat(101) }).name).toMatch(/under 100/);
    expect(validateItemDraft({ ...valid, description: 'x'.repeat(501) }).description).toMatch(/under 500/);
    expect(validateItemDraft({ ...valid, price: 'free' }).price).toMatch(/Enter a price/);
    expect(validateItemDraft({ ...valid, price: '0' }).price).toBe('The price must be more than 0');
    expect(validateItemDraft({ ...valid, price: '100000.01' }).price).toMatch(/at most EGP 100,000/);
  });
});

describe('draftFromItem', () => {
  it('starts an edit from the stored item and a new item in the chosen category', () => {
    expect(draftFromItem({ ...item('a', 'c1'), description: 'Hot', price: '45.5' }, null)).toEqual({
      name: 'a',
      description: 'Hot',
      price: '45.50',
      categoryId: 'c1',
    });
    expect(draftFromItem(null, 'c2')).toEqual({ name: '', description: '', price: '', categoryId: 'c2' });
  });
});

describe('editorSections', () => {
  it('keeps empty categories, in display order, and groups items without a category last', () => {
    const sections = editorSections([category('b', 1), category('a', 0)], [item('x', 'b'), item('y', null)]);
    expect(sections.map((section) => [section.title, section.items.map((i) => i.id)])).toEqual([
      ['a', []],
      ['b', ['x']],
      ['No category', ['y']],
    ]);
  });
});

describe('moveCategory', () => {
  const categories = [category('a', 0), category('b', 1), category('c', 2)];

  it('returns the full new order', () => {
    expect(moveCategory(categories, 'b', -1)).toEqual(['b', 'a', 'c']);
    expect(moveCategory(categories, 'b', 1)).toEqual(['a', 'c', 'b']);
  });

  it("is null at either end or for an unknown id", () => {
    expect(moveCategory(categories, 'a', -1)).toBeNull();
    expect(moveCategory(categories, 'c', 1)).toBeNull();
    expect(moveCategory(categories, 'z', 1)).toBeNull();
  });
});
