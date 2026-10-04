import { describe, expect, it } from 'vitest';

import type { MenuItem } from '@/services/menus';

import { canOwnerChangeStatus, groupMenu, OWNER_STATUSES } from './availability';

const item = (id: string, categoryId?: string): MenuItem => ({ id, restaurantId: 'r1', categoryId, name: id, price: '1.00', available: true });

describe('owner restaurant status', () => {
  it('offers Open, Busy and Closed, never Suspended', () => {
    expect(OWNER_STATUSES.map((s) => s.status)).toEqual(['OPEN', 'BUSY', 'CLOSED']);
  });

  it('locks the control while an admin suspension is in place', () => {
    expect(canOwnerChangeStatus('OPEN')).toBe(true);
    expect(canOwnerChangeStatus('BUSY')).toBe(true);
    expect(canOwnerChangeStatus('CLOSED')).toBe(true);
    expect(canOwnerChangeStatus('SUSPENDED')).toBe(false);
  });
});

describe('groupMenu', () => {
  it('groups by category in display order, drops empty ones and puts uncategorised items last', () => {
    const sections = groupMenu(
      [
        { id: 'drinks', restaurantId: 'r1', name: 'Drinks', displayOrder: 2 },
        { id: 'mains', restaurantId: 'r1', name: 'Mains', displayOrder: 1 },
        { id: 'empty', restaurantId: 'r1', name: 'Desserts', displayOrder: 3 },
      ],
      [item('lemonade', 'drinks'), item('burger', 'mains'), item('pasta', 'mains'), item('bread'), item('lost', 'deleted-category')],
    );

    expect(sections.map((s) => [s.title, s.items.map((i) => i.id)])).toEqual([
      ['Mains', ['burger', 'pasta']],
      ['Drinks', ['lemonade']],
      ['Other items', ['bread', 'lost']],
    ]);
  });

  it('uses a single "Menu" section when there are no categories', () => {
    expect(groupMenu([], [item('a'), item('b')])).toEqual([{ id: 'other', title: 'Menu', items: [item('a'), item('b')] }]);
    expect(groupMenu([], [])).toEqual([]);
  });
});
