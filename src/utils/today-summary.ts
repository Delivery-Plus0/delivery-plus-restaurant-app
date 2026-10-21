import { tn } from '@/i18n/core';

/**
 * "3 orders" on the board's today summary (#27). Through tn() so Arabic gets its six forms, including the
 * dual ("طلبان"), instead of an English word glued to the number.
 */
export function todayOrdersLabel(orders: number): string {
  return tn(orders, '{count} order', '{count} orders');
}
