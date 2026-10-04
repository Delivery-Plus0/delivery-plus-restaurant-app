import { describe, expect, it, vi } from 'vitest';

import { groupMenu } from '@/state/catalog';

import { firstName, formatMoney, formatRelativeTime } from './format';

vi.mock('@/hooks/use-resource', () => ({ useResource: vi.fn() }));

describe('formatMoney', () => {
  it('formats decimal strings from TypeORM and plain numbers the same way', () => {
    expect(formatMoney('12.5')).toBe('$12.50');
    expect(formatMoney(12.5)).toBe('$12.50');
    expect(formatMoney(undefined)).toBe('$0.00');
  });
});

describe('formatRelativeTime', () => {
  const now = Date.parse('2026-09-30T12:00:00.000Z');

  it('uses short relative labels for recent times', () => {
    expect(formatRelativeTime('2026-09-30T11:59:30.000Z', now)).toBe('Just now');
    expect(formatRelativeTime('2026-09-30T11:15:00.000Z', now)).toBe('45m ago');
    expect(formatRelativeTime('2026-09-30T07:00:00.000Z', now)).toBe('5h ago');
    expect(formatRelativeTime('2026-09-28T12:00:00.000Z', now)).toBe('2d ago');
  });
});

describe('firstName', () => {
  it('returns the first word of a full name', () => {
    expect(firstName('  Ahmed  Maher ')).toBe('Ahmed');
    expect(firstName('')).toBeNull();
  });
});

describe('groupMenu', () => {
  it('groups items by category order and puts uncategorized items last', () => {
    const sections = groupMenu({
      restaurantId: 'r-1',
      categories: [
        { id: 'drinks', restaurantId: 'r-1', name: 'Drinks', displayOrder: 2 },
        { id: 'mains', restaurantId: 'r-1', name: 'Mains', displayOrder: 1 },
        { id: 'empty', restaurantId: 'r-1', name: 'Empty', displayOrder: 0 },
      ],
      items: [
        { id: 'cola', restaurantId: 'r-1', categoryId: 'drinks', name: 'Cola', price: '2.00', available: true },
        { id: 'burger', restaurantId: 'r-1', categoryId: 'mains', name: 'Burger', price: '9.00', available: true },
        { id: 'special', restaurantId: 'r-1', name: 'Special', price: '12.00', available: true },
      ],
    });

    expect(sections.map((section) => [section.title, section.data.map((item) => item.id)])).toEqual([
      ['Mains', ['burger']],
      ['Drinks', ['cola']],
      ['More', ['special']],
    ]);
  });
});
