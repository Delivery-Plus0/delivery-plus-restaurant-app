import { getLocale, intlLocale, t } from '@/i18n/core';

export type MoneyLocale = 'en' | 'ar';

const AMOUNT: Record<MoneyLocale, Intl.NumberFormat> = {
  en: new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  ar: new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
};

/**
 * Egyptian pounds (#152) in the current language unless one is given (#151): "EGP 19.98", or "١٩٫٩٨ ج.م." in Arabic (used once #151 adds the language).
 * Built by hand rather than with Intl's currency style, whose output differs between engines.
 * Backend decimals arrive as strings (TypeORM `decimal`) or numbers (cart); both render the same.
 */
export function formatMoney(value: string | number | null | undefined, locale: MoneyLocale = getLocale()): string {
  const amount = typeof value === 'number' ? value : Number.parseFloat(value ?? '');
  const digits = AMOUNT[locale].format(Number.isFinite(amount) ? amount : 0);
  return locale === 'ar' ? `${digits}\u00a0ج.م.` : `EGP\u00a0${digits}`;
}

export function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Built per call so dates follow the current language (#151); Intl caches the locale data.
const dateFormat = () => new Intl.DateTimeFormat(intlLocale(), { month: 'short', day: 'numeric' });
const dateTimeFormat = () => new Intl.DateTimeFormat(intlLocale(), { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export function formatRelativeTime(iso: string | undefined, now: number = Date.now()): string {
  if (!iso) return '';
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return '';

  const diff = Math.max(0, now - time);
  if (diff < MINUTE) return t('Just now');
  if (diff < HOUR) return t('{n}m ago', { n: Math.floor(diff / MINUTE) });
  if (diff < DAY) return t('{n}h ago', { n: Math.floor(diff / HOUR) });
  if (diff < 7 * DAY) return t('{n}d ago', { n: Math.floor(diff / DAY) });
  return dateFormat().format(time);
}

export function formatDateTime(iso: string | undefined): string {
  if (!iso) return '';
  const time = new Date(iso).getTime();
  return Number.isNaN(time) ? '' : dateTimeFormat().format(time);
}

export function greetingFor(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return t('Good morning');
  if (hour < 18) return t('Good afternoon');
  return t('Good evening');
}

export function firstName(fullName: string | undefined | null): string | null {
  const first = fullName?.trim().split(/\s+/)[0];
  return first ? first : null;
}
