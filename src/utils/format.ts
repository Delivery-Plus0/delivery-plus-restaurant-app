const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** Backend decimals arrive as strings (TypeORM `decimal`) or numbers (cart); both render the same. */
export function formatMoney(value: string | number | null | undefined): string {
  const amount = typeof value === 'number' ? value : Number.parseFloat(value ?? '');
  return currency.format(Number.isFinite(amount) ? amount : 0);
}

export function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const dateTimeFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export function formatRelativeTime(iso: string | undefined, now: number = Date.now()): string {
  if (!iso) return '';
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return '';

  const diff = Math.max(0, now - time);
  if (diff < MINUTE) return 'Just now';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d ago`;
  return dateFormat.format(time);
}

export function formatDateTime(iso: string | undefined): string {
  if (!iso) return '';
  const time = new Date(iso).getTime();
  return Number.isNaN(time) ? '' : dateTimeFormat.format(time);
}

export function greetingFor(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function firstName(fullName: string | undefined | null): string | null {
  const first = fullName?.trim().split(/\s+/)[0];
  return first ? first : null;
}
