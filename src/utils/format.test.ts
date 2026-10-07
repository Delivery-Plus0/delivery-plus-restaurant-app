import { describe, expect, it, vi } from 'vitest';

import { firstName, formatMoney, formatRelativeTime } from './format';

vi.mock('@/hooks/use-resource', () => ({ useResource: vi.fn() }));

describe('formatMoney', () => {
  it('formats decimal strings from TypeORM and plain numbers the same way', () => {
    expect(formatMoney('12.5')).toBe('EGP\u00a012.50');
    expect(formatMoney(12.5)).toBe('EGP\u00a012.50');
    expect(formatMoney(undefined)).toBe('EGP\u00a00.00');
    expect(formatMoney('1234.5')).toBe('EGP\u00a01,234.50');
    expect(formatMoney('19.98', 'ar')).toBe('١٩٫٩٨\u00a0ج.م.');
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
