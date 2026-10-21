import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-secure-store', () => ({ getItemAsync: vi.fn(), setItemAsync: vi.fn() }));
vi.mock('react-native', () => ({ Platform: { OS: 'web' }, I18nManager: { isRTL: false, allowRTL: vi.fn(), forceRTL: vi.fn() } }));

// '@/i18n' registers this app's Arabic, including its plurals.
const { setCurrentLocale } = await import('@/i18n');
const { todayOrdersLabel } = await import('./today-summary');

describe("today's orders on the board (#27)", () => {
  afterEach(() => setCurrentLocale('en'));

  it('reads correctly in English for 0, 1, 2, 3 and 11', () => {
    setCurrentLocale('en');
    expect([0, 1, 2, 3, 11].map(todayOrdersLabel)).toEqual(['0 orders', '1 order', '2 orders', '3 orders', '11 orders']);
  });

  it('uses the Arabic form for each count: zero, one, dual, 3–10 and 11–99, and 100+', () => {
    setCurrentLocale('ar');
    expect([0, 1, 2, 3, 11, 100].map(todayOrdersLabel)).toEqual(['لا طلبات', 'طلب واحد', 'طلبان', '3 طلبات', '11 طلبًا', '100 طلب']);
  });
});
